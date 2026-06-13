'use client'

import { useState } from 'react'
import CoverArt from './CoverArt'
import StarRating from './StarRating'
import { pillClass, pillLabel, fmtDate, titleHue } from '@/lib/utils'
import type { GameEntry, GameStatus } from '@/types'

interface Props {
  game: GameEntry
  onEdit: (game: GameEntry) => void
  onDelete: (id: string) => void
  onTogglePlayed: (id: string) => void
  onPillClick: (id: string, status: GameStatus, rect: DOMRect) => void
  onPreviewShow: (cover: string, e: React.MouseEvent) => void
  onPreviewHide: () => void
  onViewGame?: (game: GameEntry) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}

export default function GameCard({
  game, onEdit, onDelete, onTogglePlayed,
  onPillClick, onPreviewShow, onPreviewHide,
  onViewGame, dragHandleProps, isDragging
}: Props) {
  const [confirming, setConfirming] = useState(false)

  function handleDelete() {
    if (confirming) {
      onDelete(game.id)
      return
    }
    setConfirming(true)
    setTimeout(() => setConfirming(false), 3000)
  }

  function handlePillClick(e: React.MouseEvent) {
    e.stopPropagation()
    onPillClick(game.id, game.status, e.currentTarget.getBoundingClientRect())
  }

  const showDate = game.status !== 'backlog' && game.status !== 'playing'
  const barStyle = (!game.cover && game.status === 'upcoming')
    ? { '--card-bar': `hsl(${titleHue(game.title)},55%,58%)` } as React.CSSProperties
    : {}

  return (
    <div
      className={`card status-${game.status}${isDragging ? ' dragging' : ''}`}
      id={`card-${game.id}`}
      style={barStyle}
    >
      {dragHandleProps && (
        <div className="grip" title="Drag to reorder" {...dragHandleProps}>
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2.5" cy="3"  r="1.4"/><circle cx="7.5" cy="3"  r="1.4"/>
            <circle cx="2.5" cy="8"  r="1.4"/><circle cx="7.5" cy="8"  r="1.4"/>
            <circle cx="2.5" cy="13" r="1.4"/><circle cx="7.5" cy="13" r="1.4"/>
          </svg>
        </div>
      )}

      <CoverArt
        title={game.title}
        cover={game.cover}
        onPreviewShow={onPreviewShow}
        onPreviewHide={onPreviewHide}
      />

      <div
        className={`cb${game.status === 'played' ? ' on' : ''}`}
        onClick={() => onTogglePlayed(game.id)}
        role="checkbox"
        aria-checked={game.status === 'played'}
        aria-label="Mark as played"
      >
        <svg viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3"/></svg>
      </div>

      <div className="card-info">
        <div className="card-top">
          <span className="card-title">
            <a
              href={`/game/${game.slug}`}
              className="card-title-link"
              onClick={e => { e.stopPropagation(); if (onViewGame) { e.preventDefault(); onViewGame(game) } }}
            >{game.title}</a>
          </span>
          <span className={pillClass(game)} onClick={handlePillClick} title="Change status">
            {pillLabel(game)}
          </span>
        </div>
        <div className="card-meta">
          {showDate && <span className="meta-date">{fmtDate(game)}</span>}
          {(game.platforms || []).map(p => (
            <span key={p} className="plat-tag">{p}</span>
          ))}
        </div>
        {game.note && <div className="card-note">{game.note}</div>}
        {game.rating !== null && game.rating !== undefined && (
          <div className="card-rating">
            <StarRating value={game.rating} size={13} />
          </div>
        )}
      </div>

      <div className="card-actions">
        <button className="icon-btn edit-btn" onClick={() => onEdit(game)} aria-label="Edit" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button
          className="icon-btn"
          onClick={handleDelete}
          aria-label={confirming ? 'Click again to delete' : 'Remove'}
          title={confirming ? 'Click again to confirm delete' : 'Remove'}
          style={confirming ? { background: '#f8717133', outline: '1px solid var(--red)', color: 'var(--red)' } : {}}
        >
          {confirming ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
