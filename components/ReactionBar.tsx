import type { CSSProperties } from 'react'

export type Reaction = 'like' | 'dislike'

interface Props {
  like: number
  dislike: number
  mine: Reaction | null
  onReact: (r: Reaction) => void
  disabled?: boolean
}

/** Presentational like / dislike buttons. Data + persistence live in the parent. */
export default function ReactionBar({ like, dislike, mine, onReact, disabled = false }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => onReact('like')}
        disabled={disabled}
        aria-label="Like review"
        aria-pressed={mine === 'like'}
        style={btnStyle(mine === 'like', 'var(--green)', disabled)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={mine === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
        </svg>
        {like > 0 && <span>{like}</span>}
      </button>

      <button
        onClick={() => onReact('dislike')}
        disabled={disabled}
        aria-label="Dislike review"
        aria-pressed={mine === 'dislike'}
        style={btnStyle(mine === 'dislike', 'var(--red)', disabled)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={mine === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
        </svg>
        {dislike > 0 && <span>{dislike}</span>}
      </button>
    </div>
  )
}

function btnStyle(active: boolean, activeColor: string, disabled: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border2)',
    background: active ? `color-mix(in srgb, ${activeColor} 15%, transparent)` : 'transparent',
    color: active ? activeColor : 'var(--muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled && !active ? 0.5 : 1,
    transition: 'color .15s, background .15s, border-color .15s',
  }
}
