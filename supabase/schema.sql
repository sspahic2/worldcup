-- Survive — World Cup 2026 Survivor Pools
-- Supabase Database Schema

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Users (extends Supabase auth.users) ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  role text not null default 'player' check (role in ('admin','pool_admin','player','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup AND auto-join the global pool
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  insert into public.pool_members (pool_id, user_id)
  values ('00000000-0000-0000-0000-000000000001', new.id)
  on conflict (pool_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Pools ───────────────────────────────────────────────────────
create type pool_status as enum ('open', 'active', 'completed', 'cancelled');

create table public.pools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  group_key char(1) check (group_key in ('A','B','C','D','E','F','G','H','I','J','K','L')),
  buy_in integer not null default 100 check (buy_in > 0),
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 8)),
  status pool_status not null default 'open',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pools enable row level security;

create policy "Authenticated users can create pools"
  on public.pools for insert with check (auth.uid() = created_by);

create policy "Pool creator can update"
  on public.pools for update using (auth.uid() = created_by);

-- ── Pool Members ────────────────────────────────────────────────
create type member_status as enum ('alive', 'redemption', 'eliminated', 'won');

create table public.pool_members (
  id uuid primary key default uuid_generate_v4(),
  pool_id uuid not null references public.pools(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  status member_status not null default 'alive',
  eliminated_at text, -- stage where eliminated e.g. 'MD3'
  joined_at timestamptz not null default now(),
  unique(pool_id, user_id)
);

alter table public.pool_members enable row level security;

-- Helper: bypass RLS recursion when checking pool membership
create or replace function public.is_pool_member(_pool_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from public.pool_members
    where pool_id = _pool_id and user_id = _user_id
  );
$$;

create policy "Users see their own membership"
  on public.pool_members for select using (user_id = auth.uid());

create policy "Members see co-members of their pools"
  on public.pool_members for select using (public.is_pool_member(pool_id, auth.uid()));

create policy "Users can join pools"
  on public.pool_members for insert with check (auth.uid() = user_id);

create policy "Pools are viewable by members"
  on public.pools for select using (
    exists (
      select 1 from public.pool_members
      where pool_members.pool_id = pools.id
      and pool_members.user_id = auth.uid()
    )
    or pools.status = 'open'
  );

-- ── Picks ───────────────────────────────────────────────────────
create type pick_result as enum ('pending', 'won', 'lost');

create table public.picks (
  id uuid primary key default uuid_generate_v4(),
  pool_member_id uuid not null references public.pool_members(id) on delete cascade,
  stage text not null check (stage in ('MD1','MD2','MD3','R32','R16','QF','SF','F')),
  team_code text not null,
  fd_match_id integer, -- football-data.org match ID
  result pick_result not null default 'pending',
  locked_at timestamptz not null default now(),
  unique(pool_member_id, stage)
);

alter table public.picks enable row level security;

create policy "Members can view picks in their pools"
  on public.picks for select using (
    exists (
      select 1 from public.pool_members pm
      join public.pool_members pm2 on pm.pool_id = pm2.pool_id
      where pm2.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
  );

create policy "Members can insert their own picks"
  on public.picks for insert with check (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
  );

-- ── Match Cache (from football-data.org) ────────────────────────
-- Denormalized cache of match data for quick reads without hitting the API
create table public.match_cache (
  fd_match_id integer primary key,
  group_key char(1),
  stage text not null,
  matchday integer,
  home_team_tla text,
  away_team_tla text,
  home_team_name text,
  away_team_name text,
  home_team_crest text,
  away_team_crest text,
  status text not null default 'TIMED',
  utc_date timestamptz not null,
  score_home integer,
  score_away integer,
  winner text, -- 'HOME_TEAM', 'AWAY_TEAM', 'DRAW', null
  venue text,
  last_synced_at timestamptz not null default now()
);

alter table public.match_cache enable row level security;

create policy "Match cache is publicly readable"
  on public.match_cache for select using (true);

-- ── Views ───────────────────────────────────────────────────────

-- Pool summary view
create or replace view public.pool_summary as
select
  p.id as pool_id,
  p.name,
  p.group_key,
  p.buy_in,
  p.invite_code,
  p.status as pool_status,
  count(pm.id) as total_players,
  count(pm.id) filter (where pm.status = 'alive') as alive_count,
  count(pm.id) filter (where pm.status = 'redemption') as redemption_count,
  count(pm.id) filter (where pm.status = 'eliminated') as eliminated_count,
  count(pm.id) filter (where pm.status = 'won') as won_count,
  count(pm.id) * p.buy_in as pot
from public.pools p
left join public.pool_members pm on pm.pool_id = p.id
group by p.id;

-- ── Indexes ─────────────────────────────────────────────────────
create index idx_pool_members_pool_id on public.pool_members(pool_id);
create index idx_pool_members_user_id on public.pool_members(user_id);
create index idx_picks_pool_member_id on public.picks(pool_member_id);
create index idx_picks_stage on public.picks(stage);
create index idx_pools_invite_code on public.pools(invite_code);
create index idx_pools_group_key on public.pools(group_key);
create index idx_match_cache_group on public.match_cache(group_key);
create index idx_match_cache_status on public.match_cache(status);

-- ── Updated_at trigger ──────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger pools_updated_at before update on public.pools
  for each row execute procedure public.update_updated_at();

-- ── Seed: the single global pool ────────────────────────────────
-- All authenticated users are auto-joined to this pool via handle_new_user.
insert into public.pools (id, name, group_key, buy_in, invite_code, status, created_by)
values (
  '00000000-0000-0000-0000-000000000001',
  'World Cup 2026 Survivor',
  null,
  100,
  'WC2026',
  'active',
  null
)
on conflict (id) do nothing;

-- ── Realtime replication ────────────────────────────────────────
alter publication supabase_realtime add table public.match_cache;
alter publication supabase_realtime add table public.pool_members;
alter publication supabase_realtime add table public.picks;

alter table public.match_cache replica identity full;
alter table public.pool_members replica identity full;
alter table public.picks replica identity full;
