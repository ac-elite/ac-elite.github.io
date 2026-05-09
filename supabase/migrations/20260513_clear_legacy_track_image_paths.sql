-- =============================================================================
-- AC Elite — clear legacy bundled image paths
-- =============================================================================
-- We are dropping local /images/tracks/* assets in favour of Supabase Storage.
-- Any DB row that was seeded with a `/images/tracks/...` path now points at
-- a file that no longer exists, so we null those entries. Tracks display as
-- "no image" until an admin uploads a new one through the admin panel.
--
-- Idempotent: matches only the legacy prefix; new Storage URLs (which start
-- with `https://.../storage/v1/object/public/track-images/...`) are untouched.
-- =============================================================================

update public.tracks
   set image_url = null
 where image_url like '/images/tracks/%';
