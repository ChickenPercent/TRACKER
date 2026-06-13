'use client'

import { daysUntil, fmtDate } from '@/lib/utils'
import type { GameEntry } from '@/types'
import type { UserProfile } from './SettingsModal'
import NotificationBell from './NotificationBell'

interface Props {
  games: GameEntry[]
  profile: UserProfile | null
  onOpenSettings: () => void
  onOpenAddGame: () => void
  onOpenProfile: () => void
  onSignOut: () => void
}

export default function Sidebar({ games, profile, onOpenSettings, onOpenAddGame, onOpenProfile, onSignOut }: Props) {
  const upcoming = games
    .filter(g => g.status === 'upcoming' && !g.tbd && (g.date ? daysUntil(g.date) >= 0 : false))
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))

  const next = upcoming[0] ?? null
  const d = next ? daysUntil(next.date) : null

  const WINDOW = 90
  const pct = (d !== null && d !== 9999)
    ? Math.max(0.03, Math.min(1, (WINDOW - d) / WINDOW))
    : 0
  const R = 32
  const C = 2 * Math.PI * R
  const offset = C * (1 - pct)
  const isToday = d === 0

  const count = (s: string) => games.filter(g => g.status === s).length
  const owned = count('backlog') + count('playing') + count('played')
  const done = count('played')
  const progress = owned ? Math.round(done / owned * 100) : 0

  const initials = (profile?.display_name || profile?.username || '?')
    .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <aside>
      {/* User profile chip */}
      {profile && (
        <div className="sidebar-profile" onClick={onOpenProfile} role="button" title="Edit profile">
          <div className="sidebar-avatar">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name || profile.username} />
            ) : initials}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-display-name">{profile.display_name || profile.username}</div>
            <a
              href={`/u/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-profile-link"
              onClick={e => e.stopPropagation()}
            >
              @{profile.username} ↗
            </a>
          </div>
          <svg className="sidebar-profile-edit-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
      )}

      {/* Countdown ring */}
      <div className="countdown">
        <div className="countdown-label">Next release</div>
        {next ? (
          <>
            <div className="countdown-title">{next.title}</div>
            <div className="countdown-ring-wrap" title="Ring fills as release day approaches (90-day window)">
              <div className="ring-box">
                <svg width="74" height="74" viewBox="0 0 74 74">
                  <circle className="countdown-ring-bg" cx="37" cy="37" r={R}/>
                  <circle
                    className={`countdown-ring-fill${isToday ? ' countdown-ring-pulse' : ''}`}
                    cx="37" cy="37" r={R}
                    strokeDasharray={C}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="ring-num">
                  {isToday ? '🎮' : (
                    <>
                      {d}
                      <small>{d === 1 ? 'day' : 'days'}</small>
                    </>
                  )}
                </div>
              </div>
              <div className="countdown-sub">
                {isToday
                  ? <b style={{ color: 'var(--accent2)' }}>Out today!</b>
                  : <>{d === 1 ? 'Releases tomorrow' : `${d} days to go`}<br />{fmtDate(next)}</>
                }
              </div>
            </div>
          </>
        ) : (
          <div className="countdown-title">Nothing dated yet</div>
        )}
      </div>

      {/* Stats grid */}
      <div className="side-stats">
        {(['upcoming','backlog','playing','played'] as const).map(s => (
          <div key={s} className="sstat">
            <div className="sstat-num">{count(s)}</div>
            <div className="sstat-label">{s.charAt(0).toUpperCase() + s.slice(1)}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="progress-head">
          <span>Backlog progress</span>
          <b>{done} / {owned}</b>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Add a game */}
      <button
        onClick={onOpenAddGame}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 15,
          fontWeight: 700,
          background: '#c8960c',
          color: '#0c0c0f',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          cursor: 'pointer',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: '0 4px 18px #c8960c55',
          transition: 'background .15s, transform .1s',
          letterSpacing: '.01em',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#d9a420' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#c8960c' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add a game
      </button>

      {/* Settings / Sign out */}
      <div className="side-section" style={{ marginTop: 'auto' }}>
        <div className="side-btns">
          <NotificationBell />
          <button className="side-btn" onClick={onOpenSettings}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
          <button className="side-btn" onClick={onSignOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
