'use client'

import { useState, useEffect } from 'react'
import type { GameEntry, GameStatus } from '@/types'
import StarRating from './StarRating'
import StatusPicker from './StatusPicker'

interface Props {
  game: GameEntry | null
  onSave: (id: string, updates: Partial<GameEntry>) => Promise<boolean>
  onClose: () => void
}

// NOTE: parent must pass key={game?.id} so the form remounts (and re-initialises) per game
export default function EditModal({ game, onSave, onClose }: Props) {
  const [title, setTitle] = useState(game?.title ?? '')
  const [date, setDate] = useState(game?.date ?? '')
  const [status, setStatus] = useState<GameStatus>(game?.status ?? 'upcoming')
  const [platforms, setPlatforms] = useState((game?.platforms ?? []).join(', '))
  const [note, setNote] = useState(game?.note ?? '')
  const [rating, setRating] = useState<number | null>(game?.rating ?? null)
  const [review, setReview] = useState(game?.review ?? '')

  // IGDB-sourced games (non-negative id) share one row across all users, so their
  // title/platforms can't be edited per-user. Manually-added games use negative ids.
  const isIgdb = (game?.game_id ?? -1) >= 0
  const year = date ? date.slice(0, 4) : null
  const platformList = platforms.split(',').map(s => s.trim()).filter(Boolean)

  async function handleSave() {
    if (!game) return
    const ok = await onSave(game.id, {
      title: title.trim() || game.title,
      date: date || null,
      status,
      platforms: platformList,
      note: note.trim(),
      tbd: !date,
      rating,
      review: review.trim(),
    })
    if (ok) onClose()
  }

  function handleBgClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`modal-bg${game ? ' open' : ''}`} onClick={handleBgClick}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Edit game</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Cover + identity */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 96, height: 132, flexShrink: 0, borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {game?.cover ? (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${game.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
              <span style={{ fontFamily: "var(--font-body)", fontWeight: 800, fontSize: 16, color: 'var(--muted)' }}>
                {(title || game?.title || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {isIgdb ? (
              <>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 17, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{year ? year : 'Release TBA'}</div>
                {platformList.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {platformList.map(p => <span key={p} className="plat-tag">{p}</span>)}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label>Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div>
                  <label>Release date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <label>Platforms</label>
                  <input type="text" value={platforms} onChange={e => setPlatforms(e.target.value)} placeholder="PS5, Xbox, PC" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 16 }}>
          <label>Status</label>
          <StatusPicker value={status} onChange={setStatus} />
        </div>

        {/* Rating + review */}
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label style={{ margin: 0 }}>Rating</label>
            <StarRating value={rating} onChange={setRating} size={22} />
            {rating !== null && (
              <button
                type="button"
                onClick={() => setRating(null)}
                style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="What did you think? (optional)"
            style={{ minHeight: 72 }}
          />
        </div>

        {/* Note */}
        <div style={{ marginBottom: 4 }}>
          <label>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} style={{ minHeight: 56 }} />
        </div>

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
