/**
 * Arbitrary-window community deltas, backed by the Supabase `rank_history`
 * table (slim hourly snapshots written by the `sync-kmr-data` Edge Function).
 *
 * This is the "better than 24h" upgrade: instead of one fixed daily snapshot
 * (`rank-24h.json`), the site can compare against 1h / 24h / 7d / 30d ago.
 * Falls back to no-baseline when Supabase is unavailable; callers can then keep
 * showing the legacy `rank-24h.json` comparison from `delta.ts`.
 */
import { supabaseBaseUrl, supabaseHeaders, supabaseReadConfigured } from 'src/centralized/supabase-rest';
import {
  getDriverSR,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
} from 'src/lib/ac-elite-data';
import type { DriverDelta } from 'src/lib/delta';

/**
 * Slim per-driver record stored in `rank_history.drivers` (see sync-kmr-data).
 * `sr` / `pace` are only present on snapshots taken after the Edge Function was
 * upgraded to compute them — older snapshots leave them undefined.
 */
type SlimDriver = {
  g: string;
  p: number;
  k: number;
  w: number;
  pd: number;
  pl: number;
  fl: number;
  i: number;
  c: number;
  sr?: number;
  pace?: number;
};

export type HistoryWindowKey = '1h' | '24h' | '7d' | '30d';

