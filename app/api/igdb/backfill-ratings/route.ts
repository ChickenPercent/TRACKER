import { NextResponse } from 'next/server'
import { getRatingsByIds } from '@/lib/igdb'
import { cleanRating } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pull every IGDB-sourced game and decide in JS which need (re)filling. This
  // catches both missing ratings and corrupted non-finite values ('NaN') without
  // relying on a PostgREST NaN filter, which isn't reliably expressible.
  const { data: games, error } = await supabase
    .from('games')
    .select('id, igdb_rating')
    .gt('id', 0)

  if (error) return NextResponse.json({ error: 'Failed to read games' }, { status: 500 })

  const needsFill = (games || []).filter(g => cleanRating(g.igdb_rating) === null)
  if (needsFill.length === 0) return NextResponse.json({ updated: 0, checked: 0 })

  const ids = needsFill.map(g => g.id as number)

  try {
    const ratings = await getRatingsByIds(ids)
    let updated = 0
    for (const [id, rating] of ratings) {
      // Write through even when rating is null — that clears any corrupted
      // 'NaN' value sitting in this row instead of leaving it broken.
      const { error: updErr } = await supabase.from('games').update({ igdb_rating: rating }).eq('id', id)
      if (!updErr && rating !== null) updated++
    }
    return NextResponse.json({ updated, checked: ids.length })
  } catch (err) {
    console.error('Backfill ratings error:', err)
    return NextResponse.json({ error: 'IGDB request failed' }, { status: 500 })
  }
}
