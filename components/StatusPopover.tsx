'use client'

import { useEffect, useRef } from 'react'
import type { GameStatus } from '@/types'

interface Props {
  gameId: string | null
  currentStatus: GameStatus | null
  anchorRect: DOMRect | null
  onSelect: (id: string, status: GameStatus) => void
  onClose: () => void
}

const OPTS: { v: GameStatus; label: string; dot: string }[] = [
  { v: 'upcoming', label: 'Upcoming', dot: 'var(--amber)' },
  { v: 'backlog',  label: 'Backlog',  dot: 'var(--blue)' },
  { v: 'playing',  label: 'Playing',  dot: 'var(--cyan)' },
  { v: 'played',   label: 'Played',   dot: 'var(--green)' },
]

export default function StatusPopover({ gameId, currentStatus, anchorRect, onSelect, onClose }: Props) {
  const popRef = useRef<HTMLDivElement>(null)
  const isOpen = !!gameId && !!anchorRect

  useEffect(() => {
    if (!isOpen || !popRef.current || !anchorRect) return
    const pop = popRef.current
    const ph = pop.offsetHeight
    const pw = pop.offsetWidth
    let top = anchorRect.bottom + 6
    if (top + ph > window.innerHeight - 8) top = anchorRect.top - ph - 6
    let left = anchorRect.left
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8
    pop.style.top = top + 'px'
    pop.style.left = left + 'px'
  }, [isOpen, anchorRect])

  useEffect(() => {
    if (!isOpen) return
    function onScroll() { onClose() }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isOpen, onClose])

  return (
    <div ref={popRef} className={`status-pop${isOpen ? ' open' : ''}`}>
      {OPTS.map(o => (
        <div
          key={o.v}
          className={`status-pop-item${currentStatus === o.v ? ' active-item' : ''}`}
          onClick={() => { if (gameId) onSelect(gameId, o.v) }}
        >
          <span className="pop-dot" style={{ background: o.dot }} />
          {o.label}
        </div>
      ))}
    </div>
  )
}
