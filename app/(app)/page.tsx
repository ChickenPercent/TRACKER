'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, shade, slugify } from '@/lib/utils'
import { THEMES, type GameEntry, type GameStatus } from '@/types'
import Sidebar from '@/components/Sidebar'
import GameCard from '@/components/GameCard'
import CalendarView from '@/components/CalendarView'
import StatsView from '@/components/StatsView'
import AddGameForm, { type AddGameData } from '@/components/AddGameForm'
import EditModal from '@/components/EditModal'
import SettingsModal, { type UserProfile } from '@/components/SettingsModal'
import ProfileEditModal from '@/components/ProfileEditModal'
import GameModal from '@/components/GameModal'
import StatusPopover from '@/components/StatusPopover'
import Toast from '@/components/Toast'
import FeedView from '@/components/FeedView'

const PREFS_KEY = 'tracker-prefs-v1'

interface Prefs {
  filter: string
  plat: string | null
  sort: string
  theme: string
  view: string
  collapsed: Record<string, boolean>
}

const DEFAULT_PREFS: Prefs = { filter: 'all', plat: null, sort: 'date', theme: 'violet', view: 'list', collapsed: {} }

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'))
  } catch {
    return DEFAULT_PREFS
  }
}

// Transform a Supabase row (user_games joined with games) into a flat GameEntry
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

