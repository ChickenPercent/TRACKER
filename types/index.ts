export type GameStatus = 'upcoming' | 'backlog' | 'playing' | 'played'

export interface GameEntry {
  id: string           // user_games.id
  game_id: number      // games.id (IGDB id)
  title: string
  date: string | null  // effective release date
  platforms: string[]
  cover: string | null
  status: GameStatus
  tbd: boolean
  note: string
  order: number        // backlog_order
  rating: number | null
  review: string | null
  slug: string
  summary: string | null
  igdbRating: number | null
}

export interface Profile {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export interface DbGame {
  id: number
  slug: string
  title: string
  cover_url: string | null
  release_date: string | null
  platforms: string[] | null
  igdb_rating: number | null
  summary: string | null
}

export interface DbUserGame {
  id: string
  user_id: string
  game_id: number
  status: GameStatus
  tbd: boolean
  custom_date: string | null
  note: string | null
  backlog_order: number | null
  created_at: string
  updated_at: string
}

export const THEMES: Record<string, string> = {
  violet:  '#7c6aff',
  emerald: '#3ddc84',
  amber:   '#ffb347',
  rose:    '#fb7185',
  cyan:    '#22d3ee',
}
