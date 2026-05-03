-- AC Elite: globale site-bezoekersteller voor de statische Vite-site (GitHub Pages).
--
-- Stappen:
-- 1) Maak een gratis project op https://supabase.com → SQL Editor → plak dit script → Run.
-- 2) Project Settings → API: kopieer Project URL en anon public key.
-- 3) Zet in je build omgeving: VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY
--    (bijv. GitHub Actions repository secrets voor de Pages-build).
-- 4) Optioneel: Authentication → URL Configuration → voeg je GitHub Pages-origin toe
--    als je later "Restrict API access" aanzet.

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

create or replace function public.increment_site_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v bigint;
begin
  update public.site_stats
  set visit_count = visit_count + 1
  where id = 1
  returning visit_count into v;

  return coalesce(v, 0);
end;
$$;

revoke all on function public.increment_site_visits() from public;
grant execute on function public.increment_site_visits() to anon, authenticated;
