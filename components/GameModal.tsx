'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STATUS_COLOR, STATUS_BG, initials, cleanRating } from '@/lib/utils'
import StarRating from './StarRating'
import type { GameEntry } from '@/types'

interface EntryRow {
  id: string
  status: string
  rating: number | null
  review: string | null
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  game: GameEntry | null
  onClose: () => void
}

export default function GameModal({ game, onClose }: Props) {
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch community data each time a different game is opened. Resetting/loading
  // state in response to the game prop changing is the intended use here.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!game) { setEntries([]); return }
    setLoading(true)
    createClient()
      .from('user_games')
      .select('id, status, rating, review, profiles(username, display_name, avatar_url)')
      .eq('game_id', game.game_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data || []) as unknown as EntryRow[])
        setLoading(false)
      })
  }, [game?.game_id])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!game) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [game, onClose])

  if (!game) return null

  const total = entries.length
  const count = (s: string) => entries.filter(e => e.status === s).length
  const rated = entries.filter(e => e.rating !== null)
  const avgRating = rated.length
    ? Math.round(rated.reduce((sum, e) => sum + e.rating!, 0) / rated.length * 10) / 10
    : null
  const reviewed = entries.filter(e => e.rating !== null || e.review)
  const releaseYear = game.date ? new Date(game.date + 'T00:00:00').getFullYear() : null
  const isOnPC = (game.platforms || []).includes('PC')
  const criticRating = cleanRating(game.igdbRating)

  return (
    <div className="modal-bg open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 700, padding: 0, overflow: 'hidden' }}>

        {/* Close */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 28px 28px', maxHeight: '80vh', overflowY: 'auto' }}>

          {/* Hero */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>

            {/* Cover */}
            <div style={{ width: 150, height: 213, flexShrink: 0, borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
              {game.cover ? (
                <>
                  <div style={{ position: 'absolute', inset: -8, backgroundImage: `url('${game.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(8px) brightness(.45)' }} />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${game.cover}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 28, color: '#ffffff33' }}>
                  {game.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2, color: 'var(--text)' }}>
                {game.title}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {releaseYear && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{releaseYear}</span>}
                {criticRating !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', background: 'color-mix(in srgb, var(--amber) 14%, transparent)', borderRadius: 4, padding: '2px 7px' }}>
                    {Math.round(criticRating)}% critic
                  </span>
                )}
                {(game.platforms || []).map(p => (
                  <span key={p} className="plat-tag">{p}</span>
                ))}
              </div>
              {game.summary && (
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: '0 0 14px', maxHeight: 110, overflow: 'hidden', position: 'relative' }}>
                  {game.summary}
                </p>
              )}
              {isOnPC && (
                <a
                  href={`https://store.steampowered.com/search/?term=${encodeURIComponent(game.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: '#c7d5e0', background: '#1b2838', border: '1px solid #2a475e', borderRadius: 'var(--radius-sm)', padding: '6px 12px', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#66c0f4' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a475e' }}
                >
                  <svg width="13" height="13" viewBox="0 0 233 233" fill="currentColor">
                    <path d="M116.6 0C52.2 0 0 52.2 0 116.6c0 52.3 34.7 96.6 82.5 111.3l-1.2-14.5c-4.1-2-7.1-6.1-7.1-10.9a12.3 12.3 0 0 1 12.3-12.3c1.4 0 2.8.2 4.1.6l8.8-33.4c-31.1-5.7-54.7-32.9-54.7-65.6 0-36.8 29.9-66.7 66.7-66.7 36.8 0 66.7 29.9 66.7 66.7 0 5.4-.7 10.7-1.9 15.7l28.7 13.5c4.4-2.6 9.5-4.1 15-4.1 16.5 0 29.8 13.3 29.8 29.8 0 16.5-13.3 29.8-29.8 29.8-16.5 0-29.8-13.3-29.8-29.8 0-2.3.3-4.6.8-6.7l-25.9-12.2c-8.3 18.8-27.1 31.9-49.1 31.9-5 0-9.9-.7-14.5-1.9L86 191.8c4.1 1.2 7.1 5.1 7.1 9.7a10.3 10.3 0 0 1-10.3 10.3c-.4 0-.8 0-1.2-.1C122.8 226.7 170.6 233 216 216c10.8-4 21.7-11 17-17zM116.6 58.1c-32.3 0-58.5 26.2-58.5 58.5s26.2 58.5 58.5 58.5 58.5-26.2 58.5-58.5-26.2-58.5-58.5-58.5zm0 19.5c21.5 0 39 17.5 39 39s-17.5 39-39 39-39-17.5-39-39 17.5-39 39-39z"/>
                  </svg>
                  View on Steam
                </a>
              )}
            </div>
          </div>

          {/* Community stats */}
          {(total > 0 || loading) && (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: 14, borderTop: '1px solid var(--border)', marginBottom: 20 }}>
              {loading && total === 0 ? (
                <div style={{ display: 'flex', gap: 24, paddingTop: 12 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skeleton" style={{ width: 40, height: 22, borderRadius: 6 }} />
                      <div className="skeleton" style={{ width: 52, height: 9, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {avgRating !== null && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 12 }}>
                      <StarRating value={avgRating} size={15} />
                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                        {avgRating.toFixed(1)} avg · {rated.length} {rated.length === 1 ? 'rating' : 'ratings'}
                      </span>
                    </div>
                  )}
                  {([
                    { label: 'tracking', value: total,            color: 'var(--accent2)' },
                    { label: 'playing',  value: count('playing'),  color: 'var(--cyan)'   },
                    { label: 'played',   value: count('played'),   color: 'var(--green)'  },
                    { label: 'backlog',  value: count('backlog'),  color: 'var(--blue)'   },
                  ].filter(s => s.value > 0).map(s => (
                    <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 12 }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.label}</span>
                    </div>
                  )))}
                </>
              )}
            </div>
          )}

          {/* Reviews */}
          {reviewed.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)' }}>Reviews</span>
                <span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600 }}>{reviewed.length}</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviewed.map(entry => {
                  const p = entry.profiles
                  if (!p) return null
                  return (
                    <div key={entry.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <a href={`/u/${p.username}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0, width: 130 }}>
                        <div className="sidebar-avatar" style={{ width: 28, height: 28, fontSize: 10, flexShrink: 0 }}>
                          {p.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.avatar_url} alt={p.display_name || p.username} />
                          ) : initials(p.display_name || p.username)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.display_name || p.username}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>@{p.username}</div>
                        </div>
                      </a>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: entry.review ? 6 : 0, flexWrap: 'wrap' }}>
                          {entry.rating !== null && <StarRating value={entry.rating} size={13} />}
                          <span className="pill" style={{ background: STATUS_BG[entry.status], color: STATUS_COLOR[entry.status] }}>{entry.status}</span>
                        </div>
                        {entry.review && <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>{entry.review}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full page link */}
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <a href={`/game/${game.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'none' }}>
              Open full page ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
