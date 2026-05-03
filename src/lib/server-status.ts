/**
 * Live server track uit Supabase (`server_status`), gevuld door Edge Function + cron-job.org.
 * Zie scripts/supabase-server-status.sql voor setup.
 *
 * Zonder `VITE_SUPABASE_LIVE_SERVER_STATUS`: als `VITE_SUPABASE_URL` + anon key gezet zijn,
 * wordt één keer (en daarna periodiek na succes) uit `server_status` gelezen. Zo volgt
 * “time ago” de cron, niet alleen `public/data/current-track.json`.
 * Uitzetten: `VITE_SUPABASE_LIVE_SERVER_STATUS=0` (of `false` / `off`).
 */

import {
  type AcServerInfo,
  parseAcServerInfo,
  mergeInfoWhenPreferringLiveSnapshot,
} from 'src/lib/server-info';

/** Poll-interval zodra live `server_status`-reads succesvol zijn (of expliciet geforceerd). */
export const LIVE_SERVER_STATUS_POLL_MS = 90_000;

type LiveServerFetchState = 'unknown' | 'ok' | 'missing';

let liveServerFetchState: LiveServerFetchState = 'unknown';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Opt-in debug: `?serverStatusDebug=1` of localStorage `acelite:server-status-debug=1`. */
export function isServerStatusDebugEnabled(): boolean {
  const env = import.meta.env.VITE_SERVER_STATUS_DEBUG?.trim().toLowerCase();
  if (env === '1' || env === 'true' || env === 'yes') return true;
  if (!isBrowser()) return false;
  const qp = new URLSearchParams(window.location.search).get('serverStatusDebug')?.toLowerCase();
  if (qp === '1' || qp === 'true' || qp === 'yes') return true;
  const ls = window.localStorage.getItem('acelite:server-status-debug')?.toLowerCase();
  return ls === '1' || ls === 'true' || ls === 'yes';
}

export type CurrentTrackPayload = {
  online: boolean;
  track: string;
  fetchedAt: string;
  /** Volledige /INFO snapshot (track al genormaliseerd door Edge/workflow). */
  info?: AcServerInfo | null;
};

function supabaseReadConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

function explicitLiveServerDisabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_LIVE_SERVER_STATUS?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

function explicitLiveServerEnabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_LIVE_SERVER_STATUS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Eén REST-read naar `server_status` is toegestaan (keys aan, niet expliciet uit). */
export function canAttemptLiveServerStatusFetch(): boolean {
  if (!supabaseReadConfigured()) return false;
  if (explicitLiveServerDisabled()) return false;
  if (explicitLiveServerEnabled()) return true;
  return liveServerFetchState !== 'missing';
}

/** Na eerste geslaagde read (of bij expliciet aan): periodiek pollen. */
export function shouldPollLiveServerStatus(): boolean {
  if (!canAttemptLiveServerStatusFetch()) return false;
  return explicitLiveServerEnabled() || liveServerFetchState === 'ok';
}

function preferLiveServerSnapshotInMerge(): boolean {
  return explicitLiveServerEnabled() || liveServerFetchState === 'ok';
}

