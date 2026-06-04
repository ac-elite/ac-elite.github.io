/**
 * Session results, backed by the Supabase `sessions` table (one row per AC
 * server result file, written by the `sync-results` Edge Function).
 *
 * The list view reads summary columns with server-side filtering + pagination;
 * the detail view reads a single row including the full `detail` jsonb
 * (classification + laps + incidents). Falls back to empty when Supabase is
 * unavailable.
 */
import type { Theme, SxProps } from '@mui/material/styles';

import { GLASS_CHIP_SHEEN_SX } from 'src/lib/glass';
import { supabaseBaseUrl, supabaseHeaders, supabaseReadConfigured } from 'src/centralized/supabase-rest';
import {
  getTrackInfo,
  getTrackDisplayName,
  normalizeServerTrackId,
} from 'src/centralized/track-info';

/** Liquid-glass session-type chip styling, shared by the list table + detail hero. */
const chipSheen = GLASS_CHIP_SHEEN_SX as Record<string, unknown>;
export const TYPE_CHIP_SX: Record<string, SxProps<Theme>> = {
  RACE: { ...chipSheen, fontWeight: 700, bgcolor: 'rgba(34,197,94,0.16)', color: '#86efac', border: '1px solid rgba(34,197,94,0.42)' },
  QUALIFY: { ...chipSheen, fontWeight: 700, bgcolor: 'rgba(245,158,11,0.16)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.42)' },
  PRACTICE: { ...chipSheen, fontWeight: 700, bgcolor: 'rgba(148,163,184,0.16)', color: '#cbd5e1', border: '1px solid rgba(148,163,184,0.42)' },
};

export type SessionType = 'RACE' | 'QUALIFY' | 'PRACTICE';
export type SessionTypeFilter = SessionType | 'ALL';

export type SessionSummary = {
  id: number;
  session_file: string;
  type: SessionType;
  track_name: string | null;
  track_config: string | null;
  event_name: string | null;
  session_date: string | null;
  num_drivers: number;
  num_laps: number;
  num_incidents: number;
  best_lap_ms: number | null;
  best_lap_guid: string | null;
  best_lap_name: string | null;
  winner_guid: string | null;
  winner_name: string | null;
};

export type ClassificationRow = {
  pos: number;
  guid: string;
  name: string;
  carModel: string;
  skin: string;
  bestLapMs: number | null;
  totalTimeMs: number;
  numLaps: number;
  gridPosition: number;
  hasPenalty: boolean;
  penaltyTimeMs: number;
  lapPenalty: number;
  disqualified: boolean;
};

export type LapRow = {
  guid: string;
  name: string;
  lap: number;
  lapMs: number;
  sectors: number[];
  cuts: number;
  tyre: string;
};

export type IncidentRow = {
  type: 'CAR' | 'ENV';
  guid: string;
  name: string;
  otherGuid: string;
  otherName: string;
  /** Impact speed at contact in m/s (AC server `ImpactSpeed`; use {@link impactSpeedToKmh} to display). */
  impactSpeed: number;
  ts: number;
};

/** AC dedicated-server result JSON stores collision `ImpactSpeed` in m/s. */
export function impactSpeedToKmh(speedMps: number): number {
  if (!Number.isFinite(speedMps) || speedMps <= 0) return 0;
  return Math.round(speedMps * 3.6 * 10) / 10;
}

/**
 * Normalize AC `Timestamp` to epoch ms. Server result files use Unix **seconds**
 * (e.g. 1_778_787_868); treating that as session-ms produced values like 494h+.
 */
export function normalizeAcEventTimestamp(ts: number): number | null {
  if (!Number.isFinite(ts) || ts <= 0) return null;
  if (ts >= 1e12) return ts;
  if (ts >= 1e9) return Math.round(ts * 1000);
  return ts;
}

/** Earliest incident time in a session — baseline for relative elapsed display. */
export function incidentTimelineBaselineMs(incidents: readonly { ts: number }[]): number | null {
  let min: number | null = null;
  for (const inc of incidents) {
    const ms = normalizeAcEventTimestamp(inc.ts);
    if (ms == null) continue;
    if (min == null || ms < min) min = ms;
  }
  return min;
}

