/**
 * Live lobby row from Supabase (`server_status`), filled by Edge Function + cron-job.org.
 * See `scripts/supabase-server-status.sql` for setup.
 *
 * Without `VITE_SUPABASE_LIVE_SERVER_STATUS`: if `VITE_SUPABASE_URL` + anon key are set,
 * one read (then periodic after success) from `server_status` is allowed so “time ago” follows
 * the cron, not only `public/data/current-track.json`.
 * Disable with `VITE_SUPABASE_LIVE_SERVER_STATUS=0` (or `false` / `off`).
 */

import {
  type AcServerInfo,
  parseAcServerInfo,
  mergeInfoStaticOverlayLive,
  mergeInfoWhenPreferringLiveSnapshot,
} from 'src/lib/server-info';
import { applyCurrentTrackMock } from 'src/centralized/current-track-mock';
import { supabaseBaseUrl, supabaseHeaders, supabaseReadConfigured } from 'src/centralized/supabase-rest';

/** Browser poll interval once live `server_status` reads succeed (or when forced on). */
export const LIVE_SERVER_STATUS_POLL_MS = 90_000;

type LiveServerFetchState = 'unknown' | 'ok' | 'missing';

let liveServerFetchState: LiveServerFetchState = 'unknown';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Opt-in debug via query param: `?serverStatusDebug=1`. */
export function isServerStatusDebugEnabled(): boolean {
  if (!isBrowser()) return false;
  const qp = new URLSearchParams(window.location.search).get('serverStatusDebug')?.toLowerCase();
  return qp === '1' || qp === 'true' || qp === 'yes';
}

export type CurrentTrackPayload = {
  online: boolean;
  track: string;
  fetchedAt: string;
  /** Full /INFO snapshot (track normalized by Edge/workflow). */
  info?: AcServerInfo | null;
};

/** Treats `1` / `true` / `yes` / `on` as enabled (case-insensitive). */
function isServerOfflineDebugRawOn(raw: string | null | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * When enabled, server payloads behave as if the AC Elite server is offline (`online: false`)
 * so you can test join card / fallback UI without stopping the real server.
 *
 * - URL: `?serverOfflineDebug=1` (or `on`, `true`, …)
 */
export function isServerOfflineDebugEnabled(): boolean {
  if (!isBrowser()) return false;
  const qp = new URLSearchParams(window.location.search).get('serverOfflineDebug');
  return isServerOfflineDebugRawOn(qp);
}

/** If offline debug is on, force `online: false` on the payload (rest unchanged). */
export function applyServerOfflineDebug(payload: CurrentTrackPayload | null): CurrentTrackPayload | null {
  if (!payload || !isServerOfflineDebugEnabled()) return payload;
  return { ...payload, online: false };
}

function explicitLiveServerDisabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_LIVE_SERVER_STATUS?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

function explicitLiveServerEnabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_LIVE_SERVER_STATUS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** One REST read to `server_status` is allowed (keys present, not explicitly disabled). */
export function canAttemptLiveServerStatusFetch(): boolean {
  if (!supabaseReadConfigured()) return false;
  if (explicitLiveServerDisabled()) return false;
  if (explicitLiveServerEnabled()) return true;
  return liveServerFetchState !== 'missing';
}

/** After first successful read (or when explicitly enabled): poll periodically. */
export function shouldPollLiveServerStatus(): boolean {
  if (!canAttemptLiveServerStatusFetch()) return false;
  return explicitLiveServerEnabled() || liveServerFetchState === 'ok';
}

/** @deprecated Use `shouldPollLiveServerStatus` — same behaviour. */
export function isSupabaseLiveServerStatusEnabled(): boolean {
  return shouldPollLiveServerStatus();
}

/** Single PostgREST row, or null on error / empty response. */
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

/**
 * Merges live server_status with static `current-track.json`.
 * Live wins for `online` and `fetchedAt`. Track + /INFO: live when online; when offline, prefer
 * static for last driven track and richer last-known lobby (static overlays live on same keys).
 */
export function pickNewerCurrentTrack(
  staticJson: CurrentTrackPayload | null,
  live: CurrentTrackPayload | null
): CurrentTrackPayload | null {
  let result: CurrentTrackPayload | null;

  if (!live) {
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> static (no live)', {
        staticFetchedAt: staticJson?.fetchedAt,
        staticClients: staticJson?.info?.clients,
      });
    }
    result = staticJson;
  } else if (!staticJson) {
    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> live (no static)', {
        liveFetchedAt: live.fetchedAt,
        liveClients: live.info?.clients,
      });
    }
    result = live;
  } else {
    const tLive = live.track?.trim() ?? '';
    const tStatic = staticJson.track?.trim() ?? '';
    const liveInfo = parseAcServerInfo(live.info);
    const staticInfo = parseAcServerInfo(staticJson.info);
    const online = live.online;

    let track = tLive;
    if (online && !tLive && tStatic) {
      track = tStatic;
    } else if (!online && (tStatic || tLive)) {
      track = tStatic || tLive;
    }

    const info = online
      ? mergeInfoWhenPreferringLiveSnapshot(liveInfo, staticInfo) ?? null
      : mergeInfoStaticOverlayLive(liveInfo, staticInfo) ?? staticInfo ?? liveInfo ?? null;

    result = {
      ...live,
      online,
      fetchedAt: live.fetchedAt,
      track,
      info,
    };

    if (isServerStatusDebugEnabled()) {
      console.info('[server-status] pickNewerCurrentTrack -> merged', {
        online,
        track,
        staticFetchedAt: staticJson.fetchedAt,
        liveFetchedAt: live.fetchedAt,
      });
    }
  }

  return applyCurrentTrackMock(applyServerOfflineDebug(result));
}

/** Normalize admin / loose JSON into the merge payload shape. */
export function toCurrentTrackPayload(row: {
  online?: boolean;
  track?: string;
  fetchedAt?: string;
  info?: unknown;
} | null): CurrentTrackPayload | null {
  if (!row) return null;
  const info = parseAcServerInfo(row.info);
  return applyCurrentTrackMock({
    online: Boolean(row.online),
    track: typeof row.track === 'string' ? row.track : '',
    fetchedAt: typeof row.fetchedAt === 'string' ? row.fetchedAt : '',
    info: info ?? undefined,
  });
}
