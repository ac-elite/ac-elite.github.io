import { useState, useEffect, useCallback } from 'react';

import { getSupabaseClient } from 'src/lib/supabase-client';

// ----------------------------------------------------------------------

export type TrackRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  imageOffsetY: number;
  aliases: string[];
  createdAt: string;
  updatedAt: string;
};

/** Fields the admin form can edit. ID is set on insert and never changed. */
export type TrackInput = {
  id: string;
  name: string;
  imageUrl: string | null;
  imageOffsetY: number;
  aliases: string[];
};

type RawTrack = {
  id: string;
  name: string;
  image_url: string | null;
  image_offset_y: number;
  aliases: string[] | null;
  created_at: string;
  updated_at: string;
};

function parseRow(raw: RawTrack): TrackRow {
  return {
    id: raw.id,
    name: raw.name,
    imageUrl: raw.image_url,
    imageOffsetY: raw.image_offset_y,
    aliases: Array.isArray(raw.aliases) ? raw.aliases : [],
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ----------------------------------------------------------------------

export async function fetchAllTracks(): Promise<TrackRow[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { data, error } = await client
    .from('tracks')
    .select('id, name, image_url, image_offset_y, aliases, created_at, updated_at')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as RawTrack[] | null)?.map(parseRow) ?? [];
}

export async function upsertTrack(input: TrackInput): Promise<TrackRow> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const payload = {
    id: input.id,
    name: input.name,
    image_url: input.imageUrl,
    image_offset_y: input.imageOffsetY,
    aliases: input.aliases,
  };
  const { data, error } = await client
    .from('tracks')
    .upsert(payload, { onConflict: 'id' })
    .select('id, name, image_url, image_offset_y, aliases, created_at, updated_at')
    .single();
  if (error) throw error;
  return parseRow(data as RawTrack);
}

export async function deleteTrack(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { error } = await client.from('tracks').delete().eq('id', id);
  if (error) throw error;
}

// =============================================================================
// Image storage (Supabase Storage bucket: track-images)
// =============================================================================

const STORAGE_BUCKET = 'track-images';

/** Allowed image MIME types -> file extension we use as the storage object key. */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MiB — must match bucket policy.

export type ImageValidationError = 'unsupported-type' | 'too-large';

export const ALLOWED_IMAGE_EXTENSIONS = Object.values(ALLOWED_IMAGE_TYPES);

/** Client-side pre-check; the bucket also enforces both rules server-side. */
export function validateImageFile(file: File): ImageValidationError | null {
  if (!ALLOWED_IMAGE_TYPES[file.type]) return 'unsupported-type';
  if (file.size > MAX_IMAGE_BYTES) return 'too-large';
  return null;
}

/**
 * Uploads `file` to `track-images/<trackId>.<ext>`, overwriting any existing
 * object at that path (i.e. replacing the image for that track). Returns the
 * public URL with a cache-bust query string so browsers refetch immediately.
 */
export async function uploadTrackImage(trackId: string, file: File): Promise<string> {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new Error('Unsupported image type.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image is larger than 8 MB.');

  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  const objectKey = `${trackId}.${ext}`;
  const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(objectKey, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  });
  if (uploadError) throw uploadError;

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(objectKey);
  return `${data.publicUrl}?v=${Date.now()}`;
}

function isStorageBucketUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes(`/storage/v1/object/public/${STORAGE_BUCKET}/`);
}

function storageKeyFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const tail = url.slice(idx + marker.length);
  // Strip any query string (cache-bust) before passing to Storage API.
  const stripped = tail.split('?')[0];
  return stripped || null;
}

/**
 * Deletes the storage object behind a track image URL, if (and only if) that
 * URL points to our `track-images` bucket. Bundled `/images/tracks/...` paths
 * are left untouched. Best-effort: silent on "not found".
 */
export async function removeStorageObjectForUrl(url: string | null | undefined): Promise<void> {
  if (!isStorageBucketUrl(url)) return;
  const key = storageKeyFromUrl(url ?? '');
  if (!key) return;
  const client = getSupabaseClient();
  if (!client) return;
  await client.storage
    .from(STORAGE_BUCKET)
    .remove([key])
    .catch(() => null);
}

/**
 * Returns whether the old URL is meaningfully different from the new one
 * (ignoring the cache-bust query string). Used to decide whether to delete
 * the old object after a replace/remove.
 */
function isDifferentImage(oldUrl: string | null, newUrl: string | null): boolean {
  if (!oldUrl) return false;
  const stripQuery = (u: string | null) => (u ? u.split('?')[0] : u);
  return stripQuery(oldUrl) !== stripQuery(newUrl);
}

/** Convenience: cleans up the previous image when it's been replaced or removed. */
export async function cleanupReplacedImage(
  oldUrl: string | null,
  newUrl: string | null
): Promise<void> {
  if (!isDifferentImage(oldUrl, newUrl)) return;
  await removeStorageObjectForUrl(oldUrl);
}

// ----------------------------------------------------------------------

type UseTracksResult = {
  tracks: TrackRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

/**
 * Reads the live `tracks` table. Used by the admin panel; public pages keep
 * using the bundled JSON for now (we'll switch them after the image-upload
 * step lands so we don't change two big things at once).
 */
export function useTracks(): UseTracksResult {
  const [tracks, setTracks] = useState<TrackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllTracks();
      setTracks(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tracks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tracks, loading, error, reload };
}
