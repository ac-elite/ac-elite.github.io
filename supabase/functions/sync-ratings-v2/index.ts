/**
 * AC Elite — sync-ratings-v2
 * ============================================================================
 * Rating v2 pipeline. Reads existing live KMR rank data + Supabase
 * session results, writes only v2 tables:
 *   - driver_session_stats_v2
 *   - driver_ratings_v2
 *   - rating_history_v2 (optional compact summary only; off by default)
 *
 * It never mutates v1 rating data, KMR storage, sessions, or rank_history.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {
  getSRTier,
  safetyRating,
  LICENSE_TIERS,
  computeLicenseMap,
  getDriverLicense,
  LICENSE_TIER_ORDER,
  type RankDriver,
} from '../../../src/lib/ac-elite-scoring.ts';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const BUCKET = 'kmr-data';
const ALGORITHM_VERSION = 'rating-v2-free-tier-2026-06-28';

type KmrSyncRow = {
  synced_at: string | null;
  status: string | null;
  rank_count: number | null;
};

type ResultsSyncRow = {
  synced_at: string | null;
  status: string | null;
  session_count: number | null;
};

type RatingSyncRow = {
  synced_at: string | null;
  source_signature: string | null;
  status: string | null;
};

type SourceState = {
  kmrSyncedAt: string | null;
  resultsSyncedAt: string | null;
  rankCount: number | null;
  sessionCount: number | null;
  signature: string;
};

type SessionType = 'RACE' | 'QUALIFY' | 'PRACTICE';
type SessionRow = {
  id: number;
  session_file: string;
  type: SessionType;
  track_name: string | null;
  track_config: string | null;
  session_date: string | null;
  listed: boolean;
  detail: {
    classification?: Array<{
      guid: string;
      name?: string;
      pos?: number;
      numLaps?: number;
      hasPenalty?: boolean;
      lapPenalty?: number;
      disqualified?: boolean;
    }>;
    laps?: Array<{ guid: string; name?: string; cuts?: number }>;
    incidents?: Array<{
      type?: 'CAR' | 'ENV';
      guid?: string;
      otherGuid?: string;
      impactSpeed?: number;
    }>;
  };
};

type SessionStat = {
  session_id: number;
  session_file: string;
  session_date: string | null;
  type: SessionType;
  track_id: string;
  track_name: string | null;
  guid: string;
  name: string;
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
  computed_at: string;
};

const TRACK_LENGTHS_KM: Record<string, number> = {
  ks_barcelona_layout_gp: 4.655,
  ks_barcelona_layout_moto: 4.727,
  ks_black_cat_county_layout_short: 6.0,
  ks_brands_hatch_gp: 3.916,
  imola_: 4.909,
  imola: 4.909,
  ks_laguna_seca_: 3.602,
  ks_laguna_seca: 3.602,
  magione_: 2.507,
  magione: 2.507,
  monza_: 5.793,
  monza: 5.793,
  ks_monza66_junior: 2.405,
  ks_monza66_road: 10.0,
  mugello_: 5.245,
  mugello: 5.245,
  ks_nordschleife_nordschleife: 20.832,
  ks_nordschleife_endurance: 24.433,
  ks_nurburgring_layout_gp_a: 5.148,
  ks_nurburgring_layout_gp_b: 3.629,
  ks_red_bull_ring_layout_gp: 4.318,
  ks_silverstone_gp: 5.891,
  ks_silverstone_national: 2.638,
  spa_: 7.004,
  spa: 7.004,
  ks_vallelunga_extended_circuit: 4.085,
  ks_vallelunga_classic_circuit: 3.222,
  ks_zandvoort_: 4.307,
  ks_zandvoort: 4.307,
  rt_suzuka_suzukagp: 5.807,
  canada_2021_: 4.361,
  canada_2021: 4.361,
  acu_unitedstates_a: 5.513,
};

const SR_TIERS = [
  { name: 'S', minSR: 4.0, minKm: 1200, minSessions: 20 },
  { name: 'A1', minSR: 3.6, minKm: 800, minSessions: 15 },
  { name: 'A2', minSR: 3.3, minKm: 800, minSessions: 12 },
  { name: 'A3', minSR: 3.0, minKm: 800, minSessions: 10 },
  { name: 'B1', minSR: 2.75, minKm: 500, minSessions: 8 },
  { name: 'B2', minSR: 2.55, minKm: 500, minSessions: 6 },
  { name: 'B3', minSR: 2.35, minKm: 500, minSessions: 5 },
  { name: 'C1', minSR: 2.15, minKm: 250, minSessions: 4 },
  { name: 'C2', minSR: 2.0, minKm: 250, minSessions: 3 },
  { name: 'C3', minSR: 1.85, minKm: 250, minSessions: 2 },
  { name: 'D1', minSR: 1.7, minKm: 100, minSessions: 2 },
  { name: 'D2', minSR: 1.55, minKm: 100, minSessions: 1 },
  { name: 'D3', minSR: 1.4, minKm: 100, minSessions: 1 },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 3): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Deno.env.get(name);
  const parsed = raw == null ? NaN : Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function historyMode(): 'off' | 'summary' {
  const raw = Deno.env.get('RATING_V2_HISTORY_MODE')?.trim().toLowerCase();
  return raw === 'summary' ? 'summary' : 'off';
}

function forceRequested(req: Request): boolean {
  const url = new URL(req.url);
  const value = url.searchParams.get('force')?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

async function fetchSourceState(supabase: ReturnType<typeof createClient>): Promise<SourceState> {
  const [{ data: kmr }, { data: results }] = await Promise.all([
    supabase.from('kmr_sync').select('synced_at,status,rank_count').eq('id', 1).maybeSingle(),
    supabase
      .from('results_sync')
      .select('synced_at,status,session_count')
      .eq('id', 1)
      .maybeSingle(),
  ]);
  const kmrRow = (kmr ?? {}) as KmrSyncRow;
  const resultsRow = (results ?? {}) as ResultsSyncRow;
  const state = {
    kmrSyncedAt: kmrRow.synced_at ?? null,
    resultsSyncedAt: resultsRow.synced_at ?? null,
    rankCount: kmrRow.rank_count ?? null,
    sessionCount: resultsRow.session_count ?? null,
  };
  return {
    ...state,
    signature: [
      ALGORITHM_VERSION,
      state.kmrSyncedAt ?? 'no-kmr',
      state.resultsSyncedAt ?? 'no-results',
      state.rankCount ?? 'no-rank-count',
      state.sessionCount ?? 'no-session-count',
    ].join('|'),
  };
}

async function fetchLastSync(
  supabase: ReturnType<typeof createClient>
): Promise<RatingSyncRow | null> {
  const { data, error } = await supabase
    .from('rating_sync_v2')
    .select('synced_at,source_signature,status')
    .eq('id', 1)
    .maybeSingle();
  if (error) return null;
  return (data ?? null) as RatingSyncRow | null;
}

async function writeSyncStatus(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('rating_sync_v2')
    .upsert({ id: 1, checked_at: new Date().toISOString(), ...payload }, { onConflict: 'id' });
}

function skipReason(
  last: RatingSyncRow | null,
  source: SourceState,
  minIntervalMinutes: number,
  forced: boolean
): string | null {
  if (forced) return null;
  if (last?.status === 'success' && last.source_signature === source.signature) {
    return 'source_unchanged';
  }
  if (last?.synced_at) {
    const lastMs = new Date(last.synced_at).getTime();
    if (Number.isFinite(lastMs)) {
      const elapsedMinutes = (Date.now() - lastMs) / 60_000;
      if (elapsedMinutes < minIntervalMinutes) return `cooldown_${minIntervalMinutes}m`;
    }
  }
  return null;
}

function trackId(session: SessionRow): string {
  const name = session.track_name?.trim() ?? '';
  const config = session.track_config?.trim() ?? '';
  return config ? `${name}_${config}` : name;
}

function impactPoints(speedMps: number | undefined): number {
  const speed = num(speedMps);
  if (speed <= 0) return 0.25;
  if (speed < 2) return 0.35;
  if (speed < 5) return 0.8;
  if (speed < 10) return 1.5;
  return 2.5;
}

function safetyTier(sr: number, km: number, sessions: number): string {
  for (const tier of SR_TIERS) {
    if (sr >= tier.minSR && km >= tier.minKm && sessions >= tier.minSessions) return tier.name;
  }
  return 'F';
}

function licenseTier(r: {
  license_score: number;
  total_km: number;
  unique_tracks: number;
  rated_sessions: number;
  safety_rating: number;
  breakdown?: { legacyLicenseTier?: string };
}): string {
  if (r.total_km < 100) return 'Rookie';
  for (const name of LICENSE_TIER_ORDER) {
    const tier = LICENSE_TIERS[name];
    if (
      r.total_km >= tier.minKm &&
      r.license_score >= tier.minScore &&
      (tier.minTracks == null || r.unique_tracks >= tier.minTracks)
    ) {
      return name;
    }
  }
  return 'Bronze';
}

function recentLicenseAdjustmentPct(
  racecraftScore: number,
  confidence: number,
  ratedRaces: number
): number {
  if (ratedRaces < 5) return 0;
  return clamp(((racecraftScore - 65) / 100) * confidence * 0.06, -0.04, 0.04);
}

function recentSafetyAdjustment(
  legacySafetyRating: number,
  resultsSafetyRating: number,
  confidence: number,
  ratedSessions: number
): number {
  if (ratedSessions < 5) return 0;
  return clamp((resultsSafetyRating - legacySafetyRating) * confidence * 0.12, -0.25, 0.2);
}

function computeSessionStats(sessions: SessionRow[], computedAt: string): SessionStat[] {
  const out: SessionStat[] = [];

  for (const session of sessions) {
    if (session.listed === false) continue;
    const laps = session.detail?.laps ?? [];
    const activeGuids = new Set(laps.map((lap) => lap.guid).filter(Boolean));
    if (activeGuids.size < 2) continue;

    const id = trackId(session);
    const lengthKm = TRACK_LENGTHS_KM[id] ?? TRACK_LENGTHS_KM[session.track_name ?? ''];
    const classification = session.detail?.classification ?? [];
    const classByGuid = new Map(classification.map((row) => [row.guid, row]));
    const lapsByGuid = new Map<string, Array<{ guid: string; name?: string; cuts?: number }>>();
    for (const lap of laps) {
      if (!lap.guid) continue;
      const list = lapsByGuid.get(lap.guid) ?? [];
      list.push(lap);
      lapsByGuid.set(lap.guid, list);
    }

    const byGuid = new Map<string, SessionStat>();
    for (const guid of activeGuids) {
      const driverLaps = lapsByGuid.get(guid) ?? [];
      const classRow = classByGuid.get(guid);
      const lapCount = driverLaps.length;
      if (lapCount <= 0) continue;
      const excluded = typeof lengthKm === 'number' ? null : 'missing_track_length';
      const winnerLaps = Math.max(1, ...classification.map((row) => row.numLaps ?? 0), lapCount);
      const completion = clamp((classRow?.numLaps ?? lapCount) / winnerLaps, 0, 1);
      const field = activeGuids.size;
      const finishPos = classRow?.pos ?? null;
      const finishQuality =
        session.type === 'RACE' && finishPos != null && field > 1
          ? (field - finishPos) / (field - 1)
          : null;
      const cuts = driverLaps.reduce((sum, lap) => sum + (lap.cuts ?? 0), 0);
      const stat: SessionStat = {
        session_id: session.id,
        session_file: session.session_file,
        session_date: session.session_date,
        type: session.type,
        track_id: id,
        track_name: session.track_name,
        guid,
        name: classRow?.name ?? driverLaps[0]?.name ?? '',
        laps: lapCount,
        rated_km: excluded ? 0 : lapCount * (lengthKm as number),
        field_size: field,
        finish_pos: finishPos,
        completion_ratio: completion,
        cuts,
        penalty_count: (classRow?.hasPenalty ? 1 : 0) + (classRow?.lapPenalty ?? 0),
        disqualified: Boolean(classRow?.disqualified),
        car_collisions: 0,
        env_collisions: 0,
        collision_points: 0,
        safety_incident_points: 0,
        racecraft_points:
          finishQuality == null
            ? null
            : clamp((finishQuality * 0.78 + completion * 0.22) * 100, 0, 100),
        excluded_reason: excluded,
        computed_at: computedAt,
      };
      byGuid.set(guid, stat);
      out.push(stat);
    }

    for (const incident of session.detail?.incidents ?? []) {
      const points = impactPoints(incident.impactSpeed);
      const apply = (guid: string | undefined, car: boolean) => {
        if (!guid) return;
        const stat = byGuid.get(guid);
        if (!stat) return;
        if (car) stat.car_collisions += 1;
        else stat.env_collisions += 1;
        stat.collision_points += points;
      };
      if (incident.type === 'CAR') {
        apply(incident.guid, true);
        apply(incident.otherGuid, true);
      } else {
        apply(incident.guid, false);
      }
    }

    for (const stat of byGuid.values()) {
      stat.safety_incident_points =
        stat.collision_points +
        stat.cuts * 0.15 +
        stat.penalty_count * 1.5 +
        (stat.disqualified ? 5 : 0);
    }
  }

  return out;
}

function computeRatings(rank: RankDriver[], stats: SessionStat[], computedAt: string) {
  const licenseMap = computeLicenseMap(rank);
  const maxPace = Math.max(
    1,
    ...rank.map((driver) => getDriverLicense(driver, licenseMap).paceScore)
  );
  const statsByGuid = new Map<string, SessionStat[]>();
  for (const stat of stats) {
    const list = statsByGuid.get(stat.guid) ?? [];
    list.push(stat);
    statsByGuid.set(stat.guid, list);
  }

  return rank.map((driver) => {
    const driverStats = statsByGuid.get(driver.guid) ?? [];
    const included = driverStats.filter((stat) => !stat.excluded_reason);
    const raceStats = included.filter(
      (stat) => stat.type === 'RACE' && stat.racecraft_points != null
    );
    const totalKm = num(driver.kilometers);
    const ratedKm = included.reduce((sum, stat) => sum + stat.rated_km, 0);
    const paceRaw = getDriverLicense(driver, licenseMap).paceScore;
    const legacyLicense = getDriverLicense(driver, licenseMap).license;
    const paceNormalized = clamp((paceRaw / maxPace) * 100, 0, 100);
    const racecraft = raceStats.length
      ? raceStats.reduce((sum, stat) => sum + (stat.racecraft_points ?? 0), 0) / raceStats.length
      : paceNormalized * 0.55;
    const uniqueTracks = new Set([
      ...Object.keys(driver.leaderboard ?? {}),
      ...included.map((stat) => stat.track_id).filter(Boolean),
    ]).size;
    const activity =
      clamp(included.length / 60, 0, 1) * 50 +
      clamp(uniqueTracks / 10, 0, 1) * 30 +
      clamp(totalKm / 6000, 0, 1) * 20;
    const incidentPoints = included.reduce((sum, stat) => sum + stat.safety_incident_points, 0);
    const cuts = included.reduce((sum, stat) => sum + stat.cuts, 0);
    const incidentsPer100 = ratedKm > 0 ? (incidentPoints / ratedKm) * 100 : 0;
    const cutsPer100 = ratedKm > 0 ? (cuts / ratedKm) * 100 : 0;
    const rawSafety = ratedKm > 0 ? 1 + 8.99 / (1 + incidentsPer100 / 2.5) : 2.5;
    const confidence = clamp(
      Math.sqrt(ratedKm / 1200) * 0.7 + clamp(included.length / 20, 0, 1) * 0.3,
      0,
      1
    );
    const resultsSafetyRating = clamp(2.5 + (rawSafety - 2.5) * confidence, 1, 9.99);
    const legacySafetyRating = safetyRating(driver);
    const legacySafetyTier = getSRTier(legacySafetyRating, totalKm);
    const resultsSafetyTier = safetyTier(resultsSafetyRating, ratedKm, included.length);
    const licenseAdjustment = recentLicenseAdjustmentPct(racecraft, confidence, raceStats.length);
    const safetyAdjustment = recentSafetyAdjustment(
      legacySafetyRating,
      resultsSafetyRating,
      confidence,
      included.length
    );
    const licenseScore = Math.max(0, paceRaw * (1 + licenseAdjustment));
    const adjustedSafetyRating = clamp(legacySafetyRating + safetyAdjustment, 1, 9.99);
    const adjustedSafetyTier = getSRTier(adjustedSafetyRating, totalKm);
    const safetyScore = clamp(((adjustedSafetyRating - 1) / 8.99) * 100, 0, 100);
    const base = {
      guid: driver.guid,
      name: driver.name ?? '',
      license_tier: 'Bronze',
      license_score: round(licenseScore),
      pace_score: round(paceNormalized),
      racecraft_score: round(racecraft),
      activity_score: round(activity),
      safety_tier: adjustedSafetyTier,
      safety_rating: round(adjustedSafetyRating),
      safety_score: round(safetyScore),
      confidence: round(confidence),
      rated_sessions: included.length,
      rated_races: raceStats.length,
      rated_km: round(ratedKm),
      total_km: round(totalKm),
      unique_tracks: uniqueTracks,
      incidents_per_100km: round(incidentsPer100),
      cuts_per_100km: round(cutsPer100),
      breakdown: {
        mode: 'shadow',
        legacyLicenseTier: legacyLicense,
        legacySafetyTier,
        legacySafetyRating: round(legacySafetyRating),
        resultsSafetyTier,
        resultsSafetyRating: round(resultsSafetyRating),
        recentLicenseAdjustmentPct: round(licenseAdjustment, 4),
        recentSafetyAdjustment: round(safetyAdjustment),
        adjustedPaceScore: round(licenseScore),
        adjustedSafetyRating: round(adjustedSafetyRating),
        paceRaw: round(paceRaw),
        paceNormalized: round(paceNormalized),
        racecraft: round(racecraft),
        activity: round(activity),
        safety: round(safetyScore),
        confidence: round(confidence),
        ratedSessions: included.length,
        ratedRaces: raceStats.length,
        ratedKm: round(ratedKm),
        totalKm: round(totalKm),
        uniqueTracks,
        carCollisions: included.reduce((sum, stat) => sum + stat.car_collisions, 0),
        envCollisions: included.reduce((sum, stat) => sum + stat.env_collisions, 0),
        cuts,
        penalties: included.reduce((sum, stat) => sum + stat.penalty_count, 0),
        disqualifications: included.filter((stat) => stat.disqualified).length,
        incidentPoints: round(incidentPoints),
        excludedSessions: driverStats.length - included.length,
      },
      computed_at: computedAt,
    };
    base.license_tier = licenseTier(base);
    return base;
  });
}

function compactRating(r: ReturnType<typeof computeRatings>[number]) {
  return {
    g: r.guid,
    lt: r.license_tier,
    ls: r.license_score,
    st: r.safety_tier,
    sr: r.safety_rating,
    c: r.confidence,
  };
}

function countBy<T>(items: T[], pick: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = pick(item) || 'unknown';
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function buildHistorySummary(ratings: ReturnType<typeof computeRatings>, maxDrivers: number) {
  const topLicense = [...ratings]
    .sort((a, b) => b.license_score - a.license_score)
    .slice(0, maxDrivers)
    .map(compactRating);
  const topSafety = [...ratings]
    .sort((a, b) => b.safety_rating - a.safety_rating)
    .slice(0, maxDrivers)
    .map(compactRating);
  const totals = ratings.reduce(
    (acc, r) => {
      acc.license += r.license_score;
      acc.safety += r.safety_rating;
      acc.confidence += r.confidence;
      return acc;
    },
    { license: 0, safety: 0, confidence: 0 }
  );
  const n = Math.max(1, ratings.length);
  return {
    mode: 'summary',
    algorithm: ALGORITHM_VERSION,
    driverCount: ratings.length,
    averages: {
      licenseScore: round(totals.license / n),
      safetyRating: round(totals.safety / n),
      confidence: round(totals.confidence / n),
    },
    licenseTiers: countBy(ratings, (r) => r.license_tier),
    safetyTiers: countBy(ratings, (r) => r.safety_tier),
    topLicense,
    topSafety,
  };
}

async function maybeInsertHistory(
  supabase: ReturnType<typeof createClient>,
  ratings: ReturnType<typeof computeRatings>,
  capturedAt: string
): Promise<boolean> {
  if (historyMode() !== 'summary') return false;
  const maxDrivers = envInt('RATING_V2_HISTORY_MAX_DRIVERS', 50, 0, 250);
  const { error } = await supabase.from('rating_history_v2').insert({
    captured_at: capturedAt,
    driver_count: ratings.length,
    ratings: buildHistorySummary(ratings, maxDrivers),
  });
  if (error) throw new Error(`rating history insert failed: ${error.message}`);
  await supabase.rpc('prune_rating_history_v2');
  return true;
}

async function fetchAllSessions(supabase: ReturnType<typeof createClient>): Promise<SessionRow[]> {
  const rows: SessionRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('sessions')
      .select('id,session_file,type,track_name,track_config,session_date,listed,detail')
      .eq('listed', true)
      .range(from, from + 999);
    if (error) throw new Error(`sessions read failed: ${error.message}`);
    rows.push(...((data ?? []) as SessionRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST' && req.method !== 'GET')
    return new Response('Method Not Allowed', { status: 405, headers: CORS });

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) return json({ error: 'CRON_SECRET not configured' }, 500);
  const auth = req.headers.get('Authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer !== cronSecret && req.headers.get('x-cron-secret') !== cronSecret)
    return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase env missing' }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const minIntervalMinutes = envInt('RATING_V2_MIN_INTERVAL_MINUTES', 60, 0, 1440);
  const forced = forceRequested(req);

  try {
    const source = await fetchSourceState(supabase);
    const last = await fetchLastSync(supabase);
    const reason = skipReason(last, source, minIntervalMinutes, forced);
    if (reason) {
      await writeSyncStatus(supabase, {
        status: 'skipped',
        error: null,
        source_signature: source.signature,
        rank_count: source.rankCount,
        session_count: source.sessionCount,
        skipped_reason: reason,
      });
      return json({ ok: true, skipped: true, reason, source });
    }

    await writeSyncStatus(supabase, {
      status: 'running',
      error: null,
      source_signature: source.signature,
      rank_count: source.rankCount,
      session_count: source.sessionCount,
      skipped_reason: null,
    });

    const computedAt = new Date().toISOString();
    const { data: rankBlob, error: rankError } = await supabase.storage
      .from(BUCKET)
      .download('rank.json');
    if (rankError || !rankBlob)
      throw new Error(`rank download failed: ${rankError?.message ?? 'missing blob'}`);
    const rank = JSON.parse(await rankBlob.text()) as RankDriver[];
    if (!Array.isArray(rank)) return json({ error: 'rank.json is not an array' }, 502);

    const sessions = await fetchAllSessions(supabase);
    const stats = computeSessionStats(sessions, computedAt);
    const ratings = computeRatings(rank, stats, computedAt);

    const { error: resetError } = await supabase.rpc('reset_rating_v2_current');
    if (resetError) throw new Error(`rating v2 reset failed: ${resetError.message}`);

    for (let i = 0; i < stats.length; i += 1000) {
      const { error } = await supabase
        .from('driver_session_stats_v2')
        .insert(stats.slice(i, i + 1000));
      if (error) throw new Error(`session stat insert failed: ${error.message}`);
    }

    for (let i = 0; i < ratings.length; i += 1000) {
      const { error } = await supabase.from('driver_ratings_v2').insert(ratings.slice(i, i + 1000));
      if (error) throw new Error(`rating insert failed: ${error.message}`);
    }

    const historyInserted = await maybeInsertHistory(supabase, ratings, computedAt);
    await writeSyncStatus(supabase, {
      synced_at: computedAt,
      status: 'success',
      error: null,
      source_signature: source.signature,
      rank_count: rank.length,
      session_count: sessions.length,
      session_stat_count: stats.length,
      driver_count: ratings.length,
      skipped_reason: null,
      history_mode: historyMode(),
    });

    return json({
      ok: true,
      computedAt,
      drivers: ratings.length,
      sessions: sessions.length,
      sessionStats: stats.length,
      historyInserted,
      historyMode: historyMode(),
      minIntervalMinutes,
      forced,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown rating v2 error';
    await writeSyncStatus(supabase, { status: 'error', error: message });
    return json({ error: message }, 500);
  }
});
