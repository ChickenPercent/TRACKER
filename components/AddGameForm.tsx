'use client'

import { useState, useRef, useCallback } from 'react'
import StarRating from './StarRating'
import StatusPicker from './StatusPicker'
import type { GameStatus } from '@/types'

export interface AddGameData {
  title: string
  date: string | null
  status: GameStatus
  platforms: string[]
  note: string
  cover: string | null
  igdb_id: number | null
  slug: string | null
  summary: string | null
  rating: number | null
  review: string
}

interface IgdbResult {
  id: number
  name: string
  slug: string
  cover: string | null
  release_date: string | null
  platforms: string[]
  rating: number | null
  summary: string | null
}

interface Props {
  onAdd: (data: AddGameData) => void
}

export default function AddGameForm({ onAdd }: Props) {
  const [phase, setPhase] = useState<'search' | 'confirm' | 'manual'>('search')

  // Search
  const [qaSearch, setQaSearch] = useState('')
  const [qaResults, setQaResults] = useState<IgdbResult[]>([])
  const [qaState, setQaState] = useState<'idle' | 'loading' | 'empty' | 'error' | 'results'>('idle')
  const qaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Selected / form fields
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [platforms, setPlatforms] = useState('')
  const [status, setStatus] = useState<GameStatus>('backlog')
  const [note, setNote] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [igdbMeta, setIgdbMeta] = useState<{ id: number; slug: string; cover: string | null; summary: string | null } | null>(null)

  const handleQaSearch = useCallback((q: string) => {
    setQaSearch(q)
    if (qaTimer.current) clearTimeout(qaTimer.current)
    if (q.length < 2) { setQaState('idle'); setQaResults([]); return }
    setQaState('loading')
    qaTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/igdb/search?q=${encodeURIComponent(q)}`)
        const json = await res.json()
        const results: IgdbResult[] = json.results || []
        if (!results.length) { setQaState('empty'); return }
        setQaResults(results)
        setQaState('results')
      } catch {
        setQaState('error')
      }
    }, 350)
  }, [])

  function pickResult(r: IgdbResult) {
    setTitle(r.name)
    setDate(r.release_date || '')
    setPlatforms(r.platforms.join(', '))
    setIgdbMeta({ id: r.id, slug: r.slug, cover: r.cover, summary: r.summary })
    const isOut = r.release_date ? new Date(r.release_date + 'T00:00:00') <= new Date() : false
    setStatus(isOut ? 'backlog' : 'upcoming')
    setRating(null); setReview(''); setNote('')
    setPhase('confirm')
  }

  function startManual() {
    setTitle(qaSearch.trim())
    setDate(''); setPlatforms(''); setStatus('backlog'); setNote(''); setRating(null); setReview('')
    setIgdbMeta(null)
    setPhase('manual')
  }

  function backToSearch() {
    setIgdbMeta(null)
    setPhase('search')
  }

  function handleAdd() {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      date: date || null,
      status,
      platforms: platforms.split(',').map(s => s.trim()).filter(Boolean),
      note,
      cover: igdbMeta?.cover ?? null,
      igdb_id: igdbMeta?.id ?? null,
      slug: igdbMeta?.slug ?? null,
      summary: igdbMeta?.summary ?? null,
      rating: status === 'played' ? rating : null,
      review: status === 'played' ? review : '',
    })
  }

  // ── Shared: status picker + (played) rating/review + note ──
  const detailControls = (
    <>
      <div style={{ marginBottom: 16 }}>
        <label>Status</label>
        <StatusPicker value={status} onChange={setStatus} />
      </div>

      {status === 'played' && (
        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'color-mix(in srgb, var(--green) 7%, var(--bg3))', border: '1px solid color-mix(in srgb, var(--green) 20%, var(--border2))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label style={{ margin: 0 }}>Your rating</label>
            <StarRating value={rating} onChange={setRating} size={22} />
          </div>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Write a review… (optional)"
            style={{ minHeight: 64 }}
          />
        </div>
      )}

      <div style={{ marginBottom: 4 }}>
        <label>Note {status === 'played' ? '' : '(optional)'}</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="e.g. Day one purchase, wait for sale…"
          style={{ minHeight: 56 }}
        />
      </div>
    </>
  )

  // ── SEARCH PHASE ──
  if (phase === 'search') {
    return (
      <div>
        <div className="quickadd-wrap" style={{ marginBottom: 4 }}>
          <label>Search for a game</label>
          <input
            type="text"
            value={qaSearch}
            onChange={e => handleQaSearch(e.target.value)}
            placeholder="Type a game name…"
            autoComplete="off"
            autoFocus
          />
        </div>

        <div style={{ minHeight: 220, maxHeight: 340, overflowY: 'auto', margin: '8px 0 4px' }}>
          {qaState === 'idle' && (
            <div className="empty" style={{ padding: '48px 0', fontSize: 13 }}>
              Search IGDB to find a game to add.
            </div>
          )}
          {qaState === 'loading' && <div className="empty" style={{ padding: '48px 0', fontSize: 13 }}>Searching…</div>}
          {qaState === 'error' && <div className="empty" style={{ padding: '48px 0', fontSize: 13 }}>Search failed — check IGDB credentials in .env.local</div>}
          {qaState === 'empty' && (
            <div className="empty" style={{ padding: '40px 0', fontSize: 13 }}>
              No matches for “{qaSearch}”.
            </div>
          )}
          {qaState === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {qaResults.map(r => (
                <button key={r.id} type="button" onClick={() => pickResult(r)} className="add-result-row">
                  <div style={{ width: 38, height: 52, flexShrink: 0, borderRadius: 4, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {r.cover ? (
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${r.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.release_date ? r.release_date.slice(0, 4) : 'TBA'}
                      {r.platforms.length > 0 ? ` · ${r.platforms.join(', ')}` : ''}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={startManual} className="add-link-btn">
            Can’t find it? Add manually
          </button>
        </div>
      </div>
    )
  }

  // ── CONFIRM PHASE ──
  if (phase === 'confirm') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 18 }}>
          <div style={{ width: 96, height: 132, flexShrink: 0, borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {igdbMeta?.cover ? (
              <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${igdbMeta.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            ) : (
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: '#ffffff33' }}>
                {title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{date ? date.slice(0, 4) : 'Release TBA'}</div>
            {platforms && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {platforms.split(',').map(p => p.trim()).filter(Boolean).map(p => (
                  <span key={p} className="plat-tag">{p}</span>
                ))}
              </div>
            )}
            <button type="button" onClick={backToSearch} className="add-link-btn" style={{ marginTop: 10, padding: 0 }}>
              ← Change game
            </button>
          </div>
        </div>

        {detailControls}

        <div className="form-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={backToSearch}>Back</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add game</button>
        </div>
      </div>
    )
  }

  // ── MANUAL PHASE ──
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <label>Title</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Game name" autoFocus />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label>Release date (optional)</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label>Platforms (comma-separated)</label>
          <input type="text" value={platforms} onChange={e => setPlatforms(e.target.value)} placeholder="PS5, Xbox, PC" />
        </div>
      </div>

      {detailControls}

      <div className="form-actions" style={{ marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={backToSearch}>Back</button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!title.trim()}>Add game</button>
      </div>
    </div>
  )
}
