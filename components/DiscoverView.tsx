'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { GameGridSkeleton } from './Skeletons'
import EmptyState from './EmptyState'

interface UserResult {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface GameResult {
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
  currentUserId: string
  onViewProfile?: (profileId: string) => void
}

export default function DiscoverView({ currentUserId, onViewProfile }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<UserResult[]>([])
  const [games, setGames] = useState<GameResult[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [navigating, setNavigating] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setState('idle'); setUsers([]); setGames([]); return }
    setState('loading')
    timer.current = setTimeout(async () => {
      const term = q.trim()
      // PostgREST .or() treats commas/parens as filter syntax, so strip any chars
      // that could break (or inject into) the filter string before interpolating.
      const safeTerm = term.replace(/[,()*\\%]/g, '').trim()

      const [userRes, gameRes] = await Promise.all([
        safeTerm
          ? supabase
              .from('profiles')
              .select('id, username, display_name, avatar_url')
              .or(`username.ilike.%${safeTerm}%,display_name.ilike.%${safeTerm}%`)
              .neq('id', currentUserId)
              .limit(8)
          : Promise.resolve({ data: [] as UserResult[] }),
        fetch(`/api/igdb/search?q=${encodeURIComponent(term)}`)
          .then(r => r.json())
          .catch(() => ({ results: [] })),
      ])
      setUsers((userRes.data as UserResult[]) || [])
      setGames((gameRes.results as GameResult[]) || [])
      setState('done')
    }, 350)
  }, [supabase, currentUserId])

  async function openGame(g: GameResult) {
    setNavigating(g.id)
    // The game page reads from our DB, so make sure the catalog entry exists first.
    await supabase.from('games').upsert({
      id: g.id,
      slug: g.slug,
      title: g.name,
      cover_url: g.cover,
      release_date: g.release_date || null,
      platforms: g.platforms,
      igdb_rating: g.rating,
      summary: g.summary,
    })
    router.push(`/game/${g.slug}`)
  }

  function openUser(u: UserResult) {
    if (onViewProfile) onViewProfile(u.id)
    else router.push(`/u/${u.username}`)
  }

  return (
    <div style={{ paddingTop: 8, maxWidth: 720 }}>
      <div className="search-wrap" style={{ width: '100%', marginBottom: 24 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          className="search-input"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Search players and games…"
          autoComplete="off"
          autoFocus
          style={{ width: '100%' }}
        />
      </div>

      {state === 'idle' && (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          }
          title="Discover players and games"
          description="Search by username to find other players, or by title to look up any game in the catalogue."
        />
      )}

      {state === 'loading' && (
        <div>
          <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 6, marginBottom: 14 }} />
          <GameGridSkeleton count={8} />
        </div>
      )}

      {state === 'done' && users.length === 0 && games.length === 0 && (
        <EmptyState
          icon={
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          }
          title="No matches"
          description={`Nothing found for “${query}”. Try a different spelling or a shorter term.`}
        />
      )}

      {state === 'done' && users.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <SectionHead label="Players" count={users.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => openUser(u)} className="discover-row">
                <div className="sidebar-avatar" style={{ width: 38, height: 38, fontSize: 13, flexShrink: 0 }}>
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.display_name || u.username} />
                  ) : initials(u.display_name || u.username)}
                </div>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.display_name || u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {state === 'done' && games.length > 0 && (
        <div>
          <SectionHead label="Games" count={games.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 14 }}>
            {games.map(g => (
              <button
                key={g.id}
                onClick={() => openGame(g)}
                disabled={navigating !== null}
                className="discover-game"
                style={{ opacity: navigating !== null && navigating !== g.id ? 0.4 : 1 }}
              >
                <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border2)', marginBottom: 8 }}>
                  {g.cover ? (
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${g.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: '#ffffff33' }}>
                      {g.name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                    </div>
                  )}
                  {navigating === g.id && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>Opening…</div>
                  )}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, textAlign: 'left' }}>{g.name}</div>
                {g.release_date && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'left', marginTop: 2 }}>{g.release_date.slice(0, 4)}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHead({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600 }}>{count}</span>
      <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}
