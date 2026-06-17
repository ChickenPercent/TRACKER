# TRACKER

A social game tracker — think "Letterboxd for games". Track upcoming releases and
your backlog, rate and review what you've played, follow other users, and discover
players and games.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind v4**,
**Supabase** (Auth + Postgres + RLS), and the **IGDB** API.

## Features

- Track games across four statuses: upcoming, backlog, playing, played
- Drag-to-reorder backlog; released games auto-migrate from Upcoming to Backlog
- Half-star ratings and written reviews — rate right when you add a played game
- IGDB-powered add flow (cover art, platforms, release dates, summaries) plus the
  IGDB critic score on game pages
- **Discover** tab to search both players and the full IGDB game catalog
- **Reviews** feed of reviews from people you follow, with like / dislike reactions
- Public profiles at `/u/[username]` with a Top 5 Games picker and a stats panel
  (rating distribution, top platforms, played-by-year), plus public game pages at
  `/game/[slug]`
- Follow system with release + follow notifications
- Google / Discord OAuth and email-password auth

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `IGDB_CLIENT_ID` | [Twitch dev console](https://dev.twitch.tv/console/apps) |
| `IGDB_CLIENT_SECRET` | Twitch dev console |

IGDB is accessed through Twitch; create a Twitch application to get the client id
and secret. These are server-side only (no `NEXT_PUBLIC_` prefix).

### 3. Database

In the Supabase SQL editor, run [`supabase/schema.sql`](supabase/schema.sql). It
creates all tables (`profiles`, `games`, `user_games`, `follows`, `notifications`,
`review_reactions`), their indexes, the new-user trigger, and the Row Level
Security policies the app relies on. The schema file is the single source of truth
— keep it in sync with any manual changes you make in Supabase.

For OAuth, enable the Google and Discord providers in Supabase → Authentication →
Providers, and add `<your-url>/auth/callback` as a redirect URL.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |

## Project layout

```
app/
  (app)/        Main tracker (auth-gated)
  (auth)/       Login / signup
  u/[username]/ Public profile
  game/[slug]/  Public game page
  api/igdb/     IGDB search + critic-score backfill (auth-gated)
  auth/callback Supabase OAuth callback
components/      UI components
lib/            Supabase clients, IGDB client, shared helpers
supabase/       schema.sql
proxy.ts        Auth guard (Next.js 16 renamed middleware → proxy)
```

## Notes

- Next.js 16 renames `middleware` to `proxy` — the auth guard lives in
  [`proxy.ts`](proxy.ts).
- IGDB games are shared rows keyed by their IGDB id; manually-added games use
  negative ids so per-user edits don't affect everyone.