export default function TrackerPage() {
  const router = useRouter()
  const supabase = createClient()

  const [games, setGames] = useState<GameEntry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs)

  const [editGame, setEditGame] = useState<GameEntry | null>(null)
  const [viewGame, setViewGame] = useState<GameEntry | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddGame, setShowAddGame] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [toast, setToast] = useState('')
  const [popState, setPopState] = useState<{ id: string; status: GameStatus; rect: DOMRect } | null>(null)
  const [search, setSearch] = useState('')

  // Cover preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 })

  // ── Init ──
  useEffect(() => {
    applyTheme(prefs.theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      loadGames(user.id)
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile)
      })
    })
    // Mount-once auth check; loadGames/supabase identities are stable in practice
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadGames(uid: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_games')
      .select('*, games(*)')
      .eq('user_id', uid)
    setLoading(false)
    if (error || !data) return
    const entries = data.map(rowToEntry)
    setGames(migrateReleased(entries))
  }

  function migrateReleased(entries: GameEntry[]): GameEntry[] {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const toMigrate = entries.filter(g =>
      g.status === 'upcoming' && !g.tbd && g.date && new Date(g.date + 'T00:00:00') < today
    )
    if (toMigrate.length > 0) {
      toMigrate.forEach(g => { g.status = 'backlog' })
      supabase.from('user_games')
        .update({ status: 'backlog', updated_at: new Date().toISOString() })
        .in('id', toMigrate.map(g => g.id))
        .then(({ error }) => {
          if (error) setToast('Error saving backlog migration')
        })
      setToast(`📦 ${toMigrate.length} game${toMigrate.length > 1 ? 's' : ''} moved to Backlog`)
    }
    return entries
  }

  // ── Theme ──
  function applyTheme(t: string) {
    const hex = THEMES[t] || THEMES.violet
    document.documentElement.style.setProperty('--accent', hex)
    document.documentElement.style.setProperty('--accent2', shade(hex, 25))
  }

  function savePrefs(p: Prefs) {
    setPrefs(p)
    localStorage.setItem(PREFS_KEY, JSON.stringify(p))
  }

  function setTheme(t: string) {
    const p = { ...prefs, theme: t }
    savePrefs(p); applyTheme(t)
  }

  // ── Game operations ──
  async function addGame(form: AddGameData): Promise<boolean> {
    if (!userId) return false

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (games.some(g => norm(g.title) === norm(form.title))) {
      setToast('Already in your list: ' + form.title); return false
    }
    // Same IGDB game can hide behind a different title (e.g. "GTA 6" vs "Grand Theft Auto VI")
    if (form.igdb_id) {
      const existing = games.find(g => g.game_id === form.igdb_id)
      if (existing) { setToast('Already in your list: ' + existing.title); return false }
    }

    // Use IGDB id if available, otherwise generate a negative manual id
    const gameId = form.igdb_id ?? -(Date.now() % 2147483647)
    const slug = form.slug ?? (slugify(form.title) + '-' + Date.now())

    const { error: gErr } = await supabase.from('games').upsert({
      id: gameId,
      slug,
      title: form.title,
      cover_url: form.cover,
      release_date: form.date || null,
      platforms: form.platforms,
      summary: form.summary,
    })
    if (gErr) { setToast('Error saving game'); return false }

    const { data: ugData, error: ugErr } = await supabase.from('user_games').insert({
      user_id: userId,
      game_id: gameId,
      status: form.status,
      tbd: !form.date,
      custom_date: null,
      note: form.note,
    }).select('*, games(*)').single()

    if (ugErr || !ugData) { setToast('Error adding game'); return false }
    setGames(prev => [...prev, rowToEntry(ugData)])
    setToast('Added: ' + form.title)
    return true
  }

  async function updateGame(id: string, updates: Partial<GameEntry>): Promise<boolean> {
    if (updates.title) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      const dup = games.find(g => g.id !== id && norm(g.title) === norm(updates.title!))
      if (dup) { setToast('Another entry already uses that title'); return false }
    }

    const dbUpdates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (updates.tbd !== undefined) dbUpdates.tbd = updates.tbd
    if (updates.note !== undefined) dbUpdates.note = updates.note
    if (updates.date !== undefined) dbUpdates.custom_date = updates.date
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating
    if (updates.review !== undefined) dbUpdates.review = updates.review

    const { error } = await supabase.from('user_games').update(dbUpdates).eq('id', id)
    if (error) { setToast('Error saving'); return false }

    // Only update game-level fields for manually-added games (negative IDs).
    // IGDB-sourced games are shared across users — editing their title/platforms
    // would affect everyone who tracks that game.
    const entry = games.find(g => g.id === id)
    if (entry && updates.title && entry.game_id < 0) {
      await supabase.from('games').update({
        title: updates.title,
        platforms: updates.platforms,
        release_date: updates.date,
      }).eq('id', entry.game_id)
    }

    setGames(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
    return true
  }

  async function deleteGame(id: string) {
    await supabase.from('user_games').delete().eq('id', id)
    setGames(prev => prev.filter(g => g.id !== id))
  }

  async function changeStatus(id: string, status: GameStatus) {
    await updateGame(id, { status })
    setPopState(null)
  }

  async function togglePlayed(id: string) {
    const g = games.find(x => x.id === id)
    if (!g) return
    const next: GameStatus = g.status === 'played'
      ? (g.date && daysUntil(g.date) >= 0 ? 'upcoming' : 'backlog')
      : 'played'
    await changeStatus(id, next)
  }

  const backlogComparator = (a: GameEntry, b: GameEntry) =>
    a.order !== b.order ? a.order - b.order : (a.date || '9999').localeCompare(b.date || '9999')

  async function reorderBacklog(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return

    // The drag indices refer to the *visible* (filtered) list, which may be a
    // subset of the full backlog. Permute the visible games within the slots
    // they occupy in the full ordering, leaving hidden games untouched.
    const fullSorted = games.filter(g => g.status === 'backlog').sort(backlogComparator)
    const renderedIds = filteredGames().filter(g => g.status === 'backlog').sort(backlogComparator).map(g => g.id)

    const renderedSet = new Set(renderedIds)
    const slots: number[] = []
    fullSorted.forEach((g, i) => { if (renderedSet.has(g.id)) slots.push(i) })

    const moved = [...renderedIds]
    const [m] = moved.splice(result.source.index, 1)
    moved.splice(result.destination.index, 0, m)

    const fullIds = fullSorted.map(g => g.id)
    slots.forEach((slot, i) => { fullIds[slot] = moved[i] })

    const orderById = new Map(fullIds.map((id, i) => [id, i]))
    setGames(prev => prev.map(g =>
      orderById.has(g.id) ? { ...g, order: orderById.get(g.id)! } : g
    ))
    await Promise.all(fullIds.map((id, i) =>
      supabase.from('user_games').update({ backlog_order: i }).eq('id', id)
    ))
  }

  // ── Profile ──
  async function saveProfile(updates: { display_name: string; bio: string; avatar_url: string }) {
    if (!userId) return
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) { setToast('Error saving profile'); return }
    setProfile(prev => prev ? { ...prev, ...updates } : prev)
    setToast('Profile saved')
  }

  // ── Sign out ──
  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // ── Export / Import ──
  function exportData() {
    const blob = new Blob([JSON.stringify(games, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    a.click(); URL.revokeObjectURL(a.href)
    setToast('Backup downloaded')
  }

  function importData() {
    setToast('Import from JSON is not yet supported in the DB version')
  }

  // ── Surprise me ──
  function surpriseMe() {
    const pool = games.filter(g => g.status === 'backlog' || g.status === 'playing')
    if (!pool.length) { setToast('No backlog games to pick from'); return }
    const pick = pool[Math.floor(Math.random() * pool.length)]
    savePrefs({ ...prefs, filter: 'all', plat: null, view: 'list', collapsed: { ...prefs.collapsed, [pick.status]: false } })
    setSearch('')
    setTimeout(() => {
      const card = document.getElementById(`card-${pick.id}`)
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
        card.classList.add('flash')
        setTimeout(() => card.classList.remove('flash'), 1400)
      }
      setToast('🎲 Play: ' + pick.title)
    }, 100)
  }

  // ── Cover preview ──
  const clearToast = useCallback(() => setToast(''), [])

  const showPreview = useCallback((cover: string, e: React.MouseEvent) => {
    setPreviewUrl(cover)
    updatePreviewPos(e.clientX, e.clientY)
  }, [])

  const hidePreview = useCallback(() => setPreviewUrl(null), [])

  function updatePreviewPos(x: number, y: number) {
    const pw = 320, ph = 453, margin = 14
    let left = x + margin, top = y - ph / 2
    if (left + pw > window.innerWidth - 8) left = x - pw - margin
    if (top < 8) top = 8
    if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8
    setPreviewPos({ x: left, y: top })
  }

  // ── Close popover on outside click ──
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Element
      if (!t.closest('.pill') && !t.closest('.status-pop')) {
        setPopState(null)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // ── ESC closes add game modal ──
  useEffect(() => {
    if (!showAddGame) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowAddGame(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showAddGame])

  // ── Filtering / sorting ──
  const allPlats = [...new Set(games.flatMap(g => g.platforms || []))].sort()

  function sortGames(arr: GameEntry[]): GameEntry[] {
    if (prefs.sort === 'az') return [...arr].sort((a, b) => a.title.localeCompare(b.title))
    return [...arr].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))
  }

  function filteredGames(): GameEntry[] {
    const q = search.toLowerCase()
    return games.filter(g => {
      if (q && !g.title.toLowerCase().includes(q)) return false
      if (prefs.plat && !(g.platforms || []).includes(prefs.plat)) return false
      if (prefs.filter !== 'all' && g.status !== prefs.filter) return false
      return true
    })
  }

  const filtered = filteredGames()

  const SECTIONS: [GameStatus, string][] = [
    ['playing', 'Now Playing'],
    ['upcoming', 'Upcoming Releases'],
    ['backlog', 'Backlog — Out Now'],
    ['played', 'Played'],
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--muted)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>Loading…</div>
      </div>
    )
  }

  return (
    <>
      <div className="app">
        <Sidebar games={games} profile={profile} onOpenSettings={() => setShowSettings(true)} onOpenAddGame={() => setShowAddGame(true)} onOpenProfile={() => setShowProfile(true)} onSignOut={signOut} />

        <main>
          {/* Header */}
          <div className="main-head">
            <div>
              <div className="brand">
                <svg className="brand-mark" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
                  <defs>
                    <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" style={{ stopColor: 'var(--accent)' }}/>
                      <stop offset="100%" style={{ stopColor: 'var(--accent2)' }}/>
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#brand-grad)"/>
                  <circle cx="24" cy="24" r="11.5" fill="none" stroke="#ffffff" strokeWidth="2.4" opacity=".9"/>
                  <line x1="24" y1="7"  x2="24" y2="12.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
                  <line x1="24" y1="35.5" x2="24" y2="41" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
                  <line x1="7"  y1="24" x2="12.5" y2="24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
                  <line x1="35.5" y1="24" x2="41" y2="24" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/>
                  <line className="sweep" x1="24" y1="24" x2="24" y2="14.5" stroke="#ffffffaa" strokeWidth="2" strokeLinecap="round"/>
                  <circle className="ping" cx="24" cy="24" r="3.4" fill="#fff"/>
                </svg>
                <h1>TRACKER</h1>
              </div>
              <p className="subtitle">Upcoming releases &amp; backlog</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="surprise-btn" onClick={surpriseMe}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="3"/>
                  <circle cx="8" cy="8" r="1.3" fill="currentColor"/>
                  <circle cx="16" cy="16" r="1.3" fill="currentColor"/>
                  <circle cx="16" cy="8" r="1.3" fill="currentColor"/>
                  <circle cx="8" cy="16" r="1.3" fill="currentColor"/>
                </svg>
                Surprise me
              </button>
              <div className="view-toggle">
                {(['list', 'calendar', 'stats', 'following'] as const).map(v => (
                  <button
                    key={v}
                    className={prefs.view === v ? 'active' : ''}
                    onClick={() => savePrefs({ ...prefs, view: v })}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* LIST VIEW */}
          {prefs.view === 'list' && (
            <div>
              <div className="toolbar">
                <div className="toolbar-filters">
                {(['all', 'upcoming', 'backlog', 'playing', 'played'] as const).map(f => (
                  <button
                    key={f}
                    className={`filter-btn${prefs.filter === f ? ' active' : ''}`}
                    onClick={() => savePrefs({ ...prefs, filter: f })}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                </div>
                <div className="toolbar-right">
                  <select
                    className="sort-sel"
                    value={prefs.sort}
                    onChange={e => savePrefs({ ...prefs, sort: e.target.value })}
                  >
                    <option value="date">Sort: Date</option>
                    <option value="az">Sort: A–Z</option>
                  </select>
                  <div className="search-wrap">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Platform chips */}
              {allPlats.length > 0 && (
                <div className="plat-chips">
                  {allPlats.map(p => (
                    <button
                      key={p}
                      className={`plat-chip${prefs.plat === p ? ' active' : ''}`}
                      onClick={() => savePrefs({ ...prefs, plat: prefs.plat === p ? null : p })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Game list */}
              {filtered.length === 0 ? (
                <div className="empty">No games match.</div>
              ) : (
                SECTIONS.map(([status, label]) => {
                  let sectionGames: GameEntry[]
                  if (status === 'backlog' && prefs.sort === 'date') {
                    sectionGames = filtered
                      .filter(g => g.status === 'backlog')
                      .sort(backlogComparator)
                  } else {
                    sectionGames = sortGames(filtered.filter(g => g.status === status))
                  }
                  if (!sectionGames.length) return null

                  const isCollapsed = prefs.collapsed[status]

                  const body = status === 'backlog' && prefs.sort === 'date' ? (
                    <DragDropContext onDragEnd={reorderBacklog}>
                      <Droppable droppableId="backlog">
                        {provided => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="card-grid">
                            {sectionGames.map((g, i) => (
                              <Draggable key={g.id} draggableId={g.id} index={i}>
                                {(prov, snapshot) => (
                                  <div ref={prov.innerRef} {...prov.draggableProps}>
                                    <GameCard
                                      game={g}
                                      onEdit={setEditGame}
                                      onDelete={deleteGame}
                                      onTogglePlayed={togglePlayed}
                                      onPillClick={(id, st, rect) => setPopState(prev => prev?.id === id ? null : { id, status: st, rect })}
                                      onPreviewShow={showPreview}
                                      onPreviewHide={hidePreview}
                                      onViewGame={setViewGame}
                                      dragHandleProps={prov.dragHandleProps ?? undefined}
                                      isDragging={snapshot.isDragging}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  ) : status === 'upcoming' && prefs.sort === 'date' ? (
                    <div className="card-grid">
                      {(() => {
                        let lastYear: string | null = null
                        return sectionGames.map(g => {
                          const yr = g.date ? g.date.slice(0, 4) : 'TBD'
                          const divider = yr !== lastYear
                          lastYear = yr
                          return (
                            <Fragment key={g.id}>
                              {divider && (
                                <div className="year-div">
                                  <span className="yd-label">{yr}</span>
                                  <span className="yd-line" />
                                </div>
                              )}
                              <GameCard
                                game={g}
                                onEdit={setEditGame}
                                onDelete={deleteGame}
                                onTogglePlayed={togglePlayed}
                                onPillClick={(id, st, rect) => setPopState(prev => prev?.id === id ? null : { id, status: st, rect })}
                                onPreviewShow={showPreview}
                                onPreviewHide={hidePreview}
                                onViewGame={setViewGame}
                              />
                            </Fragment>
                          )
                        })
                      })()}
                    </div>
                  ) : (
                    <div className="card-grid">
                      {sectionGames.map(g => (
                        <GameCard
                          key={g.id}
                          game={g}
                          onEdit={setEditGame}
                          onDelete={deleteGame}
                          onTogglePlayed={togglePlayed}
                          onPillClick={(id, st, rect) => setPopState(prev => prev?.id === id ? null : { id, status: st, rect })}
                          onPreviewShow={showPreview}
                          onPreviewHide={hidePreview}
                          onViewGame={setViewGame}
                        />
                      ))}
                    </div>
                  )

                  return (
                    <div key={status}>
                      <div
                        className={`section-head${isCollapsed ? ' collapsed' : ''}`}
                        onClick={() => savePrefs({ ...prefs, collapsed: { ...prefs.collapsed, [status]: !isCollapsed } })}
                      >
                        <span className="caret">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </span>
                        <h2>{label}</h2>
                        <span className="count">{sectionGames.length}</span>
                        <span className="line" />
                      </div>
                      <div className={`section-body${isCollapsed ? ' collapsed' : ''}`}>
                        {body}
                      </div>
                    </div>
                  )
                })
              )}

            </div>
          )}

          {/* CALENDAR VIEW */}
          {prefs.view === 'calendar' && (
            <CalendarView games={games} onEditGame={setEditGame} />
          )}

          {/* STATS VIEW */}
          {prefs.view === 'stats' && (
            <StatsView games={games} />
          )}

          {/* FOLLOWING VIEW */}
          {prefs.view === 'following' && userId && (
            <FeedView userId={userId} onViewGame={setViewGame} />
          )}
        </main>
      </div>

      {/* Cover preview */}
      {previewUrl && (
        <div
          className="cover-preview show"
          style={{ left: previewPos.x, top: previewPos.y }}
        >
          <div className="pv-blur" style={{ backgroundImage: `url('${previewUrl}')` }} />
          <div className="pv-img"  style={{ backgroundImage: `url('${previewUrl}')` }} />
        </div>
      )}

      {/* Status popover */}
      <StatusPopover
        gameId={popState?.id ?? null}
        currentStatus={popState?.status ?? null}
        anchorRect={popState?.rect ?? null}
        onSelect={changeStatus}
        onClose={() => setPopState(null)}
      />

      {/* Game info modal */}
      <GameModal game={viewGame} onClose={() => setViewGame(null)} />

      {/* Edit modal */}
      <EditModal
        key={editGame?.id ?? 'closed'}
        game={editGame}
        onSave={updateGame}
        onClose={() => setEditGame(null)}
      />

      {/* Settings modal */}
      <SettingsModal
        open={showSettings}
        theme={prefs.theme}
        onTheme={setTheme}
        onExport={exportData}
        onImport={importData}
        onClose={() => setShowSettings(false)}
      />

      {/* Profile edit modal */}
      <ProfileEditModal
        open={showProfile}
        profile={profile}
        onSave={saveProfile}
        onClose={() => setShowProfile(false)}
      />

      {/* Add game modal */}
      <div
        className={`modal-bg${showAddGame ? ' open' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) setShowAddGame(false) }}
      >
        <div className="modal" style={{ maxWidth: 560 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>Add a game</h3>
            <button className="icon-btn" onClick={() => setShowAddGame(false)} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <AddGameForm key={showAddGame ? 'open' : 'closed'} onAdd={async (data) => { const ok = await addGame(data); if (ok) setShowAddGame(false) }} />
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast} onClear={clearToast} />
    </>
  )
}
