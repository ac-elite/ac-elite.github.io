-- AC Elite: live game-server track via Supabase (cron-job.org → Edge Function → DB → site poll).
--
-- === Stap 1: tabel + RLS (Supabase SQL Editor → Run) ===
--
-- === Stap 2: Edge Function deployen ===
--   cd repo root
--   supabase login
--   supabase link --project-ref <YOUR_REF>
--   supabase secrets set CRON_SECRET="<lange willekeurige string>"
--   Optioneel: supabase secrets set SERVER_INFO_URL="http://157.90.3.32:18283/INFO"
--   supabase functions deploy sync-server-status
--
-- === Stap 3: cron-job.org ===
--   Nieuwe cron: URL = https://<PROJECT_REF>.supabase.co/functions/v1/sync-server-status
--   Methode: POST (of GET; de function accepteert beide)
--   Interval: elke 1–5 minuten (jouw keuze; ≤5 min past bij je eis)
--   Request header: Authorization = Bearer <dezelfde CRON_SECRET als in secrets>
--     Alternatief header: x-cron-secret = <CRON_SECRET>
--
-- === Stap 4: frontend build (GitHub Pages / lokaal) ===
--   Zet VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY: de site probeert dan automatisch server_status te lezen.
--   Uitzetten live-read: VITE_SUPABASE_LIVE_SERVER_STATUS=0 (of false / off).
--   Expliciet forceren: VITE_SUPABASE_LIVE_SERVER_STATUS=1 (zelfde gedrag als keys aanwezig + niet uit).
--

create table if not exists public.server_status (
  id int primary key check (id = 1),
  online boolean not null default false,
  track text not null default '',
  fetched_at timestamptz not null default (now() at time zone 'utc'),
  info jsonb not null default '{}'::jsonb
);

alter table public.server_status enable row level security;

-- Volledige /INFO JSON voor de join card (idempotent; oude installs upgraden hiermee):
alter table public.server_status add column if not exists info jsonb not null default '{}'::jsonb;

insert into public.server_status (id, online, track, fetched_at, info)
values (1, false, '', (now() at time zone 'utc'), '{}'::jsonb)
on conflict (id) do nothing;

do $policy$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'server_status'
      and policyname = 'Allow public read server_status'
  ) then
    execute $sql$
      create policy "Allow public read server_status"
        on public.server_status
        for select
        to anon, authenticated
        using (true)
    $sql$;
  end if;
end
$policy$;

-- Schrijven alleen via service role (Edge Function), niet via anon.

-- === Realtime: push i.p.v. pollen ===
-- Zet de tabel in de `supabase_realtime` publication zodat de site via een
-- WebSocket meteen een melding krijgt als de Edge Function een nieuwe rij schrijft
-- (track-wissel zichtbaar binnen ~1s i.p.v. de 90s-poll). De poll blijft actief als de realtime socket wegvalt.
do $realtime$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'server_status'
  ) then
    execute 'alter publication supabase_realtime add table public.server_status';
  end if;
end
$realtime$;
--
--
-- === Supabase CLI (Windows) — veelvoorkomende fixes ===
--
-- 1) Gebruik de CLI uit deze repo (geen globale install nodig):
--      npm run supabase:login
--      npm run supabase:link -- --project-ref <JE_PROJECT_REF>
--      npm run supabase:deploy:server-status
--    (<PROJECT_REF> = korte id in Project URL: https://<ref>.supabase.co)
--
-- 2) Fout: "Access token not provided"
--      → Eerst: npm run supabase:login   (opent browser om in te loggen)
--    Of in CI / zonder browser: maak een token op
--      Dashboard → Account → Access Tokens → plak in omgeving:
--      set SUPABASE_ACCESS_TOKEN=sbp_...   (PowerShell: $env:SUPABASE_ACCESS_TOKEN="...")
--    Daarna opnieuw deployen.
--
-- 3) Fout bij link over database-wachtwoord: gebruik het **Database** password
--      (Project Settings → Database), niet je Supabase-accountwachtwoord.
--      Voorbeeld: npm run supabase:link -- --project-ref abcxyz -p "postgres-wachtwoord"
--
-- 4) CRON_SECRET zetten (eenmalig of bij rotatie):
--      npx supabase secrets set CRON_SECRET="lange-willekeurige-string"
--
-- 5) Controle: npm run supabase:secrets:list  (waarden worden niet getoond, alleen namen)
