-- Picks: allow members to change or clear their own pick while it is still
-- unresolved (result = 'pending'). Lock timing is enforced in the server
-- action layer; RLS guarantees ownership and that resolved picks are immutable
-- for users. Result resolution (pending → won/lost) runs through the
-- service-role client, which bypasses RLS entirely.
--
-- Safe to re-run: drops the policies first if they already exist.

drop policy if exists "Members can update their own pending picks" on public.picks;
create policy "Members can update their own pending picks"
  on public.picks for update using (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.result = 'pending'
  )
  with check (
    exists (
      select 1 from public.pool_members pm
      where pm.id = picks.pool_member_id
      and pm.user_id = auth.uid()
    )
    and picks.result = 'pending'
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
  );
