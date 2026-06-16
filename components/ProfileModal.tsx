'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STATUS_COLOR, initials, cssUrl } from '@/lib/utils'
import FollowButton from './FollowButton'

interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
}

interface GameRow {
  status: string
  games: { cover_url: string | null; title: string; slug: string } | null
}

interface Props {
  profileId: string | null
  onClose: () => void
}

export default function ProfileModal({ profileId, onClose }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames] = useState<GameRow[]>([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!profileId) { setProfile(null); setGames([]); return }
    setLoading(true)
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*').eq('id', profileId).single(),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
      supabase.from('user_games').select('status, games(cover_url, title, slug)').eq('user_id', profileId).limit(18),
    ]).then(([{ data: p }, { count: followers }, { count: following }, { data: g }]) => {
      setProfile(p as Profile)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
      setGames((g || []) as unknown as GameRow[])
      setLoading(false)
    })
  }, [profileId])

  useEffect(() => {
    if (!profileId) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [profileId, onClose])

  const count = (s: string) => games.filter(g => g.status === s).length
  const avatarInitials = profile ? initials(profile.display_name || profile.username) : ''

  const covers = games.filter(g => g.games?.cover_url).slice(0, 12)

  return (
    <div
      className={`modal-bg${profileId ? ' open' : ''}`}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal" style={{ maxWidth: 540, padding: 0 }}>
        {loading || !profile ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            {loading ? 'Loading…' : ''}
          </div>
        ) : (
          <>
            {/* Banner / cover mosaic header + avatar overlap wrapper */}
            <div style={{ position: 'relative', marginBottom: 44 }}>
              {/* Header image */}
              <div style={{ position: 'relative', height: 120, background: 'var(--bg3)', overflow: 'hidden', borderRadius: 'var(--radius) var(--radius) 0 0' }}>
                {cssUrl(profile.banner_url) ? (
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${cssUrl(profile.banner_url)}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                ) : covers.length > 0 ? (
                  <div style={{ display: 'flex', gap: 2, height: '100%' }}>
                    {covers.map((g, i) => (
                      <div key={i} style={{ flex: 1, backgroundImage: `url('${g.games!.cover_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(.5)' }} />
                    ))}
                  </div>
                ) : null}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, var(--bg2) 100%)' }} />
              </div>
              {/* Close button */}
              <button
                onClick={onClose}
                className="icon-btn"
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2 }}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {/* Avatar — anchored to bottom of header, hanging below */}
              <div style={{
                position: 'absolute', bottom: -44, left: 24,
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 26, color: '#fff',
                border: '3px solid var(--bg2)', overflow: 'hidden', flexShrink: 0, zIndex: 3,
              }}>
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.display_name || profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : avatarInitials}
              </div>
            </div>

            {/* Profile info */}
            <div style={{ padding: '0 24px 24px' }}>
              {/* Name + follow button on same row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: profile.bio ? 6 : 14 }}>
                <div>
                  <div style={{ fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 2 }}>
                    {profile.display_name || profile.username}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    @{profile.username}
                  </div>
                </div>
                <FollowButton profileId={profile.id} />
              </div>
              {profile.bio && (
                <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 14, lineHeight: 1.55 }}>
                  {profile.bio}
                </div>
              )}

              {/* Social counts */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                <span style={{ fontSize: 13 }}>
                  <strong style={{ color: 'var(--text)' }}>{followerCount}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 4 }}>Followers</span>
                </span>
                <span style={{ fontSize: 13 }}>
                  <strong style={{ color: 'var(--text)' }}>{followingCount}</strong>
                  <span style={{ color: 'var(--muted)', marginLeft: 4 }}>Following</span>
                </span>
              </div>

              {/* Game stats */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {(['playing', 'upcoming', 'backlog', 'played'] as const).map(s => (
                  <div key={s} style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLOR[s] }}>{count(s)}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Recent covers */}
              {covers.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 18 }}>
                  {covers.map((g, i) => (
                    <div key={i} style={{
                      aspectRatio: '3/4', borderRadius: 4, overflow: 'hidden', position: 'relative',
                      background: 'var(--bg3)', border: '1px solid var(--border)',
                    }}>
                      <div style={{ position: 'absolute', inset: -2, backgroundImage: `url('${g.games!.cover_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px) brightness(.5)' }} />
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${g.games!.cover_url}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Full profile link */}
              <a
                href={`/u/${profile.username}`}
                style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
              >
                View full profile ↗
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
