'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { timeAgo, initials } from '@/lib/utils'
import FollowButton from './FollowButton'

interface NotifRow {
  id: string
  actor_id: string
  type: string
  read: boolean
  created_at: string
  actor: { username: string; display_name: string | null; avatar_url: string | null } | null
  game: { id: number; title: string; cover_url: string | null; slug: string } | null
}

interface Props {
  onViewProfile?: (profileId: string) => void
}

export default function NotificationBell({ onViewProfile }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<NotifRow[]>([])
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ bottom: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = items.filter(n => !n.read).length

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      load(user.id)
    })
  }, [])

  async function load(uid: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('id, actor_id, type, read, created_at, actor:profiles!actor_id(username, display_name, avatar_url), game:games!game_id(id, title, cover_url, slug)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems((data || []) as unknown as NotifRow[])
  }

  async function markRead() {
    if (!userId) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', userId).eq('read', false)
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  function toggle() {
    if (!open) {
      markRead()
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect()
        setDropPos({ bottom: window.innerHeight - r.top + 8, left: r.left })
      }
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!userId) return null

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="side-btn"
        aria-label="Notifications"
        style={{ position: 'relative' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        Notifications
        {unread > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'var(--red)',
            color: '#fff',
            borderRadius: 10,
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            minWidth: 18,
            textAlign: 'center',
            lineHeight: '16px',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            bottom: dropPos.bottom,
            left: dropPos.left,
            width: 320,
            maxHeight: 400,
            overflowY: 'auto',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 32px #00000050',
            zIndex: 9999,
          }}
        >
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
          }}>
            Notifications
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              No notifications yet.
            </div>
          ) : items.map(n => {
            const rowStyle = {
              padding: '12px 16px',
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              background: n.read ? 'transparent' : 'color-mix(in srgb, var(--accent) 8%, transparent)',
            }

            if (n.type === 'game_release' && n.game) {
              return (
                <div key={n.id} style={rowStyle}>
                  <a href={`/game/${n.game.slug}`} style={{ textDecoration: 'none', flexShrink: 0 }} onClick={() => setOpen(false)}>
                    {n.game.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.game.cover_url} alt="" style={{ width: 28, height: 38, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                    ) : (
                      <div style={{ width: 28, height: 38, borderRadius: 4, background: 'var(--bg3)' }} />
                    )}
                  </a>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                      <a href={`/game/${n.game.slug}`} onClick={() => setOpen(false)} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                        {n.game.title}
                      </a>
                      {' '}is out now!
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              )
            }

            const a = n.actor
            if (!a) return null

            return (
              <div key={n.id} style={rowStyle}>
                <a href={`/u/${a.username}`} onClick={e => { if (onViewProfile) { e.preventDefault(); setOpen(false); onViewProfile(n.actor_id) } }} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar_url} alt={a.display_name || a.username} />
                    ) : initials(a.display_name || a.username)}
                  </div>
                </a>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                    <a href={`/u/${a.username}`} onClick={e => { if (onViewProfile) { e.preventDefault(); setOpen(false); onViewProfile(n.actor_id) } }} style={{ fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                      {a.display_name || a.username}
                    </a>
                    {' '}started following you
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                <FollowButton profileId={n.actor_id} />
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
