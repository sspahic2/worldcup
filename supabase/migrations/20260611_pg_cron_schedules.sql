-- Schedule cron work from Supabase (pg_cron + pg_net) instead of Vercel crons,
-- which are daily-only on the Hobby plan.
--
-- Requires two config rows (seeded manually, never committed):
--   insert into public.cron_config (key, value) values
--     ('app_url', 'https://<your-app>.vercel.app'),
--     ('cron_secret', '<CRON_SECRET>')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Service-role-only config (app URL + shared cron secret).
create table if not exists public.cron_config (
  key text primary key,
  value text not null
);
alter table public.cron_config enable row level security;
-- no policies: service role / postgres only

create or replace function public.call_cron_endpoint(path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  secret text;
begin
  select value into base_url from public.cron_config where key = 'app_url';
  select value into secret from public.cron_config where key = 'cron_secret';
  if base_url is null or secret is null then
    raise notice 'cron_config missing app_url/cron_secret; skipping %', path;
    return;
  end if;
  perform net.http_post(
    url := base_url || path,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

revoke execute on function public.call_cron_endpoint(text) from public, anon, authenticated;

-- Re-schedule idempotently.
select cron.unschedule(jobid) from cron.job where jobname in ('resolve-matches', 'notify-emails');

select cron.schedule(
  'resolve-matches',
  '*/15 * * * *',
  $$select public.call_cron_endpoint('/api/cron/resolve-matches')$$
);

select cron.schedule(
  'notify-emails',
  '0 * * * *',
  $$select public.call_cron_endpoint('/api/cron/notify')$$
);
