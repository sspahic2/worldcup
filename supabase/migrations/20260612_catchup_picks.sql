-- Catch-up picks for late joiners: anyone joining a pool after matches have
-- finished gets a random WINNING team auto-assigned for each stage that
-- already has results (one team per stage, no team reused across stages).
-- Matches that haven't been played yet are never auto-picked.
--
-- Two entry points share the same per-member logic:
--   1. Trigger on pool_members insert (join time).
--   2. backfill_catchup_picks(), called by the resolve cron, which covers
--      members who joined mid-match (their join-time run saw no finished
--      matches yet) — they get backfilled once the match resolves.

create or replace function public.assign_catchup_picks_for_member(member_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  st text;
  pick_row record;
  assigned integer := 0;
begin
  for st in
    select mc.stage
    from public.match_cache mc
    where mc.status = 'FINISHED' and mc.winner in ('HOME_TEAM', 'AWAY_TEAM')
    group by mc.stage
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

    -- Random winner from this stage's decided matches, excluding teams the
    -- member already used (no-repeat rule).
    select
      case mc.winner when 'HOME_TEAM' then mc.home_team_tla else mc.away_team_tla end as team_code,
      mc.fd_match_id
    into pick_row
    from public.match_cache mc
    where mc.stage = st
      and mc.status = 'FINISHED'
      and mc.winner in ('HOME_TEAM', 'AWAY_TEAM')
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

create or replace function public.assign_catchup_picks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assign_catchup_picks_for_member(new.id);
  return new;
end;
$$;

drop trigger if exists trg_assign_catchup_picks on public.pool_members;
create trigger trg_assign_catchup_picks
  after insert on public.pool_members
  for each row execute function public.assign_catchup_picks();

-- Cron-driven safety net: backfill every active member who is missing a pick
-- for an already-decided stage (e.g. joined while the match was in play).
create or replace function public.backfill_catchup_picks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  total integer := 0;
begin
  for m in
    select pm.id from public.pool_members pm where pm.status in ('alive', 'redemption')
  loop
    total := total + public.assign_catchup_picks_for_member(m.id);
  end loop;
  return total;
end;
$$;

revoke execute on function
  public.assign_catchup_picks_for_member(uuid),
  public.backfill_catchup_picks()
from public, anon, authenticated;
