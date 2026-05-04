/** localStorage: epoch ms of last successful increment (same browser, any tab). */
const LAST_COUNTED_AT_KEY = 'ace:site-visit-last-counted-at';

/**
 * Min time between counted visits for one browser. After this gap, a return to the site counts
 * again (e.g. three separate sit-downs in a day → +3). Navigating pages within one visit does not.
 */
export const SITE_VISIT_COUNT_GAP_MINUTES = 10;
const VISIT_COUNT_GAP_MS = SITE_VISIT_COUNT_GAP_MINUTES * 60 * 1000;

/** Avoid overlapping RPC calls (e.g. React StrictMode double effect). */
let visitIncrementInFlight = false;

/**
 * Cooldown for per-page stats (same origin, all tabs/windows).
 * Prevents F5-spam from creating artificial spikes and avoids unnecessary RPC load.
 *
 * Note: `sessionStorage` is per-tab only, so several tabs opened to the same path within the
 * cooldown window each counted once — we persist cooldown timestamps in `localStorage` instead
 * so parallel tabs share the same throttle.
 */
const PAGE_STAT_COOLDOWN_MS = 7_000;
const PAGE_STAT_COOLDOWN_KEY_PREFIX = 'ace:site-page-stat-last-at:v3:';

/**
 * In-memory fallback if localStorage is unavailable (private mode, blocked storage, etc.).
 * Also helps dedupe immediate same-tick calls in React StrictMode.
 */
const pageStatCooldownMemory = new Map<string, number>();

/**
 * Disable analytics writes during local development so manual testing does not pollute production stats.
 * Kept runtime-based (hostname) so it also works for production builds run locally.
 */
function isAnalyticsWriteDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function readLastCountedAtMs(): number {
  try {
    const raw = localStorage.getItem(LAST_COUNTED_AT_KEY);
    if (raw == null) return NaN;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  } catch {
    return NaN;
  }
}

function writeLastCountedAtMs(ms: number): void {
  try {
    localStorage.setItem(LAST_COUNTED_AT_KEY, String(ms));
  } catch {
    /* private mode / blocked storage — counter still incremented server-side */
  }
}

// ----------------------------------------------------------------------

/** Mod-only routes: do not increment global “public” visit stats. */
export function isPathExcludedFromSiteVisitCount(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/admin' || p.startsWith('/admin/');
}

/**
 * Single bucket for all driver profile URLs so the per-route table stays readable.
 * Must match what we send to `increment_site_visits` (stored in `site_page_stats.path`).
 */
export function normalizePathForVisitStats(pathname: string): string {
  const trimmed = pathname.trim() || '/';
  const p = trimmed.replace(/\/+$/, '') || '/';
  if (p.length > 200) {
    return `${p.slice(0, 197)}...`;
  }
  if (/^\/driver\/[^/]+$/i.test(p)) {
    return '/driver/:id';
  }
  return p;
}

export type SitePageVisitRow = { path: string; visit_count: number };

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

/** Per-route totals from `site_page_stats` (read-only), highest first. */
export async function fetchSitePageVisitCounts(limit = 40): Promise<SitePageVisitRow[] | null> {
  if (!isSiteVisitsConfigured()) return null;
  const res = await fetch(
    `${supabaseBaseUrl()}/rest/v1/site_page_stats?select=path,visit_count&order=visit_count.desc&limit=${limit}`,
    { headers: supabaseHeaders() }
  );
  if (!res.ok) return null;
  const data: unknown = await res.json();
  if (!Array.isArray(data)) return null;
  const rows: SitePageVisitRow[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object') continue;
    const r = row as { path?: unknown; visit_count?: unknown };
    if (typeof r.path !== 'string') continue;
    const c = parseFiniteNumber(r.visit_count);
    if (c === null) continue;
    rows.push({ path: r.path, visit_count: c });
  }
  return rows;
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

/** Increments global visit total only (per-route uses {@link incrementSitePageOnly}). */
async function incrementSiteVisit(): Promise<number | null> {
  // Named arg must match SQL (`p_path`); explicit value avoids PostgREST/default-arg edge cases vs `{}`.
  const res = await fetch(`${supabaseBaseUrl()}/rest/v1/rpc/increment_site_visits`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_path: '/' }),
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

async function incrementSitePageOnly(statsPath: string): Promise<boolean> {
  const res = await fetch(`${supabaseBaseUrl()}/rest/v1/rpc/increment_site_page_only`, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_path: statsPath }),
  });
  return res.ok;
}

