'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profileId: string
}

export default function FollowButton({ profileId }: Props) {
  const [userId, setUserId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', profileId)
        .maybeSingle()
        .then(({ data }) => {
          setFollowing(!!data)
          setLoading(false)
        })
    })
  }, [profileId])

  async function toggle() {
    if (!userId || saving) return
    setSaving(true)
    const supabase = createClient()
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', userId).eq('following_id', profileId)
      await supabase.from('notifications').delete()
        .eq('actor_id', userId).eq('user_id', profileId).eq('type', 'follow')
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: profileId })
      await supabase.from('notifications').insert({ actor_id: userId, user_id: profileId, type: 'follow' })
      setFollowing(true)
    }
    setSaving(false)
  }

  if (loading || !userId || userId === profileId) return null

  return (
    <button
      onClick={toggle}
      disabled={saving}
      style={{
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 600,
        padding: '8px 20px',
        borderRadius: 'var(--radius-sm)',
        border: following ? '1px solid var(--border2)' : 'none',
        background: following ? 'transparent' : 'var(--accent)',
        color: following ? 'var(--muted)' : '#fff',
        cursor: saving ? 'default' : 'pointer',
        transition: 'all .15s',
        opacity: saving ? 0.6 : 1,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (saving) return
        const el = e.currentTarget
        if (following) { el.style.borderColor = 'var(--red)'; el.style.color = 'var(--red)' }
        else el.style.background = 'var(--accent2)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (following) { el.style.borderColor = 'var(--border2)'; el.style.color = 'var(--muted)' }
        else el.style.background = 'var(--accent)'
      }}
    >
      {saving ? '…' : following ? 'Following' : 'Follow'}
    </button>
  )
}
