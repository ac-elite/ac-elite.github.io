import { supabaseFetch, supabaseBaseUrl, supabaseReadConfigured } from 'src/centralized/supabase-rest';
import { ratingV2Enabled } from 'src/lib/rating-mode';
import type { DriverRatingV2 } from 'src/lib/ac-elite-rating-v2';

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

export async function fetchRatingV2Map(): Promise<Map<string, DriverRatingV2>> {
  const map = new Map<string, DriverRatingV2>();
  if (!ratingV2Enabled() || !supabaseReadConfigured()) return map;

  try {
    for (let from = 0; ; from += 1000) {
      const to = from + 999;
      const params = new URLSearchParams({
        select: BASE_SELECT.join(','),
        order: 'license_score.desc',
      });
      const res = await supabaseFetch(`${supabaseBaseUrl()}/rest/v1/driver_ratings_v2?${params.toString()}`, {
        headers: {
          'Range-Unit': 'items',
          Range: `${from}-${to}`,
        },
      });
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

export async function fetchRatingV2ForDriver(guid: string): Promise<DriverRatingV2 | null> {
  if (!guid || !ratingV2Enabled() || !supabaseReadConfigured()) return null;

  const params = new URLSearchParams({
    select: DETAIL_SELECT.join(','),
    guid: `eq.${guid}`,
    limit: '1',
  });

  try {
    const res = await supabaseFetch(`${supabaseBaseUrl()}/rest/v1/driver_ratings_v2?${params.toString()}`);
    if (!res.ok) return null;
    const rows = (await res.json()) as DriverRatingV2Row[];
    return rows[0] ? mapRow(rows[0]) : null;
  } catch {
    return null;
  }
}

