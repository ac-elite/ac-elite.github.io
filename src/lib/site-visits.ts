const SESSION_KEY = 'ace:site-visit-recorded';
const PENDING = 'pending';
const DONE = '1';

// ----------------------------------------------------------------------

/** Mod-only routes: do not increment global “public” visit stats. */
export function isPathExcludedFromSiteVisitCount(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/admin' || p.startsWith('/admin/');
}

export function isSiteVisitsConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

function supabaseHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
  };
  // New platform keys (sb_publishable_ / sb_secret_) are not JWTs — do not use Bearer.
  // Legacy anon JWT still uses Authorization for PostgREST.
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

function supabaseBaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL!.trim().replace(/\/$/, '');
}

/** Postgres bigint / numeric often arrives as string in JSON. */
function parseFiniteNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') {
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  }
  if (Array.isArray(raw) && raw.length === 1) return parseFiniteNumber(raw[0]);
  return null;
}

/** Current total from `site_stats` (read-only). */
export async function fetchSiteVisitCount(): Promise<number | null> {
  if (!isSiteVisitsConfigured()) return null;
  const res = await fetch(
    `${supabaseBaseUrl()}/rest/v1/site_stats?id=eq.1&select=visit_count`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') return null;
  const raw = (data[0] as { visit_count?: unknown }).visit_count;
  return parseFiniteNumber(raw);
}

/** Increments global counter via RPC (one per browser session). */
async function incrementSiteVisit(): Promise<number | null> {
  const res = await fetch(`${supabaseBaseUrl()}/rest/v1/rpc/increment_site_visits`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: '{}',
  });
  if (!res.ok) return null;
  const text = await res.text();
  try {
    const val: unknown = JSON.parse(text);
    return parseFiniteNumber(val);
  } catch {
    return null;
  }
}

/**
 * Records one visit per browser tab session (`sessionStorage`), first eligible load only.
 * Call when the user is on a route that should count (e.g. not `/admin`).
 * Safe under React StrictMode: concurrent mounts share the same pending flag.
 */
export function recordVisitOncePerSession(): void {
  if (typeof window === 'undefined' || !isSiteVisitsConfigured()) return;

  const cur = sessionStorage.getItem(SESSION_KEY);
  if (cur === DONE || cur === PENDING) return;
  sessionStorage.setItem(SESSION_KEY, PENDING);

  void incrementSiteVisit().then(
    (n) => {
      if (n != null) sessionStorage.setItem(SESSION_KEY, DONE);
      else sessionStorage.removeItem(SESSION_KEY);
    },
    () => sessionStorage.removeItem(SESSION_KEY)
  );
}
