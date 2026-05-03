/**
 * Live server track uit Supabase (`server_status`), gevuld door Edge Function + cron-job.org.
 * Zie scripts/supabase-server-status.sql voor setup.
 */

/** Poll-interval wanneer VITE_SUPABASE_LIVE_SERVER_STATUS aan staat. */
export const LIVE_SERVER_STATUS_POLL_MS = 90_000;

export type CurrentTrackPayload = {
  online: boolean;
  track: string;
  fetchedAt: string;
};

function supabaseReadConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/** Site poll + merge met static JSON alleen als dit true is. */
export function isSupabaseLiveServerStatusEnabled(): boolean {
  if (!supabaseReadConfigured()) return false;
  const v = import.meta.env.VITE_SUPABASE_LIVE_SERVER_STATUS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function supabaseHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
  };
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

function supabaseBaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL!.trim().replace(/\/$/, '');
}

/** Eén rij uit PostgREST, of null bij fout / lege response. */
export async function fetchLiveServerStatusFromSupabase(): Promise<CurrentTrackPayload | null> {
  if (!isSupabaseLiveServerStatusEnabled()) return null;
  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/server_status?id=eq.1&select=online,track,fetched_at`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') return null;
    const row = data[0] as {
      online?: unknown;
      track?: unknown;
      fetched_at?: unknown;
    };
    const online = Boolean(row.online);
    const track = typeof row.track === 'string' ? row.track : '';
    const rawAt = row.fetched_at;
    let fetchedAt = typeof rawAt === 'string' ? rawAt : '';
    if (!fetchedAt && rawAt != null) fetchedAt = String(rawAt);
    if (!fetchedAt) return null;
    return { online, track, fetchedAt };
  } catch {
    return null;
  }
}

function parseTime(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Kiest de nieuwste bron voor eerste paint (static Git JSON vs Supabase). */
export function pickNewerCurrentTrack(
  staticJson: CurrentTrackPayload | null,
  live: CurrentTrackPayload | null
): CurrentTrackPayload | null {
  if (!live) return staticJson;
  if (!staticJson) return live;
  return parseTime(live.fetchedAt) >= parseTime(staticJson.fetchedAt) ? live : staticJson;
}

/** Admin / loose JSON → vaste vorm voor merge. */
export function toCurrentTrackPayload(row: {
  online?: boolean;
  track?: string;
  fetchedAt?: string;
} | null): CurrentTrackPayload | null {
  if (!row) return null;
  return {
    online: Boolean(row.online),
    track: typeof row.track === 'string' ? row.track : '',
    fetchedAt: typeof row.fetchedAt === 'string' ? row.fetchedAt : '',
  };
}
