-- =============================================================================
-- AC Elite — auto-cleanup of track images on row delete
-- =============================================================================
-- The admin UI already removes the storage object before deleting a track row.
-- This trigger is a safety net for the cases where the row is deleted via
-- another path (e.g. Supabase dashboard, direct SQL, future admin tooling)
-- so we never end up with orphan files in the `track-images` bucket.
--
-- Storage objects follow the convention `<track_id>.<ext>`, where `<ext>` is
-- one of jpg / png / webp / avif (enforced by the bucket policy). We delete
-- by exact name list — using `LIKE id || '.%'` would be unsafe because `_`
-- is a wildcard in LIKE and our IDs commonly contain underscores.
-- =============================================================================

create or replace function public.cleanup_track_images_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
   where bucket_id = 'track-images'
     and name in (
       OLD.id || '.jpg',
       OLD.id || '.png',
       OLD.id || '.webp',
       OLD.id || '.avif'
     );
  return OLD;
end;
$$;

drop trigger if exists tracks_cleanup_images_on_delete on public.tracks;
create trigger tracks_cleanup_images_on_delete
  after delete on public.tracks
  for each row
  execute function public.cleanup_track_images_on_delete();
