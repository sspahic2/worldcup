-- Knockout phase: per-survived-group lives + per-round picks (decided 2026-06-17).
--
-- Game model:
--   * Each group a player survived (track alive/redemption at group-stage end)
--     becomes one knockout "life" on their global-pool membership.
--   * Each knockout round the player picks one team per ALIVE life:
--       - R32: from that life's source-group qualifiers (the 2-3 that advanced)
--       - R16 -> Final: any team playing that round (reuse allowed, no uniqueness)
--   * A pick that loses kills that life. When all of a member's lives are dead,
--     the member is eliminated from the game.
--   * 3rd-place bonus life: a life knocked out in the SF that wins the 3rd-place
--     match, while the member has no life left in the Final, earns one bonus
--     pick of a finalist (an is_bonus life carrying into the Final).

create table if not exists public.knockout_lives (
  id uuid primary key default gen_random_uuid(),
  pool_member_id uuid not null references public.pool_members(id) on delete cascade,
  source_group_key char(1),
  status public.member_status not null default 'alive',
  eliminated_at_stage text,
  is_bonus boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pool_member_id, source_group_key)
);

create index if not exists knockout_lives_member_idx on public.knockout_lives(pool_member_id);

create table if not exists public.knockout_picks (
  id uuid primary key default gen_random_uuid(),
  life_id uuid not null references public.knockout_lives(id) on delete cascade,
  stage text not null,
  team_code text not null,
  fd_match_id integer,
  result public.pick_result not null default 'pending',
  locked_at timestamptz not null default now(),
  unique (life_id, stage)
);

create index if not exists knockout_picks_life_idx on public.knockout_picks(life_id);
create index if not exists knockout_picks_match_idx on public.knockout_picks(fd_match_id);

-- Create lives from survived group tracks: one life per (member, survived
-- group). Idempotent — safe to re-run as more groups finish.
create or replace function public.create_knockout_lives()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  created integer := 0;
  r record;
  global_member uuid;
begin
  for r in
    select gm.user_id, gp.group_key
    from public.pool_members gm
    join public.pools gp on gp.id = gm.pool_id and gp.group_key is not null
    where gm.status in ('alive', 'redemption')
  loop
    select pm.id into global_member
    from public.pool_members pm
    join public.pools p on p.id = pm.pool_id and p.group_key is null
    where pm.user_id = r.user_id
    limit 1;
    if global_member is null then continue; end if;

    insert into public.knockout_lives (pool_member_id, source_group_key)
    values (global_member, r.group_key)
    on conflict (pool_member_id, source_group_key) do nothing;
    if found then created := created + 1; end if;
  end loop;
  return created;
end;
$$;

revoke execute on function public.create_knockout_lives() from public, anon, authenticated;

-- RLS: owners read their own lives/picks; writes go through the server action
-- (admin client), which validates ownership + round rules in code.
alter table public.knockout_lives enable row level security;
alter table public.knockout_picks enable row level security;

drop policy if exists knockout_lives_owner_read on public.knockout_lives;
create policy knockout_lives_owner_read on public.knockout_lives
  for select using (
    exists (
      select 1 from public.pool_members pm
      where pm.id = knockout_lives.pool_member_id and pm.user_id = auth.uid()
    )
  );

drop policy if exists knockout_picks_owner_read on public.knockout_picks;
create policy knockout_picks_owner_read on public.knockout_picks
  for select using (
    exists (
      select 1
      from public.knockout_lives kl
      join public.pool_members pm on pm.id = kl.pool_member_id
      where kl.id = knockout_picks.life_id and pm.user_id = auth.uid()
    )
  );
