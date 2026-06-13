'use client'

import { useState } from 'react'
import type { GameEntry } from '@/types'

interface Props {
  games: GameEntry[]
  onEditGame: (game: GameEntry) => void
}

export default function CalendarView({ games, onEditGame }: Props) {
  const [calDate, setCalDate] = useState(new Date())

  function calMove(dir: number) {
    setCalDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1))
  }
  function calToday() { setCalDate(new Date()) }

  const year = calDate.getFullYear()
  const month = calDate.getMonth()
  const first = new Date(year, month, 1)
  const startDow = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = new Date().toISOString().slice(0, 10)

  const byDate: Record<number, GameEntry[]> = {}
  games.forEach(g => {
    if (!g.date) return
    const d = new Date(g.date + 'T00:00:00')
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = g.tbd ? 1 : d.getDate()
      if (!byDate[day]) byDate[day] = []
      byDate[day].push(g)
    }
  })

  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  return (
    <>
      <div className="cal-head">
        <div className="cal-nav">
          <button onClick={() => calMove(-1)} aria-label="Previous month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="cal-month">
            {calDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => calMove(1)} aria-label="Next month">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <button className="btn btn-ghost" onClick={calToday}>Today</button>
      </div>

      <div className="cal-grid">
        {dows.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`empty-${i}`} className="cal-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === todayStr
          const dayGames = byDate[day] || []
          return (
            <div key={day} className={`cal-cell${isToday ? ' today' : ''}`}>
              <div className="cal-daynum">{day}</div>
              {dayGames.map(g => (
                <div
                  key={g.id}
                  className={`cal-game${g.tbd ? ' tbd' : ''}`}
                  onClick={() => onEditGame(g)}
                  title={g.title + (g.tbd ? ' (approx)' : '')}
                >
                  {g.title}
                </div>
              ))}
            </div>
          )
        })}
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Games with approximate dates appear in purple on the 1st of their month.
      </p>
    </>
  )
}
