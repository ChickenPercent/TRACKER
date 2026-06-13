'use client'

import { useState, useRef, useCallback } from 'react'
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
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<GameStatus>('upcoming')
  const [platforms, setPlatforms] = useState('')
  const [note, setNote] = useState('')

  const [qaSearch, setQaSearch] = useState('')
  const [qaResults, setQaResults] = useState<IgdbResult[]>([])
  const [qaState, setQaState] = useState<'idle' | 'loading' | 'empty' | 'error' | 'results'>('idle')
  const qaTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if the entry came from IGDB
  const igdbRef = useRef<{ id: number; slug: string; cover: string | null; summary: string | null } | null>(null)

  function clear() {
    setTitle(''); setDate(''); setStatus('upcoming'); setPlatforms(''); setNote('')
    setQaSearch(''); setQaResults([]); setQaState('idle')
    if (qaTimer.current) clearTimeout(qaTimer.current)
    igdbRef.current = null
  }

  function handleAdd() {
    if (!title.trim()) return
    onAdd({
      title: title.trim(),
      date: date || null,
      status,
      platforms: platforms.split(',').map(s => s.trim()).filter(Boolean),
      note,
      cover: igdbRef.current?.cover ?? null,
      igdb_id: igdbRef.current?.id ?? null,
      slug: igdbRef.current?.slug ?? null,
      summary: igdbRef.current?.summary ?? null,
    })
    clear()
  }

  const handleQaSearch = useCallback((q: string) => {
    setQaSearch(q)
    igdbRef.current = null
    if (qaTimer.current) clearTimeout(qaTimer.current)
    if (q.length < 2) { setQaState('idle'); return }
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
    igdbRef.current = { id: r.id, slug: r.slug, cover: r.cover, summary: r.summary }
    if (r.release_date) {
      setDate(r.release_date)
      const isOut = new Date(r.release_date + 'T00:00:00') <= new Date()
      setStatus(isOut ? 'backlog' : 'upcoming')
    }
    setPlatforms(r.platforms.join(', '))
    setQaSearch(r.name)
    setQaState('idle')
  }

  return (
    <div className="add-card">
      <div className="quickadd-wrap">
        <label>Quick-add (search IGDB)</label>
        <input
          type="text"
          value={qaSearch}
          onChange={e => handleQaSearch(e.target.value)}
          placeholder="Type a game name to search…"
          autoComplete="off"
        />
        <div className={`quickadd-results${qaState !== 'idle' ? ' show' : ''}`}>
          {qaState === 'loading' && <div className="qa-loading">Searching…</div>}
          {qaState === 'empty'   && <div className="qa-empty">No matches</div>}
          {qaState === 'error'   && <div className="qa-empty">Search failed — check IGDB credentials in .env.local</div>}
          {qaState === 'results' && qaResults.map(r => (
            <div key={r.id} className="qa-item" onClick={() => pickResult(r)}>
              {r.cover
                ? <div className="qa-cover" style={{ backgroundImage: `url('${r.cover}')` }} />
                : <div className="qa-cover" />
              }
              <div className="qa-info">
                <div className="qa-title">{r.name}</div>
                <div className="qa-meta">{r.release_date || 'TBA'}{r.rating ? ` · ${r.rating}%` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-full">
          <label>Title</label>
          {/* Hand-editing the title breaks the link to the picked IGDB game */}
          <input type="text" value={title} onChange={e => { setTitle(e.target.value); igdbRef.current = null }} placeholder="Game name" />
        </div>
        <div>
          <label>Release date (optional)</label>
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
          <label>Platforms (comma-separated)</label>
          <input type="text" value={platforms} onChange={e => setPlatforms(e.target.value)} placeholder="PS5, Xbox, PC" />
        </div>
        <div className="form-full">
          <label>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Day one purchase, wait for sale…" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={clear}>Clear</button>
        <button className="btn btn-primary" onClick={handleAdd}>Add game</button>
      </div>
    </div>
  )
}
