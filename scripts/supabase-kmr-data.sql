-- AC Elite — realtime KMR data via Supabase (Edge Function -> Storage + tables).
-- Run this whole file once in the Supabase SQL Editor.
--
-- It replaces the hourly "Sync KMR Data" + "Daily Rank Snapshot (24h)" GitHub
-- Actions. Those workflows stay enabled as a backup; the site prefers Supabase
-- and silently falls back to the committed public/data/*.json if Supabase is
-- unreachable or VITE_SUPABASE_KMR_DATA=0.
--
-- Deploy steps (after running this SQL):
--   1. supabase secrets set FTP_HOST=... FTP_USER=... FTP_PASS=...
--      (CRON_SECRET is already set for sync-server-status — reuse the same one.)
--   2. npm run supabase:deploy:kmr-data
--   3. Schedule the function every 15 min — see "Cron" section at the bottom.

-- ===========================================================================
-- 1. Public Storage bucket that holds the published JSON blobs.
--    Public bucket => readable at:
--    https://<ref>.supabase.co/storage/v1/object/public/kmr-data/rank.json
--    Uploads happen via the service-role key inside the Edge Function only.
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('kmr-data', 'kmr-data', true)
on conflict (id) do update set public = true;

-- ===========================================================================
-- 2. kmr_sync — one status row. The site subscribes to this over Realtime and
--    refetches rank/leaderboard within ~1s of a successful sync.
-- ===========================================================================
create table if not exists public.kmr_sync (
  id         int primary key check (id = 1),
  synced_at  timestamptz not null default now(),
  status     text not null default 'unknown',
  error      text,
  rank_count int
);

alter table public.kmr_sync enable row level security;

insert into public.kmr_sync (id, status)
values (1, 'unknown')
on conflict (id) do nothing;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kmr_sync'
      and policyname = 'Allow public read kmr_sync'
  ) then
    execute $sql$
      create policy "Allow public read kmr_sync"
        on public.kmr_sync for select to anon, authenticated using (true)
    $sql$;
  end if;
end
$policy$;

-- Realtime push for the status row.
do $realtime$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'kmr_sync'
  ) then
    execute 'alter publication supabase_realtime add table public.kmr_sync';
  end if;
end
$realtime$;

-- ===========================================================================
-- 3. rank_history — slim per-driver snapshots for arbitrary-window deltas
--    (replaces the single fixed rank-24h.json). Each row stores only scalar
--    fields, so a snapshot is a few tens of KB. The Edge Function inserts at
--    most one snapshot per hour; prune_rank_history() keeps the table small.
-- ===========================================================================
create table if not exists public.rank_history (
  id           bigint generated always as identity primary key,
  captured_at  timestamptz not null default now(),
  driver_count int not null default 0,
  drivers      jsonb not null default '[]'::jsonb
);

create index if not exists rank_history_captured_at_idx
  on public.rank_history (captured_at desc);

alter table public.rank_history enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rank_history'
      and policyname = 'Allow public read rank_history'
  ) then
    execute $sql$
      create policy "Allow public read rank_history"
        on public.rank_history for select to anon, authenticated using (true)
    $sql$;
  end if;
end
$policy$;

-- Retention: keep every hourly snapshot for 3 days, then thin to one per day
-- up to 32 days, then drop. The 32-day cutoff (not 30) leaves a small buffer so
-- the dashboard's 30-day window can always find a snapshot a full 30 days old.
-- With ~17.9k drivers a snapshot is ~600 KB stored, so this caps rank_history at
-- roughly 60 MB regardless of how long it runs.
create or replace function public.prune_rank_history()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.rank_history
  where captured_at < now() - interval '32 days';

  delete from public.rank_history r
  using (
    select id,
           row_number() over (
             partition by date_trunc('day', captured_at)
             order by captured_at
           ) as rn
    from public.rank_history
    where captured_at < now() - interval '3 days'
  ) dup
  where r.id = dup.id and dup.rn > 1;
end;
$$;

-- ===========================================================================
-- 4. Cron — schedule the sync + the pruning job.
--    Easiest: Supabase Dashboard -> Integrations -> Cron -> "Create job",
--    pick the `sync-kmr-data` Edge Function, every 15 minutes.
--
--    SQL alternative (pg_cron + pg_net). Enable the extensions first via
--    Dashboard -> Database -> Extensions: `pg_cron` and `pg_net`.
--    Replace <PROJECT_REF> and <CRON_SECRET> before running:
--
--   select cron.schedule(
--     'sync-kmr-data', '*/15 * * * *',
--     $job$
--       select net.http_post(
--         url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-kmr-data',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'x-cron-secret', '<CRON_SECRET>'
--         )
--       );
--     $job$
--   );
--
--   select cron.schedule(
--     'prune-rank-history', '17 4 * * *',
--     $job$ select public.prune_rank_history(); $job$
--   );
--
-- Inspect / remove jobs:  select * from cron.job;  select cron.unschedule('sync-kmr-data');
