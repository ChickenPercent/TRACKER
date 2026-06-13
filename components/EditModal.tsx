'use client'

import { useState, useEffect } from 'react'
import type { GameEntry, GameStatus } from '@/types'
import StarRating from './StarRating'

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

  async function handleSave() {
    if (!game) return
    const ok = await onSave(game.id, {
      title: title.trim() || game.title,
      date: date || null,
      status,
      platforms: platforms.split(',').map(s => s.trim()).filter(Boolean),
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
        <h3>Edit game</h3>
        <div className="form-grid">
          <div className="form-full">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label>Release date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as GameStatus)}>
              <option value="upcoming">Upcoming</option>
              <option value="backlog">Backlog (out now)</option>
              <option value="playing">Now playing</option>
              <option value="played">Played</option>
            </select>
          </div>
          <div className="form-full">
            <label>Platforms</label>
            <input type="text" value={platforms} onChange={e => setPlatforms(e.target.value)} />
          </div>
          <div className="form-full">
            <label>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="form-full">
            <label>Rating</label>
            <div style={{ marginTop: 6 }}>
              <StarRating value={rating} onChange={setRating} size={22} />
              {rating !== null && (
                <button
                  type="button"
                  onClick={() => setRating(null)}
                  style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Clear rating
                </button>
              )}
            </div>
          </div>
          <div className="form-full">
            <label>Review</label>
            <textarea
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="What did you think?"
              style={{ minHeight: 72 }}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
