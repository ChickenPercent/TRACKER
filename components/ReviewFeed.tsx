'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import StarRating from './StarRating'
import { timeAgo, initials } from '@/lib/utils'
import { ListSkeleton } from './Skeletons'
import EmptyState from './EmptyState'
import ReactionBar from './ReactionBar'
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
    const prevSnapshot = reactions[reviewId] || { like: 0, dislike: 0, mine: null }
    const removing = prevSnapshot.mine === reaction

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

    const { error } = removing
      ? await supabase.from('review_reactions').delete().eq('user_id', userId).eq('review_id', reviewId)
      : await supabase.from('review_reactions').upsert(
          { user_id: userId, review_id: reviewId, reaction },
          { onConflict: 'user_id,review_id' }
        )

    // Roll back the optimistic update if the write failed, so UI matches the DB
    if (error) {
      setReactions(prev => ({ ...prev, [reviewId]: prevSnapshot }))
    }
  }

  if (loading) {
    return <ListSkeleton count={4} />
  }

  if (followCount === 0) {
    return (
      <EmptyState
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        }
        title="No reviews yet"
        description="Follow other players and their reviews will show up here, newest first."
      />
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        }
        title="No reviews yet"
        description="Nobody you follow has written a review yet. Check back once they do."
      />
    )
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
          igdbRating: null,
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
              <div style={{ marginTop: 14 }}>
                <ReactionBar
                  like={c.like}
                  dislike={c.dislike}
                  mine={c.mine}
                  onReact={r => react(item.id, r)}
                />
              </div>

            </div>
          </div>
        )
      })}
    </div>
  )
}