/** @deprecated Gebruik `shouldPollLiveServerStatus`; zelfde gedrag. */
export function isSupabaseLiveServerStatusEnabled(): boolean {
  return shouldPollLiveServerStatus();
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
  if (!canAttemptLiveServerStatusFetch()) return null;
  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/server_status?id=eq.1&select=online,track,fetched_at,info`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) {
      if (isServerStatusDebugEnabled()) {
        console.warn('[server-status] Supabase fetch not ok', { status: res.status, statusText: res.statusText });
      }
      if (!explicitLiveServerEnabled()) liveServerFetchState = 'missing';
      return null;
    }
    const data: unknown = await res.json();
    if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') {
      if (!explicitLiveServerEnabled()) liveServerFetchState = 'missing';
      return null;
    }
    const row = data[0] as {
      online?: unknown;
      track?: unknown;
      fetched_at?: unknown;
      info?: unknown;
    };
    const online = Boolean(row.online);
    const track = typeof row.track === 'string' ? row.track : '';
    const rawAt = row.fetched_at;
    let fetchedAt = typeof rawAt === 'string' ? rawAt : '';
    if (!fetchedAt && rawAt != null) fetchedAt = String(rawAt);
    if (!fetchedAt) {
      if (isServerStatusDebugEnabled()) {
        console.warn('[server-status] Supabase row missing fetched_at', { row });
      }
      if (!explicitLiveServerEnabled()) liveServerFetchState = 'missing';
      return null;
    }
    const info = parseAcServerInfo(row.info);
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] Supabase row', {
        fetchedAt,
        online,
        track,
        clients: info?.clients,
        maxclients: info?.maxclients,
        session: info?.session,
        sessiontypes: info?.sessiontypes,
      });
    }
    liveServerFetchState = 'ok';
    return { online, track, fetchedAt, info: info ?? null };
  } catch (error) {
    if (isServerStatusDebugEnabled()) {
      console.warn('[server-status] Supabase fetch failed', { error });
    }
    if (!explicitLiveServerEnabled()) liveServerFetchState = 'missing';
    return null;
  }
}

function parseTime(iso: string | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Kiest static vs live server-snapshot.
 * Zodra live `server_status` bereikbaar is, wint die snapshot: `fetchedAt` volgt de cron/Edge,
 * terwijl `current-track.json` een nieuwere (maar minder frequente) GitHub-timestamp kan hebben.
 */
export function pickNewerCurrentTrack(
  staticJson: CurrentTrackPayload | null,
  live: CurrentTrackPayload | null
): CurrentTrackPayload | null {
  if (!live) {
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> static (no live)', {
        staticFetchedAt: staticJson?.fetchedAt,
        staticClients: staticJson?.info?.clients,
      });
    }
    return staticJson;
  }
  if (!staticJson) {
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> live (no static)', {
        liveFetchedAt: live.fetchedAt,
        liveClients: live.info?.clients,
      });
    }
    return live;
  }
  if (preferLiveServerSnapshotInMerge()) {
    const tLive = live.track?.trim();
    const tStatic = staticJson.track?.trim();
    const liveInfo = parseAcServerInfo(live.info);
    const staticInfo = parseAcServerInfo(staticJson.info);
    const info = mergeInfoWhenPreferringLiveSnapshot(liveInfo, staticInfo) ?? null;
    if (live.online && !tLive && tStatic) {
      const merged = { ...live, track: tStatic, info };
      if (isServerStatusDebugEnabled()) {
        console.info('[server-status] pickNewerCurrentTrack -> merged/live with static track', {
          staticFetchedAt: staticJson.fetchedAt,
          staticClients: staticInfo?.clients,
          liveFetchedAt: live.fetchedAt,
          liveClients: liveInfo?.clients,
          finalClients: merged.info?.clients,
        });
      }
      return merged;
    }
    const merged = { ...live, info };
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> merged/live', {
        staticFetchedAt: staticJson.fetchedAt,
        staticClients: staticInfo?.clients,
        liveFetchedAt: live.fetchedAt,
        liveClients: liveInfo?.clients,
        finalClients: merged.info?.clients,
      });
    }
    return merged;
  }
  const chosen = parseTime(live.fetchedAt) >= parseTime(staticJson.fetchedAt) ? live : staticJson;
  if (isServerStatusDebugEnabled()) {
    console.info('[server-status] pickNewerCurrentTrack -> timestamp compare', {
      staticFetchedAt: staticJson.fetchedAt,
      staticClients: staticJson.info?.clients,
      liveFetchedAt: live.fetchedAt,
      liveClients: live.info?.clients,
      finalClients: chosen.info?.clients,
    });
  }
  return chosen;
}

/** Admin / loose JSON → vaste vorm voor merge. */
export function toCurrentTrackPayload(row: {
  online?: boolean;
  track?: string;
  fetchedAt?: string;
  info?: unknown;
} | null): CurrentTrackPayload | null {
  if (!row) return null;
  const info = parseAcServerInfo(row.info);
  return {
    online: Boolean(row.online),
    track: typeof row.track === 'string' ? row.track : '',
    fetchedAt: typeof row.fetchedAt === 'string' ? row.fetchedAt : '',
    info: info ?? undefined,
  };
}
