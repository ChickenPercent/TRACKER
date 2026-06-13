'use client'

import { useEffect } from 'react'
import { THEMES } from '@/types'

export interface UserProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

interface Props {
  open: boolean
  theme: string
  onTheme: (t: string) => void
  onExport: () => void
  onImport: (data: unknown[]) => void
  onClose: () => void
}

export default function SettingsModal({ open, theme, onTheme, onExport, onImport, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleBgClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!Array.isArray(data)) throw new Error()
        onImport(data)
      } catch { /* handled by parent */ }
    }
    reader.readAsText(file)
    e.target.value = ''
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
            <label className="side-btn" style={{ cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Import backup
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  )
}
