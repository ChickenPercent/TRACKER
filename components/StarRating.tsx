'use client'

import { useId, useState } from 'react'

const PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"

interface Props {
  value: number | null
  onChange?: (val: number | null) => void
  size?: number
}

export default function StarRating({ value, onChange, size = 16 }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const display = hover ?? value ?? 0

  function half(e: React.MouseEvent<SVGSVGElement>, star: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    return e.clientX < rect.left + rect.width / 2 ? star - 0.5 : star
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(star => {
        const pct = Math.round(Math.min(100, Math.max(0, (display - (star - 1)) * 100)))
        const gid = `${uid}${star}`
        return (
          <svg
            key={star}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            style={{ cursor: onChange ? 'pointer' : 'default', flexShrink: 0, display: 'block' }}
            onMouseMove={onChange ? e => setHover(half(e, star)) : undefined}
            onMouseLeave={onChange ? () => setHover(null) : undefined}
            onClick={onChange ? e => {
              const v = half(e, star)
              onChange(v === value ? null : v)
            } : undefined}
          >
            <defs>
              <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${pct}%`} stopColor="var(--amber)" />
                <stop offset={`${pct}%`} stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d={PATH}
              fill={`url(#${gid})`}
              stroke={pct > 0 ? 'var(--amber)' : 'var(--muted)'}
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity={pct > 0 ? 1 : 0.4}
            />
          </svg>
        )
      })}
      {value !== null && value !== undefined && (
        <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginLeft: 3 }}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  )
}
