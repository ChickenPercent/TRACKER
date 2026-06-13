'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import StarRating from './StarRating'
import { timeAgo } from '@/lib/utils'
import type { GameEntry } from '@/types'

interface FeedRow {
  id: string
  user_id: string
  status: string
  rating: number | null
  review: string | null
  note: string | null
  created_at: string
  updated_at: string
  games: { id: number; title: string; cover_url: string | null; slug: string } | null
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

const STATUS_COLOR: Record<string, string> = {
  playing: 'var(--cyan)', upcoming: 'var(--amber)', backlog: 'var(--blue)', played: 'var(--green)',
}
const STATUS_BG: Record<string, string> = {
  playing: 'var(--cyan-bg)', upcoming: 'var(--amber-bg)', backlog: 'var(--blue-bg)', played: 'var(--green-bg)',
}

interface Props {
  userId: string
  onViewGame?: (game: GameEntry) => void
}

export default function FeedView({ userId, onViewGame }: Props) {
  const [items, setItems] = useState<FeedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [followCount, setFollowCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const supabase = createClient()

      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      const ids = (follows || []).map((f: { following_id: string }) => f.following_id)
      setFollowCount(ids.length)

      if (ids.length === 0) { setLoading(false); return }

      const { data } = await supabase
        .from('user_games')
        .select('id, user_id, status, rating, review, note, created_at, updated_at, games(id, title, cover_url, slug), profiles(username, display_name, avatar_url)')
        .in('user_id', ids)
        .order('updated_at', { ascending: false })
        .limit(60)

      setItems((data || []) as unknown as FeedRow[])
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) {
    return <div className="empty">Loading feed…</div>
  }

  if (followCount === 0) {
    return (
      <div className="empty" style={{ paddingTop: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
        <div style={{ marginBottom: 8 }}>You&apos;re not following anyone yet.</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Visit a user&apos;s profile and hit Follow to see their activity here.</div>
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="empty">No recent activity from people you follow.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
      {items.map(item => {
        const p = item.profiles
        const g = item.games
        if (!p || !g) return null
        const initials = (p.display_name || p.username)
          .split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
        const isNew = Math.abs(new Date(item.updated_at).getTime() - new Date(item.created_at).getTime()) < 60000

        const gameEntry: GameEntry | null = onViewGame ? {
          id: item.id,
          game_id: g.id,
          title: g.title,
          cover: g.cover_url,
          slug: g.slug,
          status: item.status as GameEntry['status'],
          tbd: false,
          date: null,
          platforms: [],
          note: item.note || '',
          order: 0,
          rating: item.rating,
          review: item.review,
          summary: null,
        } : null

        return (
          <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>

            {/* User */}
            <a href={`/u/${p.username}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <div className="sidebar-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar_url} alt={p.display_name || p.username} />
                ) : initials}
              </div>
            </a>

            {/* Cover */}
            <div
              style={{ width: 46, height: 65, flexShrink: 0, borderRadius: 6, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border)', cursor: onViewGame ? 'pointer' : 'default' }}
              onClick={() => { if (onViewGame && gameEntry) onViewGame(gameEntry) }}
            >
              {g.cover_url ? (
                <>
                  <div style={{ position: 'absolute', inset: -4, backgroundImage: `url('${g.cover_url}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(6px) brightness(.5)' }} />
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${g.cover_url}')`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, color: '#ffffff33' }}>
                  {g.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <a href={`/u/${p.username}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                  {p.display_name || p.username}
                </a>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {isNew ? 'added' : 'updated'}
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: onViewGame ? 'pointer' : 'default' }}
                  onClick={() => { if (onViewGame && gameEntry) onViewGame(gameEntry) }}
                  className={onViewGame ? 'card-title-link' : ''}
                >
                  {g.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="pill" style={{ background: STATUS_BG[item.status], color: STATUS_COLOR[item.status] }}>
                  {item.status}
                </span>
                {item.rating !== null && <StarRating value={item.rating} size={13} />}
              </div>
              {item.review && (
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0', lineHeight: 1.55, fontStyle: 'italic' }}>&ldquo;{item.review}&rdquo;</p>
              )}
            </div>

            {/* Time */}
            <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, paddingTop: 2 }}>
              {timeAgo(item.updated_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
