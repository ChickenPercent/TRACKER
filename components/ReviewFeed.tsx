'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StarRating from './StarRating'
import { timeAgo, initials } from '@/lib/utils'
import { ListSkeleton } from './Skeletons'
import type { GameEntry } from '@/types'

interface ReviewRow {
  id: string
  user_id: string
  status: string
  rating: number | null
  review: string | null
  created_at: string
  updated_at: string
  games: { id: number; title: string; cover_url: string | null; slug: string } | null
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
}

type Reaction = 'like' | 'dislike'

interface Counts {
  like: number
  dislike: number
  mine: Reaction | null
}

interface Props {
  userId: string
  onViewGame?: (game: GameEntry) => void
  onViewProfile?: (profileId: string) => void
}

export default function ReviewFeed({ userId, onViewGame, onViewProfile }: Props) {
  const [items, setItems] = useState<ReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [followCount, setFollowCount] = useState(0)
  const [reactions, setReactions] = useState<Record<string, Counts>>({})

  const loadReactions = useCallback(async (reviewIds: string[]) => {
    if (reviewIds.length === 0) return
    const supabase = createClient()
    const { data } = await supabase
      .from('review_reactions')
      .select('review_id, reaction, user_id')
      .in('review_id', reviewIds)

    const map: Record<string, Counts> = {}
    for (const id of reviewIds) map[id] = { like: 0, dislike: 0, mine: null }
    for (const r of (data || []) as { review_id: string; reaction: Reaction; user_id: string }[]) {
      const c = map[r.review_id]
      if (!c) continue
      c[r.reaction]++
      if (r.user_id === userId) c.mine = r.reaction
    }
    setReactions(map)
  }, [userId])

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
        .select('id, user_id, status, rating, review, created_at, updated_at, games(id, title, cover_url, slug), profiles(username, display_name, avatar_url)')
        .in('user_id', ids)
        .not('review', 'is', null)
        .neq('review', '')
        .order('updated_at', { ascending: false })
        .limit(60)

      const rows = (data || []) as unknown as ReviewRow[]
      setItems(rows)
      setLoading(false)
      loadReactions(rows.map(r => r.id))
    }
    load()
  }, [userId, loadReactions])

  async function react(reviewId: string, reaction: Reaction) {
    const supabase = createClient()
    const current = reactions[reviewId] || { like: 0, dislike: 0, mine: null }
    const removing = current.mine === reaction

    // Optimistic update
    setReactions(prev => {
      const c = { ...(prev[reviewId] || { like: 0, dislike: 0, mine: null }) }
      if (c.mine === 'like') c.like--
      if (c.mine === 'dislike') c.dislike--
      if (removing) {
        c.mine = null
      } else {
        c.mine = reaction
        c[reaction]++
      }
      return { ...prev, [reviewId]: c }
    })

    if (removing) {
      await supabase.from('review_reactions').delete().eq('user_id', userId).eq('review_id', reviewId)
    } else {
      await supabase.from('review_reactions').upsert(
        { user_id: userId, review_id: reviewId, reaction },
        { onConflict: 'user_id,review_id' }
      )
    }
  }

  if (loading) {
    return <ListSkeleton count={4} />
  }

  if (followCount === 0) {
    return (
      <div className="empty" style={{ paddingTop: 60 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✍️</div>
        <div style={{ marginBottom: 8 }}>You&apos;re not following anyone yet.</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Follow other players to read their reviews here.</div>
      </div>
    )
  }

  if (items.length === 0) {
    return <div className="empty">No reviews yet from people you follow.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
      {items.map(item => {
        const p = item.profiles
        const g = item.games
        if (!p || !g) return null

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
          note: '',
          order: 0,
          rating: item.rating,
          review: item.review,
          summary: null,
        } : null

        const c = reactions[item.id] || { like: 0, dislike: 0, mine: null }

        return (
          <div key={item.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>

            {/* Cover poster (left) */}
            <div
              style={{ width: 92, height: 130, flexShrink: 0, borderRadius: 8, overflow: 'hidden', position: 'relative', background: 'var(--bg3)', border: '1px solid var(--border)', cursor: onViewGame ? 'pointer' : 'default' }}
              onClick={() => { if (onViewGame && gameEntry) onViewGame(gameEntry) }}
            >
              {g.cover_url ? (
                <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${g.cover_url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: '#ffffff33' }}>
                  {g.title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
              )}
            </div>

            {/* Content (right) */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Header: user + game + time */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a href={`/u/${p.username}`} onClick={e => { if (onViewProfile) { e.preventDefault(); onViewProfile(item.user_id) } }} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {p.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatar_url} alt={p.display_name || p.username} />
                    ) : initials(p.display_name || p.username)}
                  </div>
                </a>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <a href={`/u/${p.username}`} onClick={e => { if (onViewProfile) { e.preventDefault(); onViewProfile(item.user_id) } }} style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                    {p.display_name || p.username}
                  </a>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>reviewed</span>
                  <span
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: onViewGame ? 'pointer' : 'default' }}
                    onClick={() => { if (onViewGame && gameEntry) onViewGame(gameEntry) }}
                    className={onViewGame ? 'card-title-link' : ''}
                  >
                    {g.title}
                  </span>
                </div>

                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                  {timeAgo(item.updated_at)}
                </span>
              </div>

              {item.rating !== null && (
                <div style={{ marginTop: 8 }}><StarRating value={item.rating} size={14} /></div>
              )}

              {/* Review body */}
              <p style={{ fontSize: 14, color: 'var(--text)', margin: '10px 0 0', lineHeight: 1.6 }}>
                {item.review}
              </p>

              {/* Footer: reactions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => react(item.id, 'like')}
                aria-label="Like review"
                aria-pressed={c.mine === 'like'}
                style={reactBtnStyle(c.mine === 'like', 'var(--green)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={c.mine === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>
                </svg>
                {c.like > 0 && <span>{c.like}</span>}
              </button>

              <button
                onClick={() => react(item.id, 'dislike')}
                aria-label="Dislike review"
                aria-pressed={c.mine === 'dislike'}
                style={reactBtnStyle(c.mine === 'dislike', 'var(--red)')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill={c.mine === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>
                </svg>
                {c.dislike > 0 && <span>{c.dislike}</span>}
              </button>
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}

function reactBtnStyle(active: boolean, activeColor: string): React.CSSProperties {
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
    cursor: 'pointer',
    transition: 'color .15s, background .15s, border-color .15s',
  }
}
