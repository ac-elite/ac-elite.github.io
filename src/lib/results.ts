/**
 * Session results, backed by the Supabase `sessions` table (one row per AC
 * server result file, written by the `sync-results` Edge Function).
 *
 * The list view reads summary columns with server-side filtering + pagination;
 * the detail view reads a single row including the full `detail` jsonb
 * (classification + laps + incidents). Falls back to empty when Supabase is
 * unavailable.
 */
import { supabaseBaseUrl, supabaseHeaders, supabaseReadConfigured } from 'src/centralized/supabase-rest';
import { getTrackInfo, getTrackDisplayName } from 'src/centralized/track-info';

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
  impactSpeed: number;
  ts: number;
};

export type SessionDetail = {
  classification: ClassificationRow[];
  laps: LapRow[];
  incidents: IncidentRow[];
};

export type SessionFull = SessionSummary & { detail: SessionDetail };

const SUMMARY_SELECT =
  'id,session_file,type,track_name,track_config,event_name,session_date,' +
  'num_drivers,num_laps,best_lap_ms,best_lap_guid,best_lap_name,winner_guid,winner_name';

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
  page: number;
  perPage: number;
};

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

/** Session types actually present (listed) — so the filter only offers real ones. */
export async function fetchSessionTypeOptions(): Promise<SessionType[]> {
  if (!supabaseReadConfigured()) return [];
  const params = new URLSearchParams({ select: 'type', listed: 'eq.true' });
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

/** Distinct tracks present (one per track_name), for the track filter. */
export async function fetchSessionTrackOptions(): Promise<TrackOption[]> {
  if (!supabaseReadConfigured()) return [];
  const params = new URLSearchParams({
    select: 'track_name,track_config',
    order: 'track_name.asc',
    listed: 'eq.true',
  });
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
