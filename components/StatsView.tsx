'use client'

import type { GameEntry } from '@/types'

interface Props { games: GameEntry[] }

export default function StatsView({ games }: Props) {
  const total = games.length
  const played = games.filter(g => g.status === 'played').length
  const playing = games.filter(g => g.status === 'playing').length
  const backlog = games.filter(g => g.status === 'backlog').length
  const upcoming = games.filter(g => g.status === 'upcoming').length
  const owned = backlog + playing + played
  const pct = owned ? Math.round(played / owned * 100) : 0

  const platCount: Record<string, number> = {}
  games.forEach(g => (g.platforms || []).forEach(p => {
    platCount[p] = (platCount[p] || 0) + 1
  }))
  const platSorted = Object.entries(platCount).sort((a, b) => b[1] - a[1])
  const maxPlat = platSorted.length ? platSorted[0][1] : 1

  const yearCount: Record<string, number> = {}
  games.filter(g => g.status === 'played' && g.date).forEach(g => {
    const y = g.date!.slice(0, 4)
    yearCount[y] = (yearCount[y] || 0) + 1
  })
  const yearSorted = Object.entries(yearCount).sort((a, b) => a[0].localeCompare(b[0]))
  const maxYear = yearSorted.length ? Math.max(...yearSorted.map(y => y[1])) : 1

  const now = new Date()
  now.setDate(1); now.setHours(0, 0, 0, 0)
  const months = Array.from({ length: 18 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() + i, 1)
    return {
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      date: m,
      count: 0,
      titles: [] as string[],
    }
  })
  games.filter(g => g.status === 'upcoming' && g.date).forEach(g => {
    const key = g.date!.slice(0, 7)
    const slot = months.find(m => m.key === key)
    if (slot) { slot.count++; slot.titles.push(g.title + (g.tbd ? ' (approx)' : '')) }
  })
  const maxDensity = Math.max(1, ...months.map(m => m.count))

  return (
    <>
      <div className="dash">
        <div className="dash-card"><div className="dash-num">{total}</div><div className="dash-label">Total tracked</div></div>
        <div className="dash-card"><div className="dash-num">{upcoming}</div><div className="dash-label">Upcoming</div></div>
        <div className="dash-card"><div className="dash-num">{played}</div><div className="dash-label">Played</div></div>
        <div className="dash-card"><div className="dash-num">{pct}%</div><div className="dash-label">Backlog cleared</div></div>
      </div>

      <div className="dash">
        <div className="dash-card dash-wide">
          <h5>Release density — next 18 months</h5>
          <div className="density">
            {months.map((m, i) => {
              const h = m.count ? Math.max(8, Math.round(m.count / maxDensity * 70)) : 2
              const lbl = m.date.toLocaleDateString('en-GB', { month: 'short' }) +
                (m.date.getMonth() === 0 || i === 0 ? ` '${String(m.date.getFullYear()).slice(2)}` : '')
              return (
                <div
                  key={m.key}
                  className={`density-col${i === 0 ? ' now' : ''}`}
                  title={m.count ? m.titles.join('\n') : 'No releases'}
                >
                  <div className={`density-bar${m.count ? '' : ' zero'}`} style={{ height: h }} />
                  <div className="density-lbl">{lbl}</div>
                </div>
              )
            })}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            Hover a bar to see which games land that month. Approximate (TBD) dates included.
          </p>
        </div>

        <div className="dash-card dash-wide">
          <h5>Games by platform</h5>
          <div className="dash-bars">
            {platSorted.map(([p, n]) => (
              <div key={p} className="dash-bar-row">
                <span className="dash-bar-label">{p}</span>
                <span className="dash-bar-track">
                  <span className="dash-bar-fill" style={{ width: `${Math.round(n / maxPlat * 100)}%` }} />
                </span>
                <span className="dash-bar-val">{n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-card dash-wide">
          <h5>Played by release year</h5>
          <div className="dash-bars">
            {yearSorted.length ? yearSorted.map(([y, n]) => (
              <div key={y} className="dash-bar-row">
                <span className="dash-bar-label">{y}</span>
                <span className="dash-bar-track">
                  <span className="dash-bar-fill" style={{ width: `${Math.round(n / maxYear * 100)}%` }} />
                </span>
                <span className="dash-bar-val">{n}</span>
              </div>
            )) : <p className="hint">Mark some games as played to see this.</p>}
          </div>
        </div>
      </div>
    </>
  )
}