/** Elapsed since the first incident (or session-relative ms when already small). */
export function formatIncidentElapsed(ts: number, baselineMs: number | null): string {
  const eventMs = normalizeAcEventTimestamp(ts);
  if (eventMs == null) return '—';
  const base = baselineMs ?? eventMs;
  const delta = eventMs - base;
  if (delta < 0) return '—';
  if (delta === 0) return '0:00.000';
  return formatTotalTime(delta);
}

export type SessionDetail = {
  classification: ClassificationRow[];
  laps: LapRow[];
  incidents: IncidentRow[];
};

export type SessionFull = SessionSummary & { detail: SessionDetail };

const SUMMARY_SELECT =
  'id,session_file,type,track_name,track_config,event_name,session_date,' +
  'num_drivers,num_laps,num_incidents,best_lap_ms,best_lap_guid,best_lap_name,winner_guid,winner_name';

function restUrl(path: string, params: URLSearchParams): string {
  return `${supabaseBaseUrl()}/rest/v1/${path}?${params.toString()}`;
}

/** Parse PostgREST `Content-Range: 0-19/142` → 142 (total rows). */
function parseTotal(contentRange: string | null): number {
  if (!contentRange) return 0;
  const total = contentRange.split('/')[1];
  const n = Number(total);
  return Number.isFinite(n) ? n : 0;
}

export type SessionsQuery = {
  type?: SessionTypeFilter;
  track?: string | 'ALL';
  /** Free-text search across track / event / winner / driver names + guids / date. */
  search?: string;
  /**
   * Extra blob filter ANDed with `search` — e.g. a driver guid to scope the list
   * to one driver's sessions, so their search box still searches *within* them.
   */
  scope?: string;
  page: number;
  perPage: number;
};

