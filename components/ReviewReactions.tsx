'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReactionBar, { type Reaction } from './ReactionBar'

interface Counts {
  like: number
  dislike: number
  mine: Reaction | null
}

/**
 * Self-contained like/dislike for a single review, for use inside server-rendered
 * pages (e.g. the game page) where there's no parent managing reaction state.
 * The reviews feed uses ReactionBar directly with its own batched loading.
 */
export default function ReviewReactions({ reviewId }: { reviewId: string }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [counts, setCounts] = useState<Counts>({ like: 0, dislike: 0, mine: null })

  const load = useCallback(async (uid: string | null) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('review_reactions')
      .select('reaction, user_id')
      .eq('review_id', reviewId)
    let like = 0, dislike = 0
    let mine: Reaction | null = null
    for (const r of (data || []) as { reaction: Reaction; user_id: string }[]) {
      if (r.reaction === 'like') like++
      else dislike++
      if (uid && r.user_id === uid) mine = r.reaction
    }
    setCounts({ like, dislike, mine })
  }, [reviewId])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const uid = user?.id ?? null
      setUserId(uid)
      load(uid)
    })
  }, [load])

  async function react(reaction: Reaction) {
    if (!userId) return
    const supabase = createClient()
    const prev = counts
    const removing = counts.mine === reaction

    setCounts(c => {
      const next = { ...c }
      if (next.mine === 'like') next.like--
      if (next.mine === 'dislike') next.dislike--
      if (removing) next.mine = null
      else { next.mine = reaction; next[reaction]++ }
      return next
    })

    const { error } = removing
      ? await supabase.from('review_reactions').delete().eq('user_id', userId).eq('review_id', reviewId)
      : await supabase.from('review_reactions').upsert(
          { user_id: userId, review_id: reviewId, reaction },
          { onConflict: 'user_id,review_id' }
        )

    if (error) setCounts(prev)
  }

  return (
    <ReactionBar
      like={counts.like}
      dislike={counts.dislike}
      mine={counts.mine}
      onReact={react}
      disabled={!userId}
    />
  )
}
