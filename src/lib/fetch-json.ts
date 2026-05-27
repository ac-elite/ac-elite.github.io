import { supabaseBaseUrl, supabaseReadConfigured } from 'src/centralized/supabase-rest';

const APP_BASE_URL = import.meta.env.BASE_URL;

/** Storage bucket the `sync-kmr-data` Edge Function publishes to. */
const KMR_BUCKET = 'kmr-data';

/**
 * Live data paths published to Supabase Storage by the `sync-kmr-data` Edge
 * Function. The old GitHub Actions JSON backups have been retired.
 */
const SUPABASE_BACKED_FILES: Record<string, string> = {
  '/data/rank.json': 'rank.json',
  '/data/leaderboard.json': 'leaderboard.json',
  '/data/metadata.json': 'metadata.json',
};

/** Opt out of the Supabase data source with VITE_SUPABASE_KMR_DATA=0/false/off. */
function kmrSupabaseDisabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_KMR_DATA?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

function supabaseStorageUrl(objectName: string): string | null {
  if (kmrSupabaseDisabled() || !supabaseReadConfigured()) return null;
  return `${supabaseBaseUrl()}/storage/v1/object/public/${KMR_BUCKET}/${objectName}`;
}

function resolveFetchUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedBase = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${normalizedBase}${path}`;
}

async function fetchJsonAt<T>(requestUrl: string): Promise<T> {
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${requestUrl}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const backedObject = SUPABASE_BACKED_FILES[url];
  if (backedObject) {
    const storageUrl = supabaseStorageUrl(backedObject);
    if (!storageUrl) {
      throw new Error(`Supabase live data is not configured for ${url}`);
    }
    return fetchJsonAt<T>(storageUrl);
  }
  return fetchJsonAt<T>(resolveFetchUrl(url));
}
