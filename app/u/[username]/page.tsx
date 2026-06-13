import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fmtDate, pillClass, pillLabel } from '@/lib/utils'
import type { GameEntry, GameStatus } from '@/types'
import StarRating from '@/components/StarRating'
import FollowButton from '@/components/FollowButton'

function rowToEntry(row: Record<string, unknown>): GameEntry {
  const g = row.games as Record<string, unknown>
  return {
    id: row.id as string,
    game_id: g.id as number,
    title: g.title as string,
    date: (row.custom_date as string | null) || (g.release_date as string | null),
    platforms: (g.platforms as string[] | null) || [],
    cover: g.cover_url as string | null,
    status: row.status as GameStatus,
    tbd: row.tbd as boolean,
    note: (row.note as string) || '',
    order: (row.backlog_order as number) ?? 9999,
    rating: (row.rating as number | null) ?? null,
    review: (row.review as string | null) ?? null,
    slug: (g.slug as string) || '',
    summary: (g.summary as string | null) ?? null,
  }
}

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

const SECTIONS: [GameStatus, string][] = [
  ['playing', 'Now Playing'],
  ['upcoming', 'Upcoming Releases'],
  ['backlog', 'Backlog'],
  ['played', 'Played'],
]

const STATUS_COLORS: Record<GameStatus, string> = {
  playing: 'var(--cyan)',
  upcoming: 'var(--amber)',
  backlog: 'var(--blue)',
  played: 'var(--green)',
}

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

  const [{ data: rows }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('user_games').select('*, games(*)').eq('user_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  const games: GameEntry[] = (rows || []).map(rowToEntry)

  const count = (s: GameStatus) => games.filter(g => g.status === s).length
  const played = count('played')
  const owned = count('backlog') + count('playing') + played
  const completion = owned ? Math.round((played / owned) * 100) : 0

  const initials = (profile.display_name || profile.username)
    .split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <Link href="/" className="profile-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back to tracker
        </Link>

        <div className="profile-hero">
          <div className="profile-avatar">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name || profile.username} />
            ) : initials}
          </div>
          <div className="profile-info" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div className="profile-name">{profile.display_name || profile.username}</div>
              <FollowButton profileId={profile.id} />
            </div>
            <div className="profile-username">@{profile.username}</div>
            {profile.bio && <div className="profile-bio">{profile.bio}</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-num">{followerCount ?? 0}</div>
            <div className="profile-stat-label">Followers</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-num">{followingCount ?? 0}</div>
            <div className="profile-stat-label">Following</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-num">{games.length}</div>
            <div className="profile-stat-label">Tracked</div>
          </div>
          {(['playing', 'upcoming', 'backlog', 'played'] as GameStatus[]).map(s => (
            <div key={s} className="profile-stat">
              <div className="profile-stat-num" style={{ color: STATUS_COLORS[s] }}>{count(s)}</div>
              <div className="profile-stat-label">{s.charAt(0).toUpperCase() + s.slice(1)}</div>
            </div>
          ))}
          <div className="profile-stat">
            <div className="profile-stat-num">{completion}%</div>
            <div className="profile-stat-label">Complete</div>
          </div>
        </div>
      </div>

      {/* Game list */}
      <div className="profile-games">
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
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[status], flexShrink: 0, display: 'inline-block' }} />
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
                          <div className="cover-img"  style={{ backgroundImage: `url('${g.cover}')` }} />
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
  )
}
