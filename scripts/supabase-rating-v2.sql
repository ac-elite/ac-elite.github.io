-- AC Elite — Rating v2 objects.
-- Additive only: v1 KMR data, sessions, rank_history and existing rating code stay untouched.

create table if not exists public.driver_session_stats_v2 (
  session_id              bigint not null,
  session_file            text not null,
  session_date            timestamptz,
  type                    text not null,
  track_id                text not null,
  track_name              text,
  guid                    text not null,
  name                    text,
  laps                    int not null default 0,
  rated_km                numeric not null default 0,
  field_size              int not null default 0,
  finish_pos              int,
  completion_ratio        numeric not null default 0,
  cuts                    int not null default 0,
  penalty_count           int not null default 0,
  disqualified            boolean not null default false,
  car_collisions          int not null default 0,
  env_collisions          int not null default 0,
  collision_points        numeric not null default 0,
  safety_incident_points  numeric not null default 0,
  racecraft_points        numeric,
  excluded_reason         text,
  computed_at             timestamptz not null default now(),
  primary key (session_id, guid)
);

create index if not exists driver_session_stats_v2_guid_idx
  on public.driver_session_stats_v2 (guid);

create index if not exists driver_session_stats_v2_session_date_idx
  on public.driver_session_stats_v2 (session_date desc);

create table if not exists public.driver_ratings_v2 (
  guid                  text primary key,
  name                  text,
  license_tier          text not null,
  license_score         numeric not null default 0,
  pace_score            numeric not null default 0,
  racecraft_score       numeric not null default 0,
  activity_score        numeric not null default 0,
  safety_tier           text not null,
  safety_rating         numeric not null default 2.5,
  safety_score          numeric not null default 0,
  confidence            numeric not null default 0,
  rated_sessions        int not null default 0,
  rated_races           int not null default 0,
  rated_km              numeric not null default 0,
  total_km              numeric not null default 0,
  unique_tracks         int not null default 0,
  incidents_per_100km   numeric not null default 0,
  cuts_per_100km        numeric not null default 0,
  breakdown             jsonb not null default '{}'::jsonb,
  computed_at           timestamptz not null default now()
);

create index if not exists driver_ratings_v2_license_score_idx
  on public.driver_ratings_v2 (license_score desc);

create index if not exists driver_ratings_v2_safety_rating_idx
  on public.driver_ratings_v2 (safety_rating desc);

create table if not exists public.rating_history_v2 (
  id            bigint generated always as identity primary key,
  captured_at   timestamptz not null default now(),
  driver_count  int not null default 0,
  ratings       jsonb not null default '[]'::jsonb
);

create index if not exists rating_history_v2_captured_at_idx
  on public.rating_history_v2 (captured_at desc);

-- One-row status/source signature table. The Edge Function uses this to skip
-- expensive full recomputes when nothing relevant changed or the free-tier
-- cooldown has not elapsed yet.
create table if not exists public.rating_sync_v2 (
  id                  int primary key check (id = 1),
  checked_at          timestamptz not null default now(),
  synced_at           timestamptz,
  status              text not null default 'unknown',
  error               text,
  source_signature    text,
  skipped_reason      text,
  history_mode        text not null default 'off',
  rank_count          int,
  session_count       int,
  session_stat_count  int,
  driver_count        int
);

alter table public.rating_sync_v2 add column if not exists checked_at timestamptz not null default now();
alter table public.rating_sync_v2 add column if not exists synced_at timestamptz;
alter table public.rating_sync_v2 add column if not exists status text not null default 'unknown';
alter table public.rating_sync_v2 add column if not exists error text;
alter table public.rating_sync_v2 add column if not exists source_signature text;
alter table public.rating_sync_v2 add column if not exists skipped_reason text;
alter table public.rating_sync_v2 add column if not exists history_mode text not null default 'off';
alter table public.rating_sync_v2 add column if not exists rank_count int;
alter table public.rating_sync_v2 add column if not exists session_count int;
alter table public.rating_sync_v2 add column if not exists session_stat_count int;
alter table public.rating_sync_v2 add column if not exists driver_count int;

insert into public.rating_sync_v2 (id, status)
values (1, 'unknown')
on conflict (id) do nothing;

alter table public.driver_session_stats_v2 enable row level security;
alter table public.driver_ratings_v2 enable row level security;
alter table public.rating_history_v2 enable row level security;
alter table public.rating_sync_v2 enable row level security;

do $policy$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'driver_session_stats_v2'
      and policyname = 'Allow public read driver_session_stats_v2'
  ) then
    execute $sql$
      create policy "Allow public read driver_session_stats_v2"
        on public.driver_session_stats_v2 for select to anon, authenticated using (true)
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'driver_ratings_v2'
      and policyname = 'Allow public read driver_ratings_v2'
  ) then
    execute $sql$
      create policy "Allow public read driver_ratings_v2"
        on public.driver_ratings_v2 for select to anon, authenticated using (true)
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rating_history_v2'
      and policyname = 'Allow public read rating_history_v2'
  ) then
    execute $sql$
      create policy "Allow public read rating_history_v2"
        on public.rating_history_v2 for select to anon, authenticated using (true)
    $sql$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rating_sync_v2'
      and policyname = 'Allow public read rating_sync_v2'
  ) then
    execute $sql$
      create policy "Allow public read rating_sync_v2"
        on public.rating_sync_v2 for select to anon, authenticated using (true)
    $sql$;
  end if;
end
$policy$;

-- Full-refresh helper used by the Edge Function after it has already computed
-- the replacement rows. TRUNCATE avoids the dead-tuple bloat caused by repeated
-- delete+insert cycles on tiny free-tier disks.
create or replace function public.reset_rating_v2_current()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.driver_session_stats_v2, public.driver_ratings_v2;
end;
$$;

revoke execute on function public.reset_rating_v2_current() from public;
grant execute on function public.reset_rating_v2_current() to service_role;

create or replace function public.prune_rating_history_v2()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- v2 history is optional and compact-summary-only. Keep a short trail; the
  -- live rating reads driver_ratings_v2, not this table.
  delete from public.rating_history_v2
  where captured_at < now() - interval '14 days';
end;
$$;

revoke execute on function public.prune_rating_history_v2() from public;
grant execute on function public.prune_rating_history_v2() to service_role;

