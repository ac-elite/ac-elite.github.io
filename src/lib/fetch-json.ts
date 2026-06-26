import {
  supabaseFetch,
  supabaseBaseUrl,
  supabaseReadConfigured,
  SUPABASE_STORAGE_TIMEOUT_MS,
} from 'src/centralized/supabase-rest';

const APP_BASE_URL = import.meta.env.BASE_URL;

/** Storage bucket the `sync-kmr-data` Edge Function publishes to. */
const KMR_BUCKET = 'kmr-data';

/**
 * Static data paths that are also published to Supabase Storage by the
 * `sync-kmr-data` Edge Function. Mapped to their object name in the bucket.
 * For these, we try Supabase first (fresher — synced every ~15 min, no Pages
 * rebuild) and fall back to the static file the GitHub Action still commits.
 */
const SUPABASE_BACKED_FILES: Record<string, string> = {
  '/data/rank.json': 'rank.json',
  '/data/leaderboard.json': 'leaderboard.json',
  '/data/metadata.json': 'metadata.json',
};

const VERSIONED_KMR_OBJECTS = new Set(['rank.json', 'leaderboard.json']);
const KMR_VERSION_CACHE_MS = 30_000;

let kmrVersionCache: { value: string | null; expiresAt: number } = {
  value: null,
  expiresAt: 0,
};
let kmrVersionPromise: Promise<string | null> | null = null;

/** Opt out of Supabase Storage for the large KMR JSON blobs. */
function kmrStorageDisabled(): boolean {
  const v = (
    import.meta.env.VITE_SUPABASE_KMR_STORAGE ??
    import.meta.env.VITE_SUPABASE_KMR_DATA
  )?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

function supabaseStorageUrl(objectName: string): string | null {
  if (kmrStorageDisabled() || !supabaseReadConfigured()) return null;
  return `${supabaseBaseUrl()}/storage/v1/object/public/${KMR_BUCKET}/${objectName}`;
}

function appendVersion(url: string, version: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

async function fetchKmrStorageVersion(): Promise<string | null> {
  if (Date.now() < kmrVersionCache.expiresAt) return kmrVersionCache.value;
  if (kmrVersionPromise) return kmrVersionPromise;

  const metadataUrl = supabaseStorageUrl('metadata.json');
  if (!metadataUrl) return null;

  kmrVersionPromise = (async () => {
    try {
      const meta = await fetchJsonAt<{ lastSync?: string }>(metadataUrl, {
        cache: 'no-cache',
        supabase: true,
        timeoutMs: SUPABASE_STORAGE_TIMEOUT_MS,
      });
      const version = typeof meta.lastSync === 'string' && meta.lastSync.trim() ? meta.lastSync : null;
      kmrVersionCache = { value: version, expiresAt: Date.now() + KMR_VERSION_CACHE_MS };
      return version;
    } catch {
      kmrVersionCache = { value: null, expiresAt: Date.now() + 5_000 };
      return null;
    } finally {
      kmrVersionPromise = null;
    }
  })();

  return kmrVersionPromise;
}

function resolveFetchUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const normalizedBase = APP_BASE_URL.endsWith('/') ? APP_BASE_URL : `${APP_BASE_URL}/`;
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${normalizedBase}${path}`;
}

async function fetchJsonAt<T>(
  requestUrl: string,
  options: { cache?: RequestCache; supabase?: boolean; timeoutMs?: number } = {}
): Promise<T> {
  // `no-cache` (not default): always revalidate with the origin (If-None-Match)
  // so realtime sync refetches see fresh metadata/rank after each ~15-min publish.
  // Default fetch + Supabase Storage’s default `max-age=3600` served stale JSON for
  // up to an hour. Unlike `no-store`, unchanged files can still answer `304` (~300 B).
  const init: RequestInit = { cache: options.cache ?? 'no-cache' };
  const res = options.supabase
    ? await supabaseFetch(requestUrl, init, { timeoutMs: options.timeoutMs ?? SUPABASE_STORAGE_TIMEOUT_MS })
    : await fetch(requestUrl, init);
  if (!res.ok) throw new Error(`Failed to fetch ${requestUrl}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function fetchJson<T>(url: string): Promise<T> {
  const backedObject = SUPABASE_BACKED_FILES[url];
  if (backedObject) {
    const storageUrl = supabaseStorageUrl(backedObject);
    if (storageUrl) {
      try {
        const version = VERSIONED_KMR_OBJECTS.has(backedObject)
          ? await fetchKmrStorageVersion()
          : null;
        const requestUrl = version ? appendVersion(storageUrl, version) : storageUrl;
        return await fetchJsonAt<T>(requestUrl, {
          cache: VERSIONED_KMR_OBJECTS.has(backedObject) ? 'force-cache' : 'no-cache',
          supabase: true,
          timeoutMs: SUPABASE_STORAGE_TIMEOUT_MS,
        });
      } catch {
        // Supabase unreachable / bucket empty — fall back to the static file.
      }
    }
  }
  return fetchJsonAt<T>(resolveFetchUrl(url));
}

/**
 * Always fetch the static file committed to the repo (the GitHub Actions
 * backup), bypassing the Supabase Storage source. Used by the admin sync-status
 * panel to compare the live source against the backup.
 */
export async function fetchStaticJson<T>(url: string): Promise<T> {
  return fetchJsonAt<T>(resolveFetchUrl(url));
}
