import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fmtDate, pillClass, pillLabel, STATUS_COLOR, initials, cssUrl } from '@/lib/utils'
import { rowToEntry } from '@/lib/entries'
import type { GameEntry, GameStatus } from '@/types'
import StarRating from '@/components/StarRating'
import FollowButton from '@/components/FollowButton'

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  top_games: number[] | null
}

interface TopGame {
  id: number
  title: string
  cover_url: string | null
  slug: string
}

const SECTIONS: [GameStatus, string][] = [
  ['playing', 'Now Playing'],
  ['upcoming', 'Upcoming Releases'],
  ['backlog', 'Backlog'],
  ['played', 'Played'],
]

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single<Profile>()

  if (!profile) notFound()

  const topGameIds = profile.top_games?.filter(Boolean) ?? []

  const [{ data: rows }, { count: followerCount }, { count: followingCount }, { data: topGamesData }] = await Promise.all([
    supabase.from('user_games').select('*, games(*)').eq('user_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    topGameIds.length > 0
      ? supabase.from('games').select('id, title, cover_url, slug').in('id', topGameIds)
      : Promise.resolve({ data: [] }),
  ])

  const topGamesMap = new Map((topGamesData as TopGame[] | null ?? []).map(g => [g.id, g]))
  const topGames: (TopGame | null)[] = topGameIds.map(id => topGamesMap.get(id) ?? null)

  const games: GameEntry[] = (rows || []).map(rowToEntry)

  const count = (s: GameStatus) => games.filter(g => g.status === s).length
  const played = count('played')
  const owned = count('backlog') + count('playing') + played
  const completion = owned ? Math.round((played / owned) * 100) : 0

  // ── Profile stats ──
  const rated = games.filter(g => g.rating !== null && g.rating !== undefined)
  const ratingDist = Array.from({ length: 10 }, (_, i) => {
    const val = (i + 1) * 0.5  // 0.5 … 5.0
    return { val, count: rated.filter(g => g.rating === val).length }
  })
  const maxRating = Math.max(1, ...ratingDist.map(r => r.count))
  const avgRating = rated.length
    ? Math.round(rated.reduce((sum, g) => sum + (g.rating || 0), 0) / rated.length * 10) / 10
    : null

  const platCount: Record<string, number> = {}
  games.forEach(g => (g.platforms || []).forEach(p => { platCount[p] = (platCount[p] || 0) + 1 }))
  const platSorted = Object.entries(platCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxPlat = platSorted.length ? platSorted[0][1] : 1

  const yearCount: Record<string, number> = {}
  games.filter(g => g.status === 'played' && g.date).forEach(g => {
    const y = g.date!.slice(0, 4)
    yearCount[y] = (yearCount[y] || 0) + 1
  })
  const yearSorted = Object.entries(yearCount).sort((a, b) => a[0].localeCompare(b[0]))
  const maxYear = yearSorted.length ? Math.max(...yearSorted.map(y => y[1])) : 1

  const hasStats = rated.length > 0 || platSorted.length > 0 || yearSorted.length > 0

  const avatarInitials = initials(profile.display_name || profile.username)
  const safeBanner = cssUrl(profile.banner_url)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Banner */}
      <div style={{
        height: 200,
        background: safeBanner
          ? `linear-gradient(180deg, rgba(0,0,0,0.3) 0%, var(--bg) 100%), url('${safeBanner}') center/cover no-repeat`
          : `linear-gradient(180deg, color-mix(in srgb, var(--accent) 14%, var(--bg)), var(--bg) 100%)`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 20, left: 56 }}>
          <Link href="/" className="profile-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to tracker
          </Link>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ padding: '0 56px 80px', display: 'grid', gridTemplateColumns: '300px 1fr', gap: '0 40px', alignItems: 'start' }}>

        {/* LEFT column: profile card + stats */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Profile card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 24px 28px' }}>

          {/* Avatar */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 30, color: '#fff',
            border: '4px solid var(--bg)', overflow: 'hidden', marginBottom: 14, marginTop: 20,
          }}>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name || profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : avatarInitials}
          </div>

          {/* Name + follow */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <div className="profile-name" style={{ fontSize: 18 }}>{profile.display_name || profile.username}</div>
          </div>
          <div className="profile-username" style={{ marginBottom: 10 }}>@{profile.username}</div>

          <FollowButton profileId={profile.id} />

          {profile.bio && (
            <div className="profile-bio" style={{ marginTop: 12, marginBottom: 0 }}>{profile.bio}</div>
          )}

          {/* Followers / Following */}
          <div style={{ display: 'flex', gap: 16, margin: '14px 0', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13 }}>
              <strong style={{ color: 'var(--text)' }}>{followerCount ?? 0}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: 4 }}>Followers</span>
            </span>
            <span style={{ fontSize: 13 }}>
              <strong style={{ color: 'var(--text)' }}>{followingCount ?? 0}</strong>
              <span style={{ color: 'var(--muted)', marginLeft: 4 }}>Following</span>
            </span>
          </div>

          {/* Top 5 Games */}
          {topGames.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--muted)', marginBottom: 10 }}>Top Games</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {topGames.map((g, i) => (
                  <div key={i} style={{ flex: 1, aspectRatio: '2/3', borderRadius: 4, overflow: 'hidden', background: 'var(--bg3)', border: '1px solid var(--border2)', position: 'relative' }}>
                    {g ? (
                      <a href={`/game/${g.slug}`} title={g.title} style={{ display: 'block', width: '100%', height: '100%' }}>
                        {g.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={g.cover_url} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--muted)', padding: 4, textAlign: 'center', lineHeight: 1.3 }}>{g.title}</div>
                        )}
                      </a>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--border2)', fontWeight: 600 }}>{i + 1}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tracked</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{games.length}</span>
            </div>
            {(['playing', 'upcoming', 'backlog', 'played'] as GameStatus[]).map(s => (
              <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: STATUS_COLOR[s] }}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLOR[s] }}>{count(s)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Complete</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{completion}%</span>
            </div>
          </div>
        </div>

        {/* Stats — under profile card */}
        {hasStats && (
          <div className="dash" style={{ marginBottom: 0, gridTemplateColumns: '1fr' }}>

            {/* Rating distribution */}
            {rated.length > 0 && (
              <div className="dash-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <h5 style={{ margin: 0 }}>Ratings</h5>
                  {avgRating !== null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <StarRating value={avgRating} size={12} />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{avgRating.toFixed(1)} avg · {rated.length}</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
                  {ratingDist.map(r => {
                    const h = r.count ? Math.max(6, Math.round(r.count / maxRating * 56)) : 2
                    return (
                      <div key={r.val} title={`${r.val}★ — ${r.count} ${r.count === 1 ? 'game' : 'games'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                        <div style={{ height: h, background: 'linear-gradient(180deg, var(--accent2), var(--accent))', borderRadius: '3px 3px 0 0', opacity: r.count ? 1 : 0.35 }} />
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                  <span>½★</span>
                  <span style={{ color: 'var(--amber)' }}>★★★★★</span>
                </div>
              </div>
            )}

            {/* Top platforms */}
            {platSorted.length > 0 && (
              <div className="dash-card">
                <h5>Top platforms</h5>
                <div className="dash-bars">
                  {platSorted.map(([p, n]) => (
                    <div key={p} className="dash-bar-row">
                      <span className="dash-bar-label">{p}</span>
                      <span className="dash-bar-track">
                        <span className="dash-bar-fill" style={{ width: `${Math.round(n / maxPlat * 100)}%` }} />
                      </span>
                      <span className="dash-bar-val">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Played by release year */}
            {yearSorted.length > 0 && (
              <div className="dash-card">
                <h5>Played by release year</h5>
                <div className="dash-bars">
                  {yearSorted.map(([y, n]) => (
                    <div key={y} className="dash-bar-row">
                      <span className="dash-bar-label">{y}</span>
                      <span className="dash-bar-track">
                        <span className="dash-bar-fill" style={{ width: `${Math.round(n / maxYear * 100)}%` }} />
                      </span>
                      <span className="dash-bar-val">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        </div>

        {/* RIGHT: game list */}
        <div style={{ paddingTop: 24 }}>

          {games.length === 0 ? (
            <div className="empty">No games tracked yet.</div>
          ) : (
            SECTIONS.map(([status, label]) => {
              const section = games
                .filter(g => g.status === status)
                .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
              if (!section.length) return null
              return (
                <div key={status}>
                  <div className="section-head" style={{ cursor: 'default', userSelect: 'none' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLOR[status], flexShrink: 0, display: 'inline-block' }} />
                    <h2>{label}</h2>
                    <span className="count">{section.length}</span>
                    <span className="line" />
                  </div>
                  <div className="card-grid">
                    {section.map(g => (
                      <div key={g.id} className={`card status-${g.status}`}>
                        {g.cover ? (
                          <div className="cover">
                            <div className="cover-blur" style={{ backgroundImage: `url('${g.cover}')` }} />
                            <div className="cover-img" style={{ backgroundImage: `url('${g.cover}')` }} />
                          </div>
                        ) : (
                          <div className="cover" style={{ background: 'var(--bg3)', color: 'var(--muted)', fontSize: 14 }}>
                            {g.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <div className="card-info">
                          <div className="card-top">
                            <span className="card-title">{g.title}</span>
                            <span className={pillClass(g)}>{pillLabel(g)}</span>
                          </div>
                          <div className="card-meta">
                            {g.status !== 'backlog' && g.status !== 'playing' && (
                              <span className="meta-date">{fmtDate(g)}</span>
                            )}
                            {(g.platforms || []).map(p => (
                              <span key={p} className="plat-tag">{p}</span>
                            ))}
                          </div>
                          {g.note && <div className="card-note">{g.note}</div>}
                          {g.rating !== null && g.rating !== undefined && (
                            <div className="card-rating">
                              <StarRating value={g.rating} size={13} />
                            </div>
                          )}
                          {g.review && <div className="card-note" style={{ marginTop: 4, fontStyle: 'normal' }}>{g.review}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  )
}