/** Sanitize a term for a PostgREST `ilike` filter on the `search` blob. */
function sanitizeSearchTerm(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase().replace(/[,()*%]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function fetchSessions(
  q: SessionsQuery
): Promise<{ rows: SessionSummary[]; total: number }> {
  if (!supabaseReadConfigured()) return { rows: [], total: 0 };
  const params = new URLSearchParams();
  params.set('select', SUMMARY_SELECT);
  params.set('order', 'session_date.desc.nullslast');
  params.set('listed', 'eq.true');
  if (q.type && q.type !== 'ALL') params.set('type', `eq.${q.type}`);
  if (q.track && q.track !== 'ALL') params.set('track_name', `eq.${q.track}`);
  // Substring match(es) against the denormalized `search` blob. Repeating the
  // same column param ANDs them in PostgREST, so `scope` (e.g. a driver guid)
  // and the free-text `search` both have to match the same row.
  const scope = sanitizeSearchTerm(q.scope);
  if (scope) params.append('search', `ilike.*${scope}*`);
  const term = sanitizeSearchTerm(q.search);
  if (term) params.append('search', `ilike.*${term}*`);

  const from = Math.max(0, (q.page - 1) * q.perPage);
  const to = from + q.perPage - 1;

  const res = await fetch(restUrl('sessions', params), {
    headers: {
      ...(supabaseHeaders() as Record<string, string>),
      Prefer: 'count=exact',
      'Range-Unit': 'items',
      Range: `${from}-${to}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to load sessions: ${res.status} ${res.statusText}`);
  const rows = (await res.json()) as SessionSummary[];
  return { rows, total: parseTotal(res.headers.get('content-range')) };
}

/**
 * Session types actually present (listed) — so the filter only offers real ones.
 * Pass `search` (e.g. a driver guid) to scope the result to sessions matching the
 * denormalized search blob, so a driver's tabs only show types they actually have.
 */
export async function fetchSessionTypeOptions(search?: string): Promise<SessionType[]> {
  if (!supabaseReadConfigured()) return [];
  const params = new URLSearchParams({ select: 'type', listed: 'eq.true' });
  const term = sanitizeSearchTerm(search);
  if (term) params.set('search', `ilike.*${term}*`);
  try {
    const res = await fetch(restUrl('sessions', params), {
      headers: { ...(supabaseHeaders() as Record<string, string>), 'Range-Unit': 'items', Range: '0-4999' },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { type: SessionType }[];
    const present = new Set(rows.map((r) => r.type));
    // Stable display order.
    return (['RACE', 'QUALIFY', 'PRACTICE'] as SessionType[]).filter((t) => present.has(t));
  } catch {
    return [];
  }
}

export type TrackOption = { trackName: string; trackConfig: string | null };

/**
 * Distinct tracks present (one per track_name), for the track filter.
 * Pass `search` (e.g. a driver guid) to scope to sessions matching the
 * denormalized search blob, so a driver only sees tracks they've raced on.
 */
export async function fetchSessionTrackOptions(search?: string): Promise<TrackOption[]> {
  if (!supabaseReadConfigured()) return [];
  const params = new URLSearchParams({
    select: 'track_name,track_config',
    order: 'track_name.asc',
    listed: 'eq.true',
  });
  const term = sanitizeSearchTerm(search);
  if (term) params.set('search', `ilike.*${term}*`);
  try {
    const res = await fetch(restUrl('sessions', params), {
      headers: { ...(supabaseHeaders() as Record<string, string>), 'Range-Unit': 'items', Range: '0-4999' },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { track_name: string | null; track_config: string | null }[];
    const seen = new Set<string>();
    const out: TrackOption[] = [];
    for (const r of rows) {
      const name = r.track_name?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ trackName: name, trackConfig: r.track_config?.trim() || null });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Resolve a session's track to its catalog entry. AC reports `track_name` and
 * `track_config` separately (e.g. `ks_barcelona` + `layout_moto`), but the
 * catalog keys by the combined id (`ks_barcelona_layout_moto`). Falls back to
 * the bare name (handles single-config tracks / aliases like `imola`).
 */
export type ResolvedTrack = { label: string; hero: string | null; offset: number };
export function resolveTrack(trackName: string | null, trackConfig: string | null): ResolvedTrack {
  const name = (trackName ?? '').trim();
  if (!name) return { label: '—', hero: null, offset: 0 };
  const config = (trackConfig ?? '').trim();
  const combined = config ? `${name}_${config}` : name;
  const info = getTrackInfo(combined) ?? getTrackInfo(name);
  return {
    label: info?.name ?? getTrackDisplayName(name),
    hero: info?.image?.trim() ? info.image.trim() : null,
    offset: typeof info?.imageOffsetY === 'number' && Number.isFinite(info.imageOffsetY) ? info.imageOffsetY : 0,
  };
}

/** Canonical catalog id for `?track=` on the leaderboard page. */
export function resolveLeaderboardTrackId(
  trackName: string | null,
  trackConfig: string | null
): string | null {
  const name = (trackName ?? '').trim();
  if (!name) return null;
  const config = (trackConfig ?? '').trim();
  const combined = config ? `${name}_${config}` : name;
  const info = getTrackInfo(combined) ?? getTrackInfo(name);
  return info?.id ?? normalizeServerTrackId(combined);
}

export async function fetchSessionById(id: number | string): Promise<SessionFull | null> {
  if (!supabaseReadConfigured()) return null;
  const params = new URLSearchParams({ select: '*', id: `eq.${id}`, limit: '1' });
  const res = await fetch(restUrl('sessions', params), {
    headers: supabaseHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load session: ${res.status} ${res.statusText}`);
  const rows = (await res.json()) as SessionFull[];
  return rows?.[0] ?? null;
}

/** Last successful ingest time (for the page's freshness badge). */
export async function fetchResultsSyncedAt(): Promise<string | null> {
  if (!supabaseReadConfigured()) return null;
  const params = new URLSearchParams({ select: 'synced_at', limit: '1' });
  try {
    const res = await fetch(restUrl('results_sync', params), { headers: supabaseHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json()) as { synced_at?: string }[];
    return typeof rows?.[0]?.synced_at === 'string' ? rows[0].synced_at : null;
  } catch {
    return null;
  }
}

/** AC session ISO timestamp → "04 Jun 2026, 23:54" (fixed en-GB locale). */
export function formatSessionDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  // Fixed en-GB locale so the date reads the same for everyone (was browser-locale).
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** ms → "+1.234" gap vs a reference time, or "—" when not comparable. */
export function formatGap(referenceMs: number | null, valueMs: number | null): string {
  if (referenceMs == null || valueMs == null || valueMs <= 0 || referenceMs <= 0) return '—';
  if (valueMs === referenceMs) return '—';
  return `+${((valueMs - referenceMs) / 1000).toFixed(3)}`;
}

/** Total race/session time ms → "h:mm:ss.mmm" / "m:ss.mmm". */
export function formatTotalTime(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return '—';
  const totalSec = ms / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = (totalSec % 60).toFixed(3).padStart(6, '0');
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s}`;
  return `${m}:${s}`;
}
