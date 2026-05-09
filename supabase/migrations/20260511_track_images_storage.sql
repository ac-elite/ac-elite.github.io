-- =============================================================================
-- AC Elite — track-images storage bucket + RLS
-- =============================================================================
-- Public read so the website can render images directly from the storage URL.
-- Write access is gated by app role (admin + owner). Delete is also admin+owner
-- per product decision: removing a single image is a low-risk operation, while
-- deleting an entire track row remains owner-only via the `tracks` policies.
--
-- File limits enforced server-side by the bucket itself:
--   * 8 MiB per file
--   * MIME types: jpeg, png, webp, avif (no GIF)
--
-- Object naming used by the client: `<track_id>.<ext>` (deterministic so
-- replacing an image overwrites the same object instead of leaving orphans).
-- =============================================================================

-- 1. Create the bucket (idempotent) -------------------------------------------

insert into storage.buckets (id, name, public)
values ('track-images', 'track-images', true)
on conflict (id) do nothing;

-- 2. Set / refresh bucket constraints (safe to re-run) ------------------------

update storage.buckets
   set public = true,
       file_size_limit = 8388608, -- 8 MiB
       allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/avif'
       ]
 where id = 'track-images';

-- 3. RLS policies on storage.objects ------------------------------------------
-- (RLS is enabled by default on storage.objects in Supabase.)

drop policy if exists "track_images_public_select" on storage.objects;
create policy "track_images_public_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'track-images');

drop policy if exists "track_images_admin_insert" on storage.objects;
create policy "track_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'track-images'
    and public.current_role() in ('admin', 'owner')
  );

drop policy if exists "track_images_admin_update" on storage.objects;
create policy "track_images_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'track-images'
    and public.current_role() in ('admin', 'owner')
  )
  with check (
    bucket_id = 'track-images'
    and public.current_role() in ('admin', 'owner')
  );

drop policy if exists "track_images_admin_delete" on storage.objects;
create policy "track_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'track-images'
    and public.current_role() in ('admin', 'owner')
  );
