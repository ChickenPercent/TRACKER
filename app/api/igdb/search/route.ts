import { NextRequest, NextResponse } from 'next/server'
import { searchGames, coverUrl, mapPlatforms } from '@/lib/igdb'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // Only signed-in users may spend our IGDB/Twitch quota
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })

  try {
    const games = await searchGames(q)
    const results = games.map(g => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      cover: g.cover ? coverUrl(g.cover.image_id) : null,
      release_date: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      platforms: mapPlatforms(g.platforms),
      rating: g.aggregated_rating ? Math.round(g.aggregated_rating * 10) / 10 : null,
      summary: g.summary ?? null,
    }))
    return NextResponse.json({ results })
  } catch (err) {
    console.error('IGDB search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
