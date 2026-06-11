-- Picks: enforce the kickoff time lock at the RLS layer.
--
-- The anon key is public, so a PostgREST client could previously insert,
-- update or delete a pick mid-match — only ownership and result = 'pending'
-- were checked. Every user-level write on picks now also requires the pick
-- to reference a cached match whose kickoff is more than 60 minutes away.
--
-- NOTE: the 60-minute interval must match LOCK_BEFORE_KICKOFF_MINUTES in
-- src/lib/picks/lock-rules.ts.
--
-- Result resolution (pending → won/lost) runs through the service-role
-- client, which bypasses RLS entirely and is unaffected.
--
-- Safe to re-run: drops the policies first if they already exist.

drop policy if exists "Members can insert their own picks" on public.picks;
create policy "Members can insert their own picks"
  on public.picks for insert with check (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.fd_match_id is not null
    and exists (
      select 1 from public.match_cache mc
      where mc.fd_match_id = picks.fd_match_id
      and now() < mc.utc_date - interval '60 minutes'
    )
  );

drop policy if exists "Members can update their own pending picks" on public.picks;
create policy "Members can update their own pending picks"
  on public.picks for update using (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.result = 'pending'
    and picks.fd_match_id is not null
    and exists (
      select 1 from public.match_cache mc
      where mc.fd_match_id = picks.fd_match_id
      and now() < mc.utc_date - interval '60 minutes'
    )
  )
  with check (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.result = 'pending'
    and picks.fd_match_id is not null
    and exists (
      select 1 from public.match_cache mc
      where mc.fd_match_id = picks.fd_match_id
      and now() < mc.utc_date - interval '60 minutes'
    )
  );

drop policy if exists "Members can delete their own pending picks" on public.picks;
create policy "Members can delete their own pending picks"
  on public.picks for delete using (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.result = 'pending'
    and picks.fd_match_id is not null
    and exists (
      select 1 from public.match_cache mc
      where mc.fd_match_id = picks.fd_match_id
      and now() < mc.utc_date - interval '60 minutes'
    )
  );
