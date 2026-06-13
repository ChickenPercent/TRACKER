import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StarRating from '@/components/StarRating'

interface Game {
  id: number
  slug: string
  title: string
  cover_url: string | null
  release_date: string | null
  platforms: string[] | null
  summary: string | null
  igdb_rating: number | null
}

interface EntryRow {
  id: string
  user_id: string
  status: string
  rating: number | null
  review: string | null
  created_at: string
  profiles: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

const STATUS_COLOR: Record<string, string> = {
  playing:  'var(--cyan)',
  upcoming: 'var(--amber)',
  backlog:  'var(--blue)',
  played:   'var(--green)',
}

const STATUS_BG: Record<string, string> = {
  playing:  'var(--cyan-bg)',
  upcoming: 'var(--amber-bg)',
  backlog:  'var(--blue-bg)',
  played:   'var(--green-bg)',
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('slug', slug)
    .single<Game>()

  if (!game) notFound()

  const { data: rows } = await supabase
    .from('user_games')
    .select('id, user_id, status, rating, review, created_at, profiles(id, username, display_name, avatar_url)')
    .eq('game_id', game.id)
    .order('created_at', { ascending: false })

  const entries = (rows || []) as unknown as EntryRow[]
  const total = entries.length
  const count = (s: string) => entries.filter(e => e.status === s).length

  const ratedEntries = entries.filter(e => e.rating !== null)
  const avgRating = ratedEntries.length
    ? Math.round(ratedEntries.reduce((sum, e) => sum + e.rating!, 0) / ratedEntries.length * 10) / 10
    : null

  const reviewedEntries = entries.filter(e => e.rating !== null || e.review)
  const releaseYear = game.release_date ? new Date(game.release_date + 'T00:00:00').getFullYear() : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', maxWidth: 960, margin: '0 auto', padding: '40px 40px 80px' }}>

      {/* Back */}
      <Link href="/" className="profile-back" style={{ marginBottom: 32, display: 'inline-flex' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to tracker
      </Link>

      {/* Hero */}
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', marginBottom: 48 }}>

        {/* Cover */}
        <div style={{ width: 200, height: 283, flexShrink: 0, borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
          {game.cover_url ? (
            <>
              <div style={{
                position: 'absolute', inset: -10,
                backgroundImage: `url('${game.cover_url}')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'blur(8px) brightness(.5)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url('${game.cover_url}')`,
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
              }} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 32, color: '#ffffff33' }}>
              {game.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 8 }}>
          <h1 className="game-title-large">{game.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {releaseYear && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{releaseYear}</span>}
            {(game.platforms || []).map(p => (
              <span key={p} className="plat-tag">{p}</span>
            ))}
          </div>
          {game.summary && (
            <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 24, maxHeight: 160, overflow: 'hidden' }}>
              {game.summary}
            </p>
          )}

          {/* Stats */}
          {total > 0 && (
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {avgRating !== null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <StarRating value={avgRating} size={17} />
                  <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {avgRating.toFixed(1)} avg · {ratedEntries.length} {ratedEntries.length === 1 ? 'rating' : 'ratings'}
                  </span>
                </div>
              )}
              {([
                { label: 'tracking', value: total, color: 'var(--accent2)' },
                { label: 'playing',  value: count('playing'),  color: 'var(--cyan)'  },
                { label: 'played',   value: count('played'),   color: 'var(--green)' },
                { label: 'backlog',  value: count('backlog'),  color: 'var(--blue)'  },
                { label: 'upcoming', value: count('upcoming'), color: 'var(--amber)' },
              ].filter(s => s.value > 0).map(s => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.label}</span>
                </div>
              )))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {reviewedEntries.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)' }}>Reviews</span>
            <span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600 }}>{reviewedEntries.length}</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviewedEntries.map(entry => {
              const p = entry.profiles
              if (!p) return null
              const initials = (p.display_name || p.username)
                .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
              return (
                <div key={entry.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                  <Link href={`/u/${p.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0, width: 160 }}>
                    <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt={p.display_name || p.username} />
                      ) : initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.display_name || p.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{p.username}</div>
                    </div>
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: entry.review ? 8 : 0, flexWrap: 'wrap' }}>
                      {entry.rating !== null && <StarRating value={entry.rating} size={14} />}
                      <span className="pill" style={{ background: STATUS_BG[entry.status], color: STATUS_COLOR[entry.status] }}>
                        {entry.status}
                      </span>
                    </div>
                    {entry.review && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{entry.review}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {total === 0 && (
        <div className="empty" style={{ padding: '60px 0' }}>No one is tracking this game yet.</div>
      )}
    </div>
  )
}
