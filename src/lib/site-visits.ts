const SESSION_KEY = 'ace:site-visit-recorded';
const PENDING = 'pending';
const DONE = '1';

// ----------------------------------------------------------------------

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
  const n = (data[0] as { visit_count?: unknown }).visit_count;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
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
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  } catch {
    return null;
  }
}

/**
 * Records one visit per browser tab session (sessionStorage).
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
