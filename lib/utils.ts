import type { GameEntry } from '@/types'

export function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 9999
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - now.getTime()) / 86400000)
}

export function fmtDate(g: GameEntry): string {
  if (!g.date) return 'TBD'
  const d = new Date(g.date + 'T00:00:00')
  if (g.tbd) return d.getFullYear() + ' (approx)'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function pillClass(g: GameEntry): string {
  if (g.status === 'played')  return 'pill pill-green'
  if (g.status === 'playing') return 'pill pill-cyan'
  if (g.status === 'backlog') return 'pill pill-blue'
  if (g.tbd) return 'pill pill-purple'
  const d = daysUntil(g.date)
  if (d < 0)   return 'pill pill-muted'
  if (d === 0) return 'pill pill-green'
  return 'pill pill-amber'
}

export function pillLabel(g: GameEntry): string {
  if (g.status === 'played')  return 'Played'
  if (g.status === 'playing') return 'Now playing'
  if (g.status === 'backlog') return 'Backlog'
  if (g.tbd) return 'Date TBD'
  const d = daysUntil(g.date)
  if (d < 0)  return 'Released'
  if (d === 0) return 'Today!'
  return `${d}d away`
}

export function titleHue(title: string): number {
  return [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360
}

export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  r = Math.min(255, Math.round(r + (255 - r) * pct / 100))
  g = Math.min(255, Math.round(g + (255 - g) * pct / 100))
  b = Math.min(255, Math.round(b + (255 - b) * pct / 100))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60)    return 'just now'
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`
  return `${Math.floor(secs / 604800)}w ago`
}
