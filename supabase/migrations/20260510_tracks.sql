-- =============================================================================
-- AC Elite — tracks catalog (DB-backed)
-- =============================================================================
-- Moves the bundled `track-catalog.json` into Postgres so admins/owners can
-- manage it without a redeploy. The public site continues to read the bundled
-- JSON for now; switching public reads to live DB is a follow-up.
--
-- Permissions (enforced server-side via RLS):
--   anonymous + authenticated  → SELECT
--   admin + owner              → INSERT, UPDATE
--   owner                      → DELETE
--
-- Track IDs come from the KMR dashboard (e.g. `ks_brands_hatch_gp`,
-- `monza_`). Admins look them up there before adding a track here.
-- =============================================================================

-- 1. Table ---------------------------------------------------------------------

create table if not exists public.tracks (
  id              text primary key,
  name            text not null,
  image_url       text,
  image_offset_y  integer not null default 0,
  aliases         text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null
);

-- Reuse the touch_updated_at function defined in the auth migration. If you
-- ever run this migration in isolation, ensure that function exists first.
drop trigger if exists tracks_set_updated_at on public.tracks;
create trigger tracks_set_updated_at
before update on public.tracks
for each row execute function public.touch_updated_at();

-- 2. Row Level Security --------------------------------------------------------

alter table public.tracks enable row level security;

-- Public read so the website (anonymous + authenticated) can render tracks.
drop policy if exists "tracks_public_select" on public.tracks;
create policy "tracks_public_select"
  on public.tracks for select
  to anon, authenticated
  using (true);

drop policy if exists "tracks_admin_insert" on public.tracks;
create policy "tracks_admin_insert"
  on public.tracks for insert
  to authenticated
  with check (public.current_role() in ('admin', 'owner'));

drop policy if exists "tracks_admin_update" on public.tracks;
create policy "tracks_admin_update"
  on public.tracks for update
  to authenticated
  using (public.current_role() in ('admin', 'owner'))
  with check (public.current_role() in ('admin', 'owner'));

-- Only the owner can permanently delete a track row.
drop policy if exists "tracks_owner_delete" on public.tracks;
create policy "tracks_owner_delete"
  on public.tracks for delete
  to authenticated
  using (public.is_owner());

-- 3. Seed from the existing bundled catalog -----------------------------------
-- Idempotent (`on conflict do nothing`) so it is safe to re-run. Empty image
-- strings in the JSON become NULL here. Aliases are stored as arrays.

insert into public.tracks (id, name, image_url, image_offset_y, aliases) values
  ('ks_barcelona_layout_gp',          'Barcelona - GP',          '/images/tracks/ks_barcelona_layout_gp.webp',     0,   '{}'),
  ('ks_barcelona_layout_moto',        'Barcelona - Moto',         null,                                              0,   '{}'),
  ('ks_black_cat_county_layout_short','Black Cat County - Short', null,                                              0,   '{}'),
  ('ks_brands_hatch_gp',              'Brands Hatch - GP',        '/images/tracks/ks_brands_hatch_gp.png',          10,  '{}'),
  ('imola_',                          'Imola',                    '/images/tracks/imola.avif',                      -50, array['imola']),
  ('ks_laguna_seca_',                 'Laguna Seca',              null,                                              0,   array['ks_laguna_seca']),
  ('magione_',                        'Magione',                  null,                                              0,   array['magione']),
  ('monza_',                          'Monza',                    null,                                              0,   array['monza']),
  ('ks_monza66_junior',               'Monza 1966 - Junior',      null,                                              0,   '{}'),
  ('ks_monza66_road',                 'Monza 1966 - Road',        null,                                              0,   '{}'),
  ('mugello_',                        'Mugello',                  null,                                              0,   array['mugello']),
  ('ks_nordschleife_nordschleife',    'Nordschleife',             null,                                              0,   '{}'),
  ('ks_nordschleife_endurance',       'Nordschleife Endurance',   null,                                              0,   '{}'),
  ('ks_nurburgring_layout_gp_a',      'Nurburgring GP',           null,                                              0,   '{}'),
  ('ks_nurburgring_layout_gp_b',      'Nurburgring GP - GT',      null,                                              0,   '{}'),
  ('ks_red_bull_ring_layout_gp',      'Red Bull Ring - GP',       '/images/tracks/ks_red_bull_ring_layout_gp.jpg',  0,   '{}'),
  ('ks_silverstone_gp',               'Silverstone - GP',         null,                                              0,   '{}'),
  ('ks_silverstone_national',         'Silverstone - National',   null,                                              0,   '{}'),
  ('spa_',                            'Spa',                      null,                                              0,   array['spa']),
  ('ks_vallelunga_extended_circuit',  'Vallelunga - Extended',    null,                                              0,   '{}'),
  ('ks_vallelunga_classic_circuit',   'Vallelunga - Classic',     null,                                              0,   '{}'),
  ('ks_zandvoort_',                   'Zandvoort',                null,                                              0,   array['ks_zandvoort']),
  ('rt_suzuka_suzukagp',              'Suzuka GP',                null,                                              0,   '{}'),
  ('canada_2021_',                    'Montreal (Canada)',        null,                                              0,   array['canada_2021']),
  ('acu_unitedstates_a',              'COTA (USA)',               null,                                              0,   '{}')
on conflict (id) do nothing;