export const HISTORY_WINDOWS: { key: HistoryWindowKey; label: string; ms: number }[] = [
  { key: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { key: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

export type RankHistorySnapshot = {
  capturedAt: string;
  byGuid: Map<string, SlimDriver>;
};

function kmrSupabaseDisabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_KMR_DATA?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

/**
 * Fetch the `rank_history` snapshot closest to (now - window), taken at or
 * before the target so the delta spans at least the requested window. Returns
 * null when Supabase is unavailable or no snapshot is old enough yet.
 */
export async function fetchRankHistorySnapshot(
  window: HistoryWindowKey
): Promise<RankHistorySnapshot | null> {
  if (kmrSupabaseDisabled() || !supabaseReadConfigured()) return null;
  const win = HISTORY_WINDOWS.find((w) => w.key === window);
  if (!win) return null;
  const target = new Date(Date.now() - win.ms).toISOString();
  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/rank_history` +
        `?captured_at=lte.${encodeURIComponent(target)}` +
        `&select=captured_at,drivers&order=captured_at.desc&limit=1`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { captured_at?: string; drivers?: SlimDriver[] }[];
    const row = rows?.[0];
    if (!row || typeof row.captured_at !== 'string' || !Array.isArray(row.drivers)) return null;
    const byGuid = new Map<string, SlimDriver>();
    for (const d of row.drivers) {
      if (d && typeof d.g === 'string' && d.g) byGuid.set(d.g, d);
    }
    return { capturedAt: row.captured_at, byGuid };
  } catch {
    return null;
  }
}

/** Oldest snapshot timestamp in `rank_history`, or null when none / unavailable. */
export async function fetchRankHistoryOldest(): Promise<string | null> {
  if (kmrSupabaseDisabled() || !supabaseReadConfigured()) return null;
  try {
    const res = await fetch(
      `${supabaseBaseUrl()}/rest/v1/rank_history?select=captured_at&order=captured_at.asc&limit=1`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { captured_at?: string }[];
    return typeof rows?.[0]?.captured_at === 'string' ? rows[0].captured_at : null;
  } catch {
    return null;
  }
}

/**
 * Window keys that already have a snapshot old enough to compare against.
 * Used to disable selector buttons until enough history has accumulated.
 *
 * `24h` is always included: the `rank-24h.json` baseline (maintained by the
 * GitHub Actions daily snapshot) covers it even before `rank_history` has a
 * full day of depth, so the proven 24h comparison is never greyed out.
 */
export function availableHistoryWindows(oldestIso: string | null): Set<HistoryWindowKey> {
  const set = new Set<HistoryWindowKey>(['24h']);
  if (!oldestIso) return set;
  const oldestMs = new Date(oldestIso).getTime();
  if (!Number.isFinite(oldestMs)) return set;
  const now = Date.now();
  for (const w of HISTORY_WINDOWS) {
    if (oldestMs <= now - w.ms) set.add(w.key);
  }
  return set;
}

export type CommunityWindowDelta = {
  hasBaseline: boolean;
  capturedAt: string | null;
  deltaKm: number;
  deltaWins: number;
  newDrivers: number;
};

export type DriverWindowDelta = {
  hasBaseline: boolean;
  deltaKm: number;
  deltaPoints: number;
  deltaWins: number;
};

/** One driver's change between `snapshot` and now. No baseline if the driver
 *  wasn't present in the snapshot (joined after it was taken). */
export function computeDriverWindowDelta(
  driver: RankDriver | null | undefined,
  snapshot: RankHistorySnapshot | null
): DriverWindowDelta {
  const empty: DriverWindowDelta = {
    hasBaseline: false,
    deltaKm: 0,
    deltaPoints: 0,
    deltaWins: 0,
  };
  if (!driver || !snapshot) return empty;
  const base = snapshot.byGuid.get(driver.guid);
  if (!base) return empty;
  return {
    hasBaseline: true,
    deltaKm: Math.round((driver.kilometers || 0) - base.k),
    deltaPoints: Math.round((driver.points || 0) - base.p),
    deltaWins: (driver.wins || 0) - base.w,
  };
}

/** Community-wide change between `snapshot` and the current rank data. */
export function computeCommunityWindowDelta(
  current: RankDriver[],
  snapshot: RankHistorySnapshot | null
): CommunityWindowDelta {
  if (!snapshot || snapshot.byGuid.size === 0) {
    return { hasBaseline: false, capturedAt: null, deltaKm: 0, deltaWins: 0, newDrivers: 0 };
  }
  let baseKm = 0;
  let baseWins = 0;
  for (const d of snapshot.byGuid.values()) {
    baseKm += d.k;
    baseWins += d.w;
  }
  let curKm = 0;
  let curWins = 0;
  let newDrivers = 0;
  for (const d of current) {
    curKm += d.kilometers || 0;
    curWins += d.wins || 0;
    if (!snapshot.byGuid.has(d.guid)) newDrivers += 1;
  }
  return {
    hasBaseline: true,
    capturedAt: snapshot.capturedAt,
    deltaKm: Math.round(curKm - baseKm),
    deltaWins: curWins - baseWins,
    newDrivers,
  };
}

const DELTA_EPSILON = 0.001;

/**
 * Per-driver Safety Rating + license-pace deltas between `snapshot` and now.
 * Returns the same `Map<guid, DriverDelta>` shape as `computeDeltas` in
 * delta.ts, so the existing per-row DeltaChips can consume it directly.
 *
 * Drivers whose baseline snapshot predates SR/pace capture (older snapshots)
 * are skipped — those windows fill in as newer snapshots accumulate.
 */
export function computeWindowedDeltas(
  current: RankDriver[],
  snapshot: RankHistorySnapshot | null
): Map<string, DriverDelta> {
  const deltas = new Map<string, DriverDelta>();
  if (!snapshot || snapshot.byGuid.size === 0) return deltas;
  const licenseMap = computeLicenseMap(current);
  for (const driver of current) {
    const base = snapshot.byGuid.get(driver.guid);
    if (!base || base.sr == null || base.pace == null) continue;
    const curSR = getDriverSR(driver).sr;
    const curPace = getDriverLicense(driver, licenseMap).paceScore;
    const deltaSR = curSR - base.sr;
    const deltaPace = curPace - base.pace;
    if (Math.abs(deltaSR) > DELTA_EPSILON || Math.abs(deltaPace) > DELTA_EPSILON) {
      deltas.set(driver.guid, { deltaPace, deltaSR });
    }
  }
  return deltas;
}
