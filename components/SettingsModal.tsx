'use client'

import { useEffect } from 'react'
import { THEMES } from '@/types'

export interface UserProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  top_games: number[] | null
}

interface Props {
  open: boolean
  theme: string
  onTheme: (t: string) => void
  onExport: () => void
  playingInBacklog: boolean
  onPlayingInBacklog: (v: boolean) => void
  onClose: () => void
}

export default function SettingsModal({ open, theme, onTheme, onExport, playingInBacklog, onPlayingInBacklog, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleBgClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={`modal-bg${open ? ' open' : ''}`} onClick={handleBgClick}>
      <div className="modal">
        <h3>Settings</h3>

        <div className="settings-section">
          <h4>Accent theme</h4>
          <div className="theme-dots">
            {Object.entries(THEMES).map(([name, hex]) => (
              <div
                key={name}
                className={`theme-dot${theme === name ? ' active' : ''}`}
                style={{ background: hex }}
                onClick={() => onTheme(name)}
                title={name}
              />
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h4>Backlog progress</h4>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
            <span>Include "Now Playing" in backlog count</span>
            <input
              type="checkbox"
              checked={playingInBacklog}
              onChange={e => onPlayingInBacklog(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
            />
          </label>
        </div>

        <div className="settings-section">
          <h4>Data</h4>
          <div className="settings-btn-row">
            <button className="side-btn" onClick={onExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export backup
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
