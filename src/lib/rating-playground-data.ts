import { supabaseFetch, supabaseBaseUrl, supabaseReadConfigured } from 'src/centralized/supabase-rest';
import type { DriverSessionStatV2 } from 'src/lib/ac-elite-rating-v2';

type DriverSessionStatV2Row = {
  session_id: number;
  session_file: string;
  session_date: string | null;
  type: DriverSessionStatV2['type'];
  track_id: string;
  track_name: string | null;
  guid: string;
  name: string | null;
  laps: number;
  rated_km: number;
  field_size: number;
  finish_pos: number | null;
  completion_ratio: number;
  cuts: number;
  penalty_count: number;
  disqualified: boolean;
  car_collisions: number;
  env_collisions: number;
  collision_points: number;
  safety_incident_points: number;
  racecraft_points: number | null;
  excluded_reason: string | null;
};

const SESSION_STAT_SELECT = [
  'session_id',
  'session_file',
  'session_date',
  'type',
  'track_id',
  'track_name',
  'guid',
  'name',
  'laps',
  'rated_km',
  'field_size',
  'finish_pos',
  'completion_ratio',
  'cuts',
  'penalty_count',
  'disqualified',
  'car_collisions',
  'env_collisions',
  'collision_points',
  'safety_incident_points',
  'racecraft_points',
  'excluded_reason',
] as const;

const PAGE_SIZE = 1000;
const MAX_PARALLEL_PAGES = 3;

let sessionStatsPromise: Promise<DriverSessionStatV2[]> | null = null;

function mapSessionStat(row: DriverSessionStatV2Row): DriverSessionStatV2 {
  return {
    sessionId: row.session_id,
    sessionFile: row.session_file,
    sessionDate: row.session_date,
    type: row.type,
    trackId: row.track_id,
    trackName: row.track_name,
    guid: row.guid,
    name: row.name ?? '',
    laps: row.laps,
    ratedKm: row.rated_km,
    fieldSize: row.field_size,
    finishPos: row.finish_pos,
    completionRatio: row.completion_ratio,
    cuts: row.cuts,
    penaltyCount: row.penalty_count,
    disqualified: row.disqualified,
    carCollisions: row.car_collisions,
    envCollisions: row.env_collisions,
    collisionPoints: row.collision_points,
    safetyIncidentPoints: row.safety_incident_points,
    racecraftPoints: row.racecraft_points,
    excludedReason: row.excluded_reason,
  };
}

async function fetchSessionStatPage(from: number): Promise<DriverSessionStatV2[]> {
  const to = from + PAGE_SIZE - 1;
  const params = new URLSearchParams({
    select: SESSION_STAT_SELECT.join(','),
    order: 'session_id.desc',
  });
  const res = await supabaseFetch(
    `${supabaseBaseUrl()}/rest/v1/driver_session_stats_v2?${params.toString()}`,
    {
      headers: {
        'Range-Unit': 'items',
        Range: `${from}-${to}`,
      },
    },
    { timeoutMs: 10_000 }
  );
  if (!res.ok) throw new Error(`Could not load session stats (${res.status})`);
  const rows = (await res.json()) as DriverSessionStatV2Row[];
  return rows.map(mapSessionStat);
}

async function loadDriverSessionStatsV2(): Promise<DriverSessionStatV2[]> {
  const first = await fetchSessionStatPage(0);
  if (first.length < PAGE_SIZE) return first;

  const stats = [...first];
  for (let from = PAGE_SIZE; ; from += PAGE_SIZE * MAX_PARALLEL_PAGES) {
    const pages = await Promise.all(
      Array.from({ length: MAX_PARALLEL_PAGES }, (_, index) =>
        fetchSessionStatPage(from + index * PAGE_SIZE)
      )
    );
    for (const page of pages) stats.push(...page);
    if (pages.some((page) => page.length < PAGE_SIZE)) break;
  }
  return stats;
}

export async function fetchDriverSessionStatsV2(): Promise<DriverSessionStatV2[]> {
  if (!supabaseReadConfigured()) return [];
  if (!sessionStatsPromise) {
    sessionStatsPromise = loadDriverSessionStatsV2().catch((error) => {
      sessionStatsPromise = null;
      throw error;
    });
  }
  return sessionStatsPromise;
}
