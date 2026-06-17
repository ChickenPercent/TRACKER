// IGDB API client with server-side Twitch token caching

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
const IGDB_BASE = 'https://api.igdb.com/v4'

interface TwitchToken {
  access_token: string
  expires_at: number
}

let cachedToken: TwitchToken | null = null

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token
  }

  const res = await fetch(
    `${TWITCH_TOKEN_URL}?client_id=${process.env.IGDB_CLIENT_ID}&client_secret=${process.env.IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )

  if (!res.ok) throw new Error(`Twitch token fetch failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.access_token
}

async function igdbPost(endpoint: string, body: string) {
  const token = await getToken()
  const res = await fetch(`${IGDB_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.IGDB_CLIENT_ID!,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  })
  if (!res.ok) throw new Error(`IGDB ${endpoint} failed: ${res.status}`)
  return res.json()
}

export interface IgdbGame {
  id: number
  name: string
  slug: string
  cover?: { image_id: string }
  first_release_date?: number   // unix timestamp
  platforms?: { name: string }[]
  aggregated_rating?: number
  summary?: string
}

export function coverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

export function mapPlatforms(platforms: { name: string }[] | undefined): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of platforms || []) {
    const n = p.name.toLowerCase()
    let mapped: string
    if (n.includes('playstation 5'))              mapped = 'PS5'
    else if (n.includes('playstation 4'))          mapped = 'PS4'
    else if (n.includes('xbox series'))            mapped = 'Xbox'
    else if (n.includes('xbox one'))               mapped = 'Xbox'
    else if (n.includes('pc') || n.includes('windows')) mapped = 'PC'
    else if (n.includes('mac') || n.includes('linux'))  mapped = 'PC'
    else if (n.includes('nintendo switch'))        mapped = 'Switch'
    else                                           mapped = p.name
    if (!seen.has(mapped)) { seen.add(mapped); out.push(mapped) }
  }
  return out
}

export async function searchGames(query: string): Promise<IgdbGame[]> {
  const q = query.replace(/["\\]/g, '').trim()
  if (!q) return []
  const fields = 'fields id,name,slug,cover.image_id,first_release_date,platforms.name,aggregated_rating,summary;'

  // IGDB's fuzzy `search` misses partially-typed words ("reincar" won't find
  // "Reincarnation"), so also run a substring match and merge both result sets.
  const [substring, fuzzy] = await Promise.all([
    igdbPost('games', `${fields} where name ~ *"${q}"*; limit 8;`) as Promise<IgdbGame[]>,
    igdbPost('games', `${fields} search "${q}"; limit 8;`) as Promise<IgdbGame[]>,
  ])

  // Substring hits first (they match what's literally being typed), then fuzzy
  const seen = new Set<number>()
  const merged: IgdbGame[] = []
  for (const g of [...substring, ...fuzzy]) {
    if (!seen.has(g.id)) { seen.add(g.id); merged.push(g) }
  }

  // Titles that start with the query are the most likely target — float them up
  const ql = q.toLowerCase()
  merged.sort((a, b) =>
    Number(b.name.toLowerCase().startsWith(ql)) - Number(a.name.toLowerCase().startsWith(ql))
  )
  return merged.slice(0, 6)
}

// Batch-fetch critic ratings for existing games (used to backfill rows added
// before igdb_rating was tracked). IGDB allows large `where id = (...)` lists,
// but we chunk conservatively to keep request bodies small.
export async function getRatingsByIds(ids: number[]): Promise<Map<number, number | null>> {
  const out = new Map<number, number | null>()
  const positiveIds = ids.filter(id => id > 0)
  const chunkSize = 100

  for (let i = 0; i < positiveIds.length; i += chunkSize) {
    const chunk = positiveIds.slice(i, i + chunkSize)
    const rows = await igdbPost(
      'games',
      `fields id,aggregated_rating; where id = (${chunk.join(',')}); limit ${chunk.length};`
    ) as { id: number; aggregated_rating?: number }[]
    for (const row of rows) {
      const r = row.aggregated_rating
      out.set(row.id, typeof r === 'number' && Number.isFinite(r) ? Math.round(r * 10) / 10 : null)
    }
  }
  return out
}