function pageStatStorageKey(statsPath: string): string {
  return `${PAGE_STAT_COOLDOWN_KEY_PREFIX}${encodeURIComponent(statsPath)}`;
}

function readLastPageStatAtMs(statsPath: string): number {
  if (typeof window === 'undefined') return NaN;
  try {
    const raw = localStorage.getItem(pageStatStorageKey(statsPath));
    if (raw == null) return NaN;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  } catch {
    return NaN;
  }
}

function writeLastPageStatAtMs(statsPath: string, nowMs: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(pageStatStorageKey(statsPath), String(nowMs));
  } catch {
    /* storage unavailable — in-memory fallback is still used */
  }
}

/**
 * Serialize same-path page-stat checks across tabs/windows when supported (LockManager API).
 * This closes a race where many tabs opened at once can all pass the cooldown check.
 */
function runWithPageStatLock(statsPath: string, task: () => void): void {
  if (typeof window === 'undefined') {
    task();
    return;
  }

  type LockRequester = {
    request: (name: string, callback: () => void) => Promise<unknown>;
  };
  const maybeLocks = (window.navigator as Navigator & { locks?: LockRequester }).locks;
  if (!maybeLocks?.request) {
    task();
    return;
  }

  const lockName = `ace:page-stat:${statsPath}`;
  void maybeLocks.request(lockName, () => {
    task();
  });
}

function canRecordPageStatNow(statsPath: string, nowMs: number): boolean {
  const memoryLast = pageStatCooldownMemory.get(statsPath);
  if (typeof memoryLast === 'number' && nowMs - memoryLast < PAGE_STAT_COOLDOWN_MS) {
    return false;
  }

  const last = readLastPageStatAtMs(statsPath);
  if (Number.isFinite(last) && nowMs - last < PAGE_STAT_COOLDOWN_MS) {
    return false;
  }

  return true;
}

function markPageStatRecorded(statsPath: string, nowMs: number): void {
  pageStatCooldownMemory.set(statsPath, nowMs);
  writeLastPageStatAtMs(statsPath, nowMs);
}

/**
 * Bumps `site_page_stats` for the current route on every SPA navigation (public routes only).
 * Applies a short per-path cooldown so repeated refreshes do not inflate pageviews.
 */
export function recordSitePageStat(pathname: string): void {
  if (typeof window === 'undefined' || !isSiteVisitsConfigured()) return;
  if (isAnalyticsWriteDisabled()) return;
  if (isPathExcludedFromSiteVisitCount(pathname)) return;

  const statsPath = normalizePathForVisitStats(pathname);
  runWithPageStatLock(statsPath, () => {
    const now = Date.now();
    if (!canRecordPageStatNow(statsPath, now)) return;
    markPageStatRecorded(statsPath, now);
    void incrementSitePageOnly(statsPath);
  });
}

/**
 * Records a site visit when due: at most once per {@link SITE_VISIT_COUNT_GAP_MINUTES} minutes
 * per browser (`localStorage`, shared across tabs on this origin). Returning later the same day
 * after a gap counts again; clicking around the SPA does not.
 *
 * Call from a route that should count (caller should skip `/admin` via {@link isPathExcludedFromSiteVisitCount}).
 * `pathname` is only used for the public-route check. Per-route counts use {@link recordSitePageStat}.
 * Safe under React StrictMode: a module-level in-flight guard prevents duplicate global RPCs.
 */
export function recordSiteVisitIfDue(_pathname: string): void {
  if (typeof window === 'undefined' || !isSiteVisitsConfigured()) return;
  if (isAnalyticsWriteDisabled()) return;
  if (visitIncrementInFlight) return;

  const now = Date.now();
  const last = readLastCountedAtMs();
  if (Number.isFinite(last) && now - last < VISIT_COUNT_GAP_MS) return;

  visitIncrementInFlight = true;
  void incrementSiteVisit().then(
    (n) => {
      visitIncrementInFlight = false;
      if (n != null) {
        writeLastCountedAtMs(Date.now());
      }
    },
    () => {
      visitIncrementInFlight = false;
    }
  );
}
