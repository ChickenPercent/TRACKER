'use client'

import { useState, useEffect } from 'react'
import { initials, cssUrl } from '@/lib/utils'
import type { UserProfile } from './SettingsModal'
import type { GameEntry } from '@/types'

interface Props {
  open: boolean
  profile: UserProfile | null
  games: GameEntry[]
  onSave: (updates: { display_name: string; bio: string; avatar_url: string; banner_url: string; top_games: number[] }) => Promise<void>
  onClose: () => void
}

export default function ProfileEditModal({ open, profile, games, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [topGames, setTopGames] = useState<number[]>([])
  const [gameSearch, setGameSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name || '')
      setBio(profile?.bio || '')
      setAvatarUrl(profile?.avatar_url || '')
      setBannerUrl(profile?.banner_url || '')
      setTopGames(profile?.top_games || [])
      setGameSearch('')
    }
  }, [open, profile])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleSave() {
    setSaving(true)
    await onSave({ display_name: displayName, bio, avatar_url: avatarUrl, banner_url: bannerUrl, top_games: topGames })
    setSaving(false)
    onClose()
  }

  function toggleGame(gameId: number) {
    setTopGames(prev => {
      if (prev.includes(gameId)) return prev.filter(id => id !== gameId)
      if (prev.length >= 5) return prev
      return [...prev, gameId]
    })
  }

  function removeGame(gameId: number) {
    setTopGames(prev => prev.filter(id => id !== gameId))
  }

  const avatarInitials = initials(displayName || profile?.username)
  const safeBanner = cssUrl(bannerUrl)

  const filteredGames = games
    .filter(g => g.title.toLowerCase().includes(gameSearch.toLowerCase()))
    .sort((a, b) => {
      const aIn = topGames.includes(a.game_id)
      const bIn = topGames.includes(b.game_id)
      if (aIn && !bIn) return -1
      if (!aIn && bIn) return 1
      return a.title.localeCompare(b.title)
    })

  return (
    <div className={`modal-bg${open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ margin: 0 }}>Edit profile</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div className="profile-edit-avatar" style={{ width: 72, height: 72, fontSize: 24 }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : avatarInitials}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={48}
              autoFocus
            />
          </div>
          <div>
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A short bio…"
              maxLength={200}
              style={{ minHeight: 72 }}
            />
          </div>
          <div>
            <label>Avatar URL</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label>Banner URL</label>
            {safeBanner && (
              <div style={{ height: 64, borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: 6, backgroundImage: `url('${safeBanner}')`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid var(--border)' }} />
            )}
            <input
              type="text"
              value={bannerUrl}
              onChange={e => setBannerUrl(e.target.value)}
              placeholder="https://… (wide image for profile banner)"
            />
          </div>

          {/* Top 5 Games */}
          <div>
            <label>Top 5 Games</label>

            {/* Slots */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => {
                const gameId = topGames[i]
                const game = gameId !== undefined ? games.find(g => g.game_id === gameId) : undefined
                return (
                  <div key={i} style={{ position: 'relative', width: 52, height: 74, flexShrink: 0, borderRadius: 4, border: '1px solid var(--border2)', background: 'var(--bg3)', overflow: 'hidden' }}>
                    {game?.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={game.cover} alt={game.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                        {i + 1}
                      </div>
                    )}
                    {game && (
                      <button
                        onClick={() => removeGame(game.game_id)}
                        aria-label={`Remove ${game.title}`}
                        style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: '#fff', fontSize: 10, lineHeight: 1 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search your games…"
              value={gameSearch}
              onChange={e => setGameSearch(e.target.value)}
              style={{ marginBottom: 6 }}
            />

            {/* Game list */}
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
              {filteredGames.length === 0 ? (
                <div style={{ padding: '12px 8px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>No games found</div>
              ) : filteredGames.map(g => {
                const selected = topGames.includes(g.game_id)
                const disabled = !selected && topGames.length >= 5
                return (
                  <button
                    key={g.game_id}
                    onClick={() => toggleGame(g.game_id)}
                    disabled={disabled}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '5px 8px', borderRadius: 4, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                      background: selected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                      color: disabled ? 'var(--muted)' : 'var(--text)',
                      textAlign: 'left', width: '100%', opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {g.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cover} alt="" style={{ width: 24, height: 34, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 24, height: 34, borderRadius: 2, background: 'var(--bg3)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.title}</span>
                    {selected && (
                      <span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 700, flexShrink: 0 }}>
                        #{topGames.indexOf(g.game_id) + 1}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {profile?.username && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>@{profile.username}</span>
              <a
                href={`/u/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--accent2)', textDecoration: 'none' }}
              >
                View public profile ↗
              </a>
            </div>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
