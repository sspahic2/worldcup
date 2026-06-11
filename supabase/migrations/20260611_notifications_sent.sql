-- Notification ledger: one row per (user, notification type, stage) that has
-- been emailed. The email layer inserts before sending and only sends when the
-- insert created a row, so cron re-runs and concurrent triggers never
-- double-send. Stage-less notifications (welcome, winner) store stage = ''
-- so the unique constraint always applies (NULLs would never conflict).
--
-- Service-role only: RLS is enabled with no policies, so the anon/auth roles
-- can neither read nor write — only the admin client touches this table.
--
-- Safe to re-run.

create table if not exists public.notifications_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  stage text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, type, stage)
);

alter table public.notifications_sent enable row level security;

create index if not exists idx_notifications_sent_user_id
  on public.notifications_sent(user_id);
