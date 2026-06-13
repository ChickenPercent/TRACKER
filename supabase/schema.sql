-- Run this in your Supabase SQL editor

-- Users (extended from Supabase auth.users)
create table profiles (
  id uuid references auth.users primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
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

-- Games master list (IGDB data cached here)
create table games (
  id bigint primary key,           -- IGDB game id (use negative for manually-added)
  slug text unique not null,
  title text not null,
  cover_url text,
  release_date date,
  platforms text[],
  igdb_rating numeric(4,1),
  summary text,
  updated_at timestamptz default now()
);

-- Per-user game entries (the core tracker)
create table user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  game_id bigint references games(id),
  status text check (status in ('upcoming','backlog','playing','played')),
  tbd boolean default false,
  custom_date date,
  note text,
  hype boolean default false,
  backlog_order integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, game_id)
);

-- RLS
alter table profiles enable row level security;
create policy "public read" on profiles for select using (true);
create policy "own write" on profiles for all using (auth.uid() = id);

alter table games enable row level security;
create policy "public read" on games for select using (true);
create policy "authenticated insert" on games for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on games for update using (auth.role() = 'authenticated');

alter table user_games enable row level security;
create policy "own rows" on user_games
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
