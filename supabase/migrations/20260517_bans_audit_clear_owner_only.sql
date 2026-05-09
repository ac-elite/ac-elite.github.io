-- =============================================================================
-- AC Elite — restrict ban audit clearing to owners only
-- =============================================================================
-- Replaces the admin+owner delete policy from the previous migration with an
-- owner-only one. Reason: clearing the accountability log is destructive and
-- should be rare; we want it gated to the most senior role.
-- =============================================================================

drop policy if exists "bans_audit_admin_delete" on public.bans_audit;
drop policy if exists "bans_audit_owner_delete" on public.bans_audit;

create policy "bans_audit_owner_delete"
  on public.bans_audit for delete
  to authenticated
  using (public.current_role() = 'owner');
