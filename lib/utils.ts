import type { GameEntry } from '@/types'

// Status → CSS variable maps, shared across cards, modals and the feed
export const STATUS_COLOR: Record<string, string> = {
  playing: 'var(--cyan)', upcoming: 'var(--amber)', backlog: 'var(--red)', played: 'var(--green)',
}
export const STATUS_BG: Record<string, string> = {
  playing: 'var(--cyan-bg)', upcoming: 'var(--amber-bg)', backlog: 'var(--red-bg)', played: 'var(--green-bg)',
}

// Coerces a possibly-string (Postgres numeric columns serialize as strings)
// or corrupted rating value into a clean finite number, or null.
export function cleanRating(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Up-to-two-letter initials for avatar fallbacks
export function initials(name?: string | null): string {
  return (name || '?')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?'
}

// Returns a normalised http(s) URL, or null if the input isn't a safe web URL.
// Guards against javascript:/data: and other non-web schemes for user-supplied
// avatar/banner URLs.
export function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let u: URL
  try { u = new URL(raw) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  return u.href
}

// Same as safeUrl, but additionally encodes the handful of characters that could
// break out of a CSS `url('…')` context (defence-in-depth against CSS injection
// via user-controlled image URLs). Returns null when the URL isn't usable.
export function cssUrl(raw: string | null | undefined): string | null {
  const safe = safeUrl(raw)
  if (!safe) return null
  return safe.replace(/["'()\\\n\r]/g, encodeURIComponent)
}

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
  if (g.status === 'backlog') return 'pill pill-red'
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
