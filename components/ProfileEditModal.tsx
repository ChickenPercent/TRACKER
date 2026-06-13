'use client'

import { useState, useEffect } from 'react'
import type { UserProfile } from './SettingsModal'

interface Props {
  open: boolean
  profile: UserProfile | null
  onSave: (updates: { display_name: string; bio: string; avatar_url: string }) => Promise<void>
  onClose: () => void
}

export default function ProfileEditModal({ open, profile, onSave, onClose }: Props) {
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setDisplayName(profile?.display_name || '')
      setBio(profile?.bio || '')
      setAvatarUrl(profile?.avatar_url || '')
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
    await onSave({ display_name: displayName, bio, avatar_url: avatarUrl })
    setSaving(false)
    onClose()
  }

  const initials = (displayName || profile?.username || '?')
    .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

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
            ) : initials}
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
