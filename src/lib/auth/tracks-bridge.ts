import { setTrackCatalog, type TrackInfo } from 'src/centralized/track-info';
import { supabaseTemporarilyUnavailable } from 'src/centralized/supabase-rest';

import { fetchAllTracks, type TrackRow } from './tracks-db';

// ----------------------------------------------------------------------

function toTrackInfo(row: TrackRow): TrackInfo {
  return {
    id: row.id,
    name: row.name,
    image: row.imageUrl ?? '',
    imageOffsetY: row.imageOffsetY,
    aliases: row.aliases,
  };
}

/**
 * Fetches the live track catalog from Supabase and pushes it into the in-memory
 * store consumed by `getTrackDisplayName` and friends. Silent no-op when
 * Supabase is not configured or the request fails — the bundled JSON seed
 * stays in place so the public site keeps rendering normally.
 *
 * Call:
 *   - once on app mount, so subsequent navigations see fresh data
 *   - after every admin CRUD action, so the user sees their own change reflected
 *     on public pages immediately
 */
export async function refreshTrackCatalogFromDb(): Promise<void> {
  if (supabaseTemporarilyUnavailable()) return;
  try {
    const rows = await fetchAllTracks();
    if (rows.length === 0) return;
    setTrackCatalog(rows.map(toTrackInfo));
  } catch {
    // Network down, RLS error, or Supabase not configured — keep using the
    // bundled JSON seed. Avoid surfacing this to the user; it would only
    // distract from the actual UI.
  }
}
