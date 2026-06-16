# TRACKER

A social game tracker — think "Letterboxd for games". Track upcoming releases and
your backlog, rate and review what you've played, follow other users, and browse a
public profile and activity feed.

Built with **Next.js 16** (App Router), **TypeScript**, **Tailwind v4**,
**Supabase** (Auth + Postgres + RLS), and the **IGDB** API.

## Features

- Track games across four statuses: upcoming, backlog, playing, played
- Drag-to-reorder backlog, calendar view, and stats dashboard
- Half-star ratings and written reviews
- IGDB-powered quick-add (cover art, platforms, release dates, summaries)
- Public profiles at `/u/[username]` and public game pages at `/game/[slug]`
- Follow system with an activity feed and follow notifications
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
creates all tables (`profiles`, `games`, `user_games`, `follows`,
`notifications`), the new-user trigger, and the Row Level Security policies the app
relies on. The schema file is the single source of truth — keep it in sync with any
manual changes you make in Supabase.

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
  api/igdb/     IGDB search proxy (auth-gated)
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
