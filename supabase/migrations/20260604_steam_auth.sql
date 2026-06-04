-- =============================================================================
-- AC Elite — Steam login (driver role + steam-keyed profiles + staff mapping)
-- =============================================================================
-- Adds everything the `steam-auth` edge function needs to turn a verified
-- SteamID into a Supabase session with the correct role:
--
--   * a new `driver` role (the default for anyone who is not staff)
--   * `steam_id` / `avatar_url` columns on `profiles`
--   * a `staff_roles` table that maps a SteamID64 -> owner/admin/moderator.
--     This is the *authoritative* server-side role source (RLS + edge functions
--     read `profiles.role`, which the edge function fills from this table).
--
-- The seed below mirrors `SITE_TEAM_ROLES` in `src/site-manual-config.ts`
-- (creator -> owner, admin -> admin, moderator -> moderator). Those two lists
-- must be kept in sync by hand — see `docs/admin-auth-setup.md`. The old
-- username/password admin accounts stay as a backup; nothing here removes them.
-- =============================================================================

-- 1. Add the `driver` role -----------------------------------------------------
-- Note: a new enum value cannot be *used* in the same transaction it is added
-- in, but this migration never inserts a `driver` row (the edge function does
-- that at runtime), so this is safe.

alter type public.app_role add value if not exists 'driver';

-- 2. Steam columns on profiles -------------------------------------------------

alter table public.profiles
  add column if not exists steam_id   text unique,
  add column if not exists avatar_url text;

create index if not exists profiles_steam_id_idx on public.profiles (steam_id);

-- 3. Staff role mapping (SteamID64 -> role) ------------------------------------

create table if not exists public.staff_roles (
  steam_id text primary key,
  role     public.app_role not null,
  note     text
);

alter table public.staff_roles enable row level security;
-- No client policies: only the service role (edge function) reads/writes this.

-- 4. Seed from SITE_TEAM_ROLES -------------------------------------------------
-- Highest role wins on duplicate SteamID, so owners are inserted first and we
-- skip conflicts. Keep these rows in sync with src/site-manual-config.ts.

insert into public.staff_roles (steam_id, role, note) values
  ('76561198025621442', 'owner', 'DIEnamic'),
  ('76561198212710700', 'owner', 'Stella')
on conflict (steam_id) do nothing;

insert into public.staff_roles (steam_id, role, note) values
  ('76561198273504643', 'admin', 'Alexander'),
  ('76561198328304798', 'admin', 'CarterReza'),
  ('76561198828350593', 'admin', 'Grimlord'),
  ('76561199664649696', 'admin', 'olalekezion810'),
  ('76561199067031859', 'admin', 'Saba')
on conflict (steam_id) do nothing;

insert into public.staff_roles (steam_id, role, note) values
  ('76561199696427326', 'moderator', 'archera'),
  ('76561197986606289', 'moderator', 'Chaloem'),
  ('76561197995833363', 'moderator', 'MK-Ultra Racer'),
  ('76561198275276823', 'moderator', 'Pedro Muela'),
  ('76561198328746047', 'moderator', 'Spacelab'),
  ('76561198834200084', 'moderator', 'sparky')
on conflict (steam_id) do nothing;
