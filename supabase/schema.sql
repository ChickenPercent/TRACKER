-- TRACKER database schema — run this in your Supabase SQL editor on a fresh project.
-- This is the single source of truth for the schema the app expects.

-- ─────────────────────────────────────────────────────────────────────────────
-- Profiles (extends Supabase auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  banner_url text,
  bio text,
  top_games bigint[] default '{}',
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- Games master list (IGDB data cached here; shared across all users)
-- ─────────────────────────────────────────────────────────────────────────────
create table games (
  id bigint primary key,           -- IGDB game id (negative ids = manually added)
  slug text unique not null,
  title text not null,
  cover_url text,
  release_date date,
  platforms text[],
  igdb_rating numeric(4,1),
  summary text,
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Per-user game entries (the core tracker)
-- ─────────────────────────────────────────────────────────────────────────────
create table user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_id bigint references games(id),
  status text check (status in ('upcoming','backlog','playing','played')),
  tbd boolean default false,
  custom_date date,
  note text,
  rating numeric(2,1) check (rating >= 0.5 and rating <= 5.0),
  review text,
  backlog_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, game_id)
);

create index user_games_user_id_idx on user_games(user_id);
create index user_games_game_id_idx on user_games(game_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Follows (social graph)
-- ─────────────────────────────────────────────────────────────────────────────
create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references profiles(id) on delete cascade,
  following_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

create index follows_follower_idx on follows(follower_id);
create index follows_following_idx on follows(following_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications (follower alerts + game release alerts)
-- ─────────────────────────────────────────────────────────────────────────────
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,   -- recipient
  actor_id uuid references profiles(id) on delete cascade,  -- who triggered it (= user_id for game_release)
  type text not null,
  game_id bigint references games(id) on delete cascade,    -- set for game_release notifications
  read boolean default false,
  created_at timestamptz default now()
);

create index notifications_user_id_idx on notifications(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Review reactions (like / dislike on another user's review)
-- A review is identified by the user_games row that carries the review text.
-- ─────────────────────────────────────────────────────────────────────────────
create table review_reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,         -- who reacted
  review_id uuid references user_games(id) on delete cascade,     -- the reviewed user_games row
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz default now(),
  unique(user_id, review_id)
);

create index review_reactions_review_idx on review_reactions(review_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles: world-readable, owner-writable
alter table profiles enable row level security;
create policy "public read"  on profiles for select using (true);
create policy "own write"    on profiles for all using (auth.uid() = id);

-- Games: world-readable, any authenticated user can add/update cached entries
alter table games enable row level security;
create policy "public read"          on games for select using (true);
create policy "authenticated insert" on games for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on games for update using (auth.role() = 'authenticated');

-- User games: world-readable (public profiles, game pages, feeds), owner-writable
alter table user_games enable row level security;
create policy "public read"  on user_games for select using (true);
create policy "own insert"   on user_games for insert with check (auth.uid() = user_id);
create policy "own update"   on user_games for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete"   on user_games for delete using (auth.uid() = user_id);

-- Follows: world-readable (follower/following counts), users manage their own follows
alter table follows enable row level security;
create policy "public read"  on follows for select using (true);
create policy "own follow"   on follows for insert with check (auth.uid() = follower_id);
create policy "own unfollow" on follows for delete using (auth.uid() = follower_id);

-- Notifications: readable/updatable by the recipient; created/removed by the actor
alter table notifications enable row level security;
create policy "recipient read"   on notifications for select using (auth.uid() = user_id);
create policy "recipient update" on notifications for update using (auth.uid() = user_id);
create policy "actor insert"     on notifications for insert with check (auth.uid() = actor_id);
create policy "actor delete"     on notifications for delete using (auth.uid() = actor_id);

-- Review reactions: world-readable (aggregate counts), users manage their own reactions
alter table review_reactions enable row level security;
create policy "public read"  on review_reactions for select using (true);
create policy "own insert"   on review_reactions for insert with check (auth.uid() = user_id);
create policy "own update"   on review_reactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own delete"   on review_reactions for delete using (auth.uid() = user_id);
