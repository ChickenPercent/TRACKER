'use client'

import { STATUS_COLOR } from '@/lib/utils'
import type { GameStatus } from '@/types'

const STATUSES: { key: GameStatus; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'playing', label: 'Playing' },
  { key: 'played', label: 'Played' },
]

interface Props {
  value: GameStatus
  onChange: (s: GameStatus) => void
  compact?: boolean
}

export default function StatusPicker({ value, onChange, compact = false }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: compact ? 6 : 8 }}>
      {STATUSES.map(s => {
        const active = value === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            style={{
              padding: compact ? '7px 4px' : '10px 4px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontSize: compact ? 11 : 12, fontWeight: 600,
              border: active ? `1.5px solid ${STATUS_COLOR[s.key]}` : '1px solid var(--border2)',
              background: active ? `color-mix(in srgb, ${STATUS_COLOR[s.key]} 14%, transparent)` : 'transparent',
              color: active ? STATUS_COLOR[s.key] : 'var(--muted)',
              transition: 'border-color .15s, background .15s, color .15s',
            }}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
