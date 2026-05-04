-- AC Elite: globale site-bezoekersteller voor de statische Vite-site (GitHub Pages).
--
-- Stappen:
-- 1) Maak een gratis project op https://supabase.com → SQL Editor → plak dit script → Run.
-- 2) Project Settings → API: kopieer Project URL en anon public key.
-- 3) Zet in je build omgeving: VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY
--    (bijv. GitHub Actions repository secrets voor de Pages-build).
-- 4) Optioneel: Authentication → URL Configuration → voeg je GitHub Pages-origin toe
--    als je later "Restrict API access" aanzet.
--
-- Reset (totaal + per route naar 0): zie scripts/supabase-site-stats-reset.sql
--
-- Per-route tabel: wordt bijgewerkt via `increment_site_page_only` (elke pagina-navigatie) én het totaal via
-- `increment_site_visits` (langere tussenpauze) — zie site-visits.ts in de frontend.

create table if not exists public.site_stats (
  id int primary key check (id = 1),
  visit_count bigint not null default 0
);

alter table public.site_stats enable row level security;

-- Geen DROP POLICY: Supabase SQL Editor waarschuwt dan voor "destructive operations".
-- Dit blok is idempotent (veilig opnieuw runnen).
do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_stats'
      and policyname = 'Allow public read site_stats'
  ) then
    execute $sql$
      create policy "Allow public read site_stats"
        on public.site_stats
        for select
        to anon, authenticated
        using (true)
    $sql$;
  end if;
end
$policy$;

insert into public.site_stats (id, visit_count)
values (1, 0)
on conflict (id) do nothing;

-- Per-route totals (which path was active when a visit was counted). Safe to re-run.
create table if not exists public.site_page_stats (
  path text primary key,
  visit_count bigint not null default 0
);

alter table public.site_page_stats enable row level security;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'site_page_stats'
      and policyname = 'Allow public read site_page_stats'
  ) then
    execute $sql$
      create policy "Allow public read site_page_stats"
        on public.site_page_stats
        for select
        to anon, authenticated
        using (true)
    $sql$;
  end if;
end
$policy$;

-- Replace legacy zero-arg RPC with path-aware version (drops old overloads if present).
drop function if exists public.increment_site_visits();
drop function if exists public.increment_site_visits(text);

-- Global total only (`p_path` kept for API compatibility with older clients).
create or replace function public.increment_site_visits(p_path text default '/')
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  update public.site_stats
  set visit_count = visit_count + 1
  where id = 1
  returning visit_count into v_total;

  return coalesce(v_total, 0);
end;
$$;

-- Per-route counts on each navigation (SPA). Separate from the global visit total above.
drop function if exists public.increment_site_page_only(text);

create or replace function public.increment_site_page_only(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text;
begin
  v_path := coalesce(nullif(trim(both from p_path), ''), '/');
  if length(v_path) > 240 then
    v_path := left(v_path, 240);
  end if;
  if v_path ~ '\.\.|^javascript:|^data:' then
    v_path := '/';
  end if;
  if v_path !~ '^/' then
    v_path := '/' || v_path;
  end if;

  insert into public.site_page_stats (path, visit_count)
  values (v_path, 1)
  on conflict (path) do update
  set visit_count = public.site_page_stats.visit_count + 1;
end;
$$;

revoke all on function public.increment_site_visits(text) from public;
grant execute on function public.increment_site_visits(text) to anon, authenticated;

revoke all on function public.increment_site_page_only(text) from public;
grant execute on function public.increment_site_page_only(text) to anon, authenticated;
