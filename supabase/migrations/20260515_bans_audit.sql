-- =============================================================================
-- AC Elite — driver bans audit log
-- =============================================================================
-- The source of truth for active bans is `blocklist.json` on the AC server's
-- FTP root (the AC/KissMyRank server reads it directly). This table is a
-- companion **audit log** — it records who issued/revoked a ban, when, with
-- what context — for accountability and so the admin UI can show history.
--
-- Inserts only happen from the `manage-blocklist` edge function (which runs
-- with the service role key after verifying the caller's JWT and role). RLS
-- below blocks every direct client write; reads are limited to moderators+.
-- =============================================================================

-- 1. Action enum ---------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ban_action') then
    create type public.ban_action as enum ('ban', 'unban');
  end if;
end$$;

-- 2. Table ---------------------------------------------------------------------

create table if not exists public.bans_audit (
  id          bigserial primary key,
  guid        text not null,
  context     text not null default '',
  action      public.ban_action not null,
  actor_id    uuid references auth.users (id) on delete set null,
  actor_role  public.app_role,
  actor_name  text,
  created_at  timestamptz not null default now()
);

create index if not exists bans_audit_guid_idx on public.bans_audit (guid);
create index if not exists bans_audit_created_at_idx on public.bans_audit (created_at desc);

-- 3. Row Level Security --------------------------------------------------------

alter table public.bans_audit enable row level security;

-- Moderators and up can read the audit history. (current_role() lives in the
-- auth-profiles migration and returns the caller's app_role.)
drop policy if exists "bans_audit_staff_select" on public.bans_audit;
create policy "bans_audit_staff_select"
  on public.bans_audit for select
  to authenticated
  using (public.current_role() in ('moderator', 'admin', 'owner'));

-- No client-side insert/update/delete policies. The edge function uses the
-- service role, which bypasses RLS, so no authenticated user can ever forge
-- audit rows.
