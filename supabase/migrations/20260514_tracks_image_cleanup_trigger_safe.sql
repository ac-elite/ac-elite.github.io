-- =============================================================================
-- AC Elite — make track-image cleanup trigger defensive
-- =============================================================================
-- Replaces the AFTER DELETE trigger function from 20260512 with a version that
-- catches any error from the storage cleanup. The original would roll back the
-- track DELETE if the storage delete failed for any reason (permissions,
-- non-existent rows, etc.), which surfaces in the UI as "Delete failed".
-- Storage cleanup is *best-effort*: a failure there should never block the
-- canonical row delete.
-- =============================================================================

create or replace function public.cleanup_track_images_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    delete from storage.objects
     where bucket_id = 'track-images'
       and name in (
         OLD.id || '.jpg',
         OLD.id || '.png',
         OLD.id || '.webp',
         OLD.id || '.avif'
       );
  exception when others then
    -- Surface in Postgres logs for debugging, but never block the DELETE.
    raise warning 'cleanup_track_images_on_delete failed: % (%)', SQLERRM, SQLSTATE;
  end;
  return OLD;
end;
$$;
