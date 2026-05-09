-- =============================================================================
-- AC Elite — allow admins/owners to clear the ban audit log
-- =============================================================================
-- The audit log accumulates ban/unban records. Admins occasionally need to
-- wipe it (e.g. after smoke-testing). This adds a `delete` RLS policy gated
-- to admin and owner roles. Moderators can still read the log but cannot
-- erase it.
-- =============================================================================

drop policy if exists "bans_audit_admin_delete" on public.bans_audit;
create policy "bans_audit_admin_delete"
  on public.bans_audit for delete
  to authenticated
  using (public.current_role() in ('admin', 'owner'));
