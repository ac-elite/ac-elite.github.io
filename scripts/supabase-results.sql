-- AC Elite — session results via Supabase (Edge Function -> `sessions` table).
-- Run this whole file once in the Supabase SQL Editor.
--
-- The `sync-results` Edge Function reads the AC server `results/` folder over the
-- same FTP as `sync-kmr-data`, parses each session file (RACE / QUALIFY / PRACTICE)
-- into a slim classification + laps + incidents payload, and inserts one row per
-- session. The site reads these rows live for the public Results page.
--
-- Deploy steps (after running this SQL):
--   1. FTP_HOST / FTP_USER / FTP_PASS are already set for sync-kmr-data — reuse them.
--      (CRON_SECRET is already set too.) Optionally set RESULTS_REMOTE_DIR (default "results").
--   2. npm run supabase:deploy:results
--   3. Schedule the function every ~15 min — see "Cron" section at the bottom.

-- ===========================================================================
-- 1. sessions — one row per parsed result file.
--    Summary columns power the list/filter view; `detail` jsonb holds the full
--    classification + laps + incidents and is only fetched on the detail page.
--    `session_file` is the natural key the Edge Function dedupes against.
-- ===========================================================================
create table if not exists public.sessions (
  id            bigint generated always as identity primary key,
  session_file  text not null unique,
  type          text not null,                 -- RACE | QUALIFY | PRACTICE
  track_name    text,
  track_config  text,
  event_name    text,
  session_date  timestamptz,
  num_drivers   int not null default 0,
  num_laps      int not null default 0,
  best_lap_ms   int,                            -- session fastest lap (ms)
  best_lap_guid text,
  best_lap_name text,
  winner_guid   text,                           -- P1 (race) / pole (qualify/practice)
  winner_name   text,
  -- Only sessions with >= 2 drivers who actually drove are `listed`. Idle/empty
  -- sessions are kept as `listed = false` markers (no detail) so the sync dedupes
  -- them without re-downloading, but they never show on the site.
  listed        boolean not null default true,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists sessions_listed_date_idx on public.sessions (listed, session_date desc);
create index if not exists sessions_type_idx  on public.sessions (type);
create index if not exists sessions_track_idx on public.sessions (track_name);

alter table public.sessions enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sessions'
      and policyname = 'Allow public read sessions'
  ) then
    execute $sql$
      create policy "Allow public read sessions"
        on public.sessions for select to anon, authenticated using (true)
    $sql$;
  end if;
end
$policy$;

-- ===========================================================================
-- 2. results_sync — one status row. The site subscribes over Realtime and
--    refetches the results list shortly after a successful ingest.
-- ===========================================================================
create table if not exists public.results_sync (
  id             int primary key check (id = 1),
  synced_at      timestamptz not null default now(),
  status         text not null default 'unknown',
  error          text,
  ingested_count int,                            -- new sessions added on the last run
  session_count  int                             -- total sessions known after the run
);

alter table public.results_sync enable row level security;

insert into public.results_sync (id, status)
values (1, 'unknown')
on conflict (id) do nothing;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'results_sync'
      and policyname = 'Allow public read results_sync'
  ) then
    execute $sql$
      create policy "Allow public read results_sync"
        on public.results_sync for select to anon, authenticated using (true)
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
      and schemaname = 'public' and tablename = 'results_sync'
  ) then
    execute 'alter publication supabase_realtime add table public.results_sync';
  end if;
end
$realtime$;

-- ===========================================================================
-- 3. Cron — schedule the ingest.
--    Easiest: Supabase Dashboard -> Integrations -> Cron -> "Create job",
--    pick the `sync-results` Edge Function, every 15 minutes.
--
--    SQL alternative (pg_cron + pg_net). Enable the extensions first via
--    Dashboard -> Database -> Extensions: `pg_cron` and `pg_net`.
--    Replace <PROJECT_REF> and <CRON_SECRET> before running:
--
--   select cron.schedule(
--     'sync-results', '*/15 * * * *',
--     $job$
--       select net.http_post(
--         url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-results',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'x-cron-secret', '<CRON_SECRET>'
--         )
--       );
--     $job$
--   );
--
-- Inspect / remove:  select * from cron.job;  select cron.unschedule('sync-results');
