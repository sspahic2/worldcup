-- Per-group survivor tracks.
--
-- Game model (decided 2026-06-12):
--   * Group stage (MD1-MD3): every member plays ALL 12 groups. Each group is
--     its own pool ("track") with its own pot, picks, and per-track
--     elimination. A losing pick only kills that track.
--   * Knockouts (R32+): groups dissolve; the original global pool carries a
--     single pick per round.
--   * Members with no pick for a fully-finished group stage are eliminated in
--     that track (auto-loss).
--
-- The schema already models this: pools.group_key + pool_members + picks.

-- 1. The 12 group pools (deterministic ids: ...002201 = A .. ...00220c = L).
insert into public.pools (id, name, group_key, buy_in, invite_code, status, created_by)
select
  ('22222222-0000-0000-0000-0000000022' || lpad(to_hex(gs.i), 2, '0'))::uuid,
  'Group ' || chr(64 + gs.i) || ' Survivor',
  chr(64 + gs.i),
  25,
  'WC26GR' || chr(64 + gs.i),
  'active',
  null
from generate_series(1, 12) as gs(i)
on conflict (id) do nothing;

-- 2. Signup: join the global (knockout) pool AND all 12 group pools.
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
  select p.id, new.id
  from public.pools p
  where p.id = '00000000-0000-0000-0000-000000000001' or p.group_key is not null
  on conflict (pool_id, user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3. Backfill: existing members join every group pool.
insert into public.pool_members (pool_id, user_id)
select gp.id, gm.user_id
from public.pool_members gm
join public.pools gp on gp.group_key is not null
where gm.pool_id = '00000000-0000-0000-0000-000000000001'
on conflict (pool_id, user_id) do nothing;

-- 4. Move group-stage picks (MD1-MD3) from global memberships to the matching
--    group-pool membership. Knockout picks stay on the global membership.
--    Conflict-safe: skip any pick whose target group membership already holds a
--    pick for that stage (e.g. a catch-up pick) — the unique (pool_member_id,
--    stage) constraint would otherwise abort the whole migration.
update public.picks p
set pool_member_id = grp_member.id
from public.pool_members gm
join public.pools g on g.id = gm.pool_id and g.group_key is null
join public.match_cache mc on true
join public.pools gp on gp.group_key = mc.group_key
join public.pool_members grp_member
  on grp_member.pool_id = gp.id and grp_member.user_id = gm.user_id
where p.pool_member_id = gm.id
  and p.fd_match_id = mc.fd_match_id
  and p.stage in ('MD1', 'MD2', 'MD3')
  and mc.group_key is not null
  and not exists (
    select 1 from public.picks existing
    where existing.pool_member_id = grp_member.id
      and existing.stage = p.stage
  );

-- 5. Per-track member status from already-resolved picks (e.g. MD1 group A).
update public.pool_members pm
set status = 'eliminated', eliminated_at = lost.stage
from (
  select p.pool_member_id, p.stage
  from public.picks p
  where p.result = 'lost'
) lost
join public.pools gp on gp.group_key is not null
where pm.id = lost.pool_member_id and pm.pool_id = gp.id and pm.status = 'alive';

-- 6. Catch-up picks, group-aware: group pools only assign that group's
--    decided matches (MD1-MD3); the global pool only assigns knockout stages.
create or replace function public.assign_catchup_picks_for_member(member_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  member_group char(1);
  member_joined timestamptz;
  st text;
  pick_row record;
  assigned integer := 0;
begin
  select p.group_key, pm.joined_at into member_group, member_joined
  from public.pool_members pm
  join public.pools p on p.id = pm.pool_id
  where pm.id = member_id;

  -- Catch-up only covers stages whose picking window CLOSED before the member
  -- joined (first kickoff minus the 60-min lock). Members who were around and
  -- simply didn't pick fall to eliminate_missing_picks() instead.
  for st in
    select mc.stage
    from public.match_cache mc
    where mc.status = 'FINISHED' and mc.winner in ('HOME_TEAM', 'AWAY_TEAM')
      and (
        (member_group is not null and mc.group_key = member_group and mc.stage in ('MD1','MD2','MD3'))
        or
        (member_group is null and mc.stage not in ('MD1','MD2','MD3'))
      )
    group by mc.stage
    having member_joined > min(mc.utc_date) - interval '60 minutes'
    order by array_position(
      array['MD1','MD2','MD3','R32','R16','QF','SF','F'], mc.stage
    )
  loop
    if exists (
      select 1 from public.picks p
      where p.pool_member_id = member_id and p.stage = st
    ) then
      continue;
    end if;

    select
      case mc.winner when 'HOME_TEAM' then mc.home_team_tla else mc.away_team_tla end as team_code,
      mc.fd_match_id
    into pick_row
    from public.match_cache mc
    where mc.stage = st
      and mc.status = 'FINISHED'
      and mc.winner in ('HOME_TEAM', 'AWAY_TEAM')
      and (member_group is null or mc.group_key = member_group)
      and case mc.winner when 'HOME_TEAM' then mc.home_team_tla else mc.away_team_tla end
        not in (select p.team_code from public.picks p where p.pool_member_id = member_id)
    order by random()
    limit 1;

    if pick_row.team_code is not null then
      insert into public.picks (pool_member_id, stage, team_code, fd_match_id, result)
      values (member_id, st, pick_row.team_code, pick_row.fd_match_id, 'won')
      on conflict (pool_member_id, stage) do nothing;
      assigned := assigned + 1;
    end if;
  end loop;

  return assigned;
end;
$$;

-- 7. Auto-loss: once a group's stage is fully finished, alive members of that
--    group pool with no pick for it are eliminated in that track.
create or replace function public.eliminate_missing_picks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  eliminated integer := 0;
  r record;
begin
  for r in
    select pm.id, done.stage
    from public.pools gp
    join public.pool_members pm on pm.pool_id = gp.id and pm.status = 'alive'
    join lateral (
      select mc.stage
      from public.match_cache mc
      where mc.group_key = gp.group_key and mc.stage in ('MD1','MD2','MD3')
      group by mc.stage
      having bool_and(mc.status = 'FINISHED')
    ) done on true
    where gp.group_key is not null
      and not exists (
        select 1 from public.picks p
        where p.pool_member_id = pm.id and p.stage = done.stage
      )
  loop
    update public.pool_members
    set status = 'eliminated', eliminated_at = r.stage
    where id = r.id and status = 'alive';
    eliminated := eliminated + 1;
  end loop;
  return eliminated;
end;
$$;

revoke execute on function public.eliminate_missing_picks() from public, anon, authenticated;
