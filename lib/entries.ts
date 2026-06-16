import type { GameEntry, GameStatus } from '@/types'

// Transform a Supabase row (user_games joined with games) into a flat GameEntry.
// Shared by the tracker page and public profile page.
export function rowToEntry(row: Record<string, unknown>): GameEntry {
  const g = row.games as Record<string, unknown>
  return {
    id: row.id as string,
    game_id: g.id as number,
    title: g.title as string,
    date: (row.custom_date as string | null) || (g.release_date as string | null),
    platforms: (g.platforms as string[] | null) || [],
    cover: g.cover_url as string | null,
    status: row.status as GameStatus,
    tbd: row.tbd as boolean,
    note: (row.note as string) || '',
    order: (row.backlog_order as number) ?? 9999,
    rating: (row.rating as number | null) ?? null,
    review: (row.review as string | null) ?? null,
    slug: (g.slug as string) || '',
    summary: (g.summary as string | null) ?? null,
  }
}
