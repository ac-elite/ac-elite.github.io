import {
  supabaseFetch,
  supabaseBaseUrl,
  supabaseReadConfigured,
} from 'src/centralized/supabase-rest';
import { DATA_FILES } from 'src/centralized/data-files';
import { ratingV2Enabled } from 'src/lib/rating-mode';
import type { DriverRatingV2 } from 'src/lib/ac-elite-rating-v2';
import { fetchJson } from 'src/lib/fetch-json';

type DriverRatingV2Row = {
  guid: string;
  name: string | null;
  license_tier: string;
  license_score: number;
  pace_score: number;
  racecraft_score: number;
  activity_score: number;
  safety_tier: string;
  safety_rating: number;
  safety_score: number;
  confidence: number;
  rated_sessions: number;
  rated_races: number;
  rated_km: number;
  total_km: number;
  unique_tracks: number;
  incidents_per_100km: number;
  cuts_per_100km: number;
  breakdown?: DriverRatingV2['breakdown'];
  computed_at: string;
};

const BASE_SELECT = [
  'guid',
  'name',
  'license_tier',
  'license_score',
  'pace_score',
  'racecraft_score',
  'activity_score',
  'safety_tier',
  'safety_rating',
  'safety_score',
  'confidence',
  'rated_sessions',
  'rated_races',
  'rated_km',
  'total_km',
  'unique_tracks',
  'incidents_per_100km',
  'cuts_per_100km',
  'computed_at',
] as const;

const DETAIL_SELECT = [...BASE_SELECT, 'breakdown'] as const;
const RATING_V2_CACHE_MS = 5 * 60_000;

type RatingV2Snapshot = {
  generatedAt?: string;
  ratings?: Array<Partial<DriverRatingV2> & Pick<DriverRatingV2, 'guid'>>;
};

let ratingV2MapCache: { value: Map<string, DriverRatingV2>; expiresAt: number } | null = null;
let ratingV2MapPromise: Promise<Map<string, DriverRatingV2>> | null = null;

function mapRow(row: DriverRatingV2Row): DriverRatingV2 {
  return {
    guid: row.guid,
    name: row.name ?? '',
    licenseTier: row.license_tier,
    licenseScore: row.license_score,
    paceScore: row.pace_score,
    racecraftScore: row.racecraft_score,
    activityScore: row.activity_score,
    safetyTier: row.safety_tier,
    safetyRating: row.safety_rating,
    safetyScore: row.safety_score,
    confidence: row.confidence,
    ratedSessions: row.rated_sessions,
    ratedRaces: row.rated_races,
    ratedKm: row.rated_km,
    totalKm: row.total_km,
    uniqueTracks: row.unique_tracks,
    incidentsPer100Km: row.incidents_per_100km,
    cutsPer100Km: row.cuts_per_100km,
    ...(row.breakdown ? { breakdown: row.breakdown } : {}),
    computedAt: row.computed_at,
  };
}

function cloneRatingMap(map: Map<string, DriverRatingV2>): Map<string, DriverRatingV2> {
  return new Map(map);
}

function snapshotToMap(snapshot: RatingV2Snapshot): Map<string, DriverRatingV2> {
  const map = new Map<string, DriverRatingV2>();
  const rows = Array.isArray(snapshot.ratings) ? snapshot.ratings : [];
  for (const rating of rows) {
    if (!rating?.guid) continue;
    map.set(rating.guid, {
      guid: rating.guid,
      name: rating.name ?? '',
      licenseTier: rating.licenseTier ?? 'Rookie',
      licenseScore: rating.licenseScore ?? 0,
      paceScore: rating.paceScore ?? 0,
      racecraftScore: rating.racecraftScore ?? 0,
      activityScore: rating.activityScore ?? 0,
      safetyTier: rating.safetyTier ?? 'F',
      safetyRating: rating.safetyRating ?? 1,
      safetyScore: rating.safetyScore ?? 0,
      confidence: rating.confidence ?? 0,
      ratedSessions: rating.ratedSessions ?? 0,
      ratedRaces: rating.ratedRaces ?? 0,
      ratedKm: rating.ratedKm ?? 0,
      totalKm: rating.totalKm ?? 0,
      uniqueTracks: rating.uniqueTracks ?? 0,
      incidentsPer100Km: rating.incidentsPer100Km ?? 0,
      cutsPer100Km: rating.cutsPer100Km ?? 0,
      ...(rating.breakdown ? { breakdown: rating.breakdown } : {}),
      computedAt: rating.computedAt ?? snapshot.generatedAt ?? '',
    });
  }
  return map;
}

async function fetchStaticRatingV2Map(): Promise<Map<string, DriverRatingV2> | null> {
  try {
    const snapshot = await fetchJson<RatingV2Snapshot>(DATA_FILES.ratingV2);
    return snapshotToMap(snapshot);
  } catch {
    return null;
  }
}

async function fetchSupabaseRatingV2Map(): Promise<Map<string, DriverRatingV2>> {
  const map = new Map<string, DriverRatingV2>();
  if (!supabaseReadConfigured()) return map;

  try {
    for (let from = 0; ; from += 1000) {
      const to = from + 999;
      const params = new URLSearchParams({
        select: BASE_SELECT.join(','),
        order: 'license_score.desc',
      });
      const res = await supabaseFetch(
        `${supabaseBaseUrl()}/rest/v1/driver_ratings_v2?${params.toString()}`,
        {
          headers: {
            'Range-Unit': 'items',
            Range: `${from}-${to}`,
          },
        }
      );
      if (!res.ok) break;
      const rows = (await res.json()) as DriverRatingV2Row[];
      for (const row of rows) map.set(row.guid, mapRow(row));
      if (rows.length < 1000) break;
    }
  } catch {
    return new Map();
  }

  return map;
}

export async function fetchRatingV2Map(): Promise<Map<string, DriverRatingV2>> {
  if (!ratingV2Enabled()) return new Map();
  if (ratingV2MapCache && Date.now() < ratingV2MapCache.expiresAt) {
    return cloneRatingMap(ratingV2MapCache.value);
  }

  if (!ratingV2MapPromise) {
    ratingV2MapPromise = (async () => {
      const staticMap = await fetchStaticRatingV2Map();
      const map = staticMap ?? (await fetchSupabaseRatingV2Map());
      ratingV2MapCache = { value: map, expiresAt: Date.now() + RATING_V2_CACHE_MS };
      return map;
    })().finally(() => {
      ratingV2MapPromise = null;
    });
  }

  try {
    return cloneRatingMap(await ratingV2MapPromise);
  } catch {
    return new Map();
  }
}

export async function fetchRatingV2ForDriver(guid: string): Promise<DriverRatingV2 | null> {
  if (!guid || !ratingV2Enabled()) return null;

  if (supabaseReadConfigured()) {
    const params = new URLSearchParams({
      select: DETAIL_SELECT.join(','),
      guid: `eq.${guid}`,
      limit: '1',
    });

    try {
      const res = await supabaseFetch(
        `${supabaseBaseUrl()}/rest/v1/driver_ratings_v2?${params.toString()}`
      );
      if (res.ok) {
        const rows = (await res.json()) as DriverRatingV2Row[];
        if (rows[0]) return mapRow(rows[0]);
      }
    } catch {
      // Fall through to the public snapshot below.
    }
  }

  const staticMap = await fetchStaticRatingV2Map();
  return staticMap?.get(guid) ?? null;
}
