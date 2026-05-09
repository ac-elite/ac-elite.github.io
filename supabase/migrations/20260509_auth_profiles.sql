-- =============================================================================
-- AC Elite — auth profiles + role-based access
-- =============================================================================
-- Adds a `profiles` table that holds one row per Supabase auth user with their
-- assigned role (`owner` | `admin` | `moderator`). RLS limits writes so that
-- only an `owner` can change roles, and each user can only read their own
-- profile.
--
-- Roles:
--   owner     — everything (incl. user management when we add a UI for it)
--   admin     — admin panel + (later) image upload for tracks
--   moderator — admin panel read-only
--
-- After running this migration:
--   1) Create 3 users in the Supabase dashboard (Authentication → Users → Add).
--      Use `confirmed` so they can sign in immediately (no email verification).
--   2) Run the role assignments at the bottom of `docs/admin-auth-setup.md`.
-- =============================================================================

-- 1. Role enum -----------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'admin', 'moderator');
  end if;
end$$;

-- 2. profiles table ------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'moderator',
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is added.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Keep `updated_at` accurate.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

-- 3. Helpers used by RLS -------------------------------------------------------

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'owner', false);
$$;

-- 4. Row Level Security --------------------------------------------------------

alter table public.profiles enable row level security;

-- Each authenticated user can read their own profile (so the UI knows their role).
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Owners can read every profile (needed once we build a user management UI).
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select"
  on public.profiles for select
  to authenticated
  using (public.is_owner());

-- Only owners can change role / display name. Users cannot escalate themselves.
drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update"
  on public.profiles for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- Inserts only via the trigger above (security definer). No client policy.
-- Deletes only via auth.users cascade. No client policy.
