import type { CSSProperties } from 'react'

function Bar({ w = '100%', h = 12, r = 6, style }: { w?: number | string; h?: number; r?: number; style?: CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

/** A single placeholder card matching the review/feed card layout. */
function SkeletonRow({ coverW = 64, coverH = 90 }: { coverW?: number; coverH?: number }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ width: coverW, height: coverH, borderRadius: 8, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
        <Bar w="55%" h={13} />
        <Bar w="30%" h={11} />
        <Bar w="90%" h={11} style={{ marginTop: 4 }} />
        <Bar w="80%" h={11} />
      </div>
    </div>
  )
}

/** Vertical stack of placeholder cards — used for the main list and the reviews feed. */
export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  )
}

/** Poster grid placeholder — used while Discover game results load. */
export function GameGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="skeleton" style={{ width: '100%', aspectRatio: '3/4', borderRadius: 8, marginBottom: 8 }} />
          <Bar w="80%" h={11} />
        </div>
      ))}
    </div>
  )
}
