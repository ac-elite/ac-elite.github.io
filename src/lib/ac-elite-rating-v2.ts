import {
  getSRTier,
  safetyRating,
  LICENSE_TIERS,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  LICENSE_TIER_ORDER,
} from 'src/lib/ac-elite-scoring';

export type RatingV2SessionType = 'RACE' | 'QUALIFY' | 'PRACTICE';

export type RatingV2ClassificationRow = {
  guid: string;
  name?: string;
  pos?: number;
  numLaps?: number;
  hasPenalty?: boolean;
  lapPenalty?: number;
  disqualified?: boolean;
};

export type RatingV2LapRow = {
  guid: string;
  name?: string;
  lap?: number;
  cuts?: number;
};

export type RatingV2IncidentRow = {
  type?: 'CAR' | 'ENV';
  guid?: string;
  name?: string;
  otherGuid?: string;
  otherName?: string;
  impactSpeed?: number;
};

export type RatingV2Session = {
  id: number;
  session_file?: string;
  type: RatingV2SessionType;
  track_name: string | null;
  track_config: string | null;
  session_date: string | null;
  listed?: boolean;
  detail?: {
    classification?: RatingV2ClassificationRow[];
    laps?: RatingV2LapRow[];
    incidents?: RatingV2IncidentRow[];
  };
};

export type DriverSessionStatV2 = {
  sessionId: number;
  sessionFile: string;
  sessionDate: string | null;
  type: RatingV2SessionType;
  trackId: string;
  trackName: string | null;
  guid: string;
  name: string;
  laps: number;
  ratedKm: number;
  fieldSize: number;
  finishPos: number | null;
  completionRatio: number;
  cuts: number;
  penaltyCount: number;
  disqualified: boolean;
  carCollisions: number;
  envCollisions: number;
  collisionPoints: number;
  safetyIncidentPoints: number;
  racecraftPoints: number | null;
  excludedReason: string | null;
};

export type DriverRatingV2 = {
  guid: string;
  name: string;
  licenseTier: string;
  licenseScore: number;
  paceScore: number;
  racecraftScore: number;
  activityScore: number;
  safetyTier: string;
  safetyRating: number;
  safetyScore: number;
  confidence: number;
  ratedSessions: number;
  ratedRaces: number;
  ratedKm: number;
  totalKm: number;
  uniqueTracks: number;
  incidentsPer100Km: number;
  cutsPer100Km: number;
  breakdown?: RatingV2Breakdown;
  computedAt: string;
};

export type RatingV2Breakdown = {
  mode: 'shadow';
  legacyLicenseTier: string;
  legacySafetyTier: string;
  legacySafetyRating: number;
  resultsSafetyTier: string;
  resultsSafetyRating: number;
  recentLicenseAdjustmentPct: number;
  recentSafetyAdjustment: number;
  adjustedPaceScore: number;
  adjustedSafetyRating: number;
  paceRaw: number;
  paceNormalized: number;
  racecraft: number;
  activity: number;
  safety: number;
  confidence: number;
  ratedSessions: number;
  ratedRaces: number;
  ratedKm: number;
  totalKm: number;
  uniqueTracks: number;
  carCollisions: number;
  envCollisions: number;
  cuts: number;
  penalties: number;
  disqualifications: number;
  incidentPoints: number;
  excludedSessions: number;
};

type LicenseTierV2 = {
  name: string;
  minScore: number;
  minKm: number;
  minTracks: number;
  minSessions: number;
  minSafety: number;
};

export const LICENSE_TIERS_V2: LicenseTierV2[] = [
  { name: 'Elite', minScore: 92, minKm: 6000, minTracks: 10, minSessions: 60, minSafety: 3.0 },
  { name: 'Diamond+', minScore: 84, minKm: 5000, minTracks: 8, minSessions: 45, minSafety: 2.85 },
  { name: 'Diamond', minScore: 78, minKm: 5000, minTracks: 8, minSessions: 40, minSafety: 2.75 },
  { name: 'Platinum+', minScore: 70, minKm: 4000, minTracks: 6, minSessions: 30, minSafety: 2.55 },
  { name: 'Platinum', minScore: 62, minKm: 4000, minTracks: 6, minSessions: 25, minSafety: 2.45 },
  { name: 'Gold+', minScore: 54, minKm: 2000, minTracks: 4, minSessions: 18, minSafety: 2.25 },
  { name: 'Gold', minScore: 46, minKm: 2000, minTracks: 4, minSessions: 14, minSafety: 2.1 },
  { name: 'Silver+', minScore: 36, minKm: 1000, minTracks: 2, minSessions: 8, minSafety: 1.9 },
  { name: 'Silver', minScore: 28, minKm: 1000, minTracks: 2, minSessions: 6, minSafety: 1.8 },
  { name: 'Bronze+', minScore: 18, minKm: 100, minTracks: 1, minSessions: 2, minSafety: 1.5 },
  { name: 'Bronze', minScore: 0, minKm: 100, minTracks: 0, minSessions: 0, minSafety: 1.0 },
];

export const SR_TIERS_V2 = [
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
] as const;

export const RATING_V2_TRACK_LENGTHS_KM: Record<string, number> = {
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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 3): number {
  const m = 10 ** digits;
  return Math.round(value * m) / m;
}

function sessionTrackId(session: RatingV2Session): string {
  const name = session.track_name?.trim() ?? '';
  const config = session.track_config?.trim() ?? '';
  return config ? `${name}_${config}` : name;
}

function impactSeverityPoints(impactSpeedMps: number | undefined): number {
  const speed = typeof impactSpeedMps === 'number' && Number.isFinite(impactSpeedMps) ? impactSpeedMps : 0;
  if (speed <= 0) return 0.25;
  if (speed < 2) return 0.35;
  if (speed < 5) return 0.8;
  if (speed < 10) return 1.5;
  return 2.5;
}

function getSafetyTierV2(sr: number, km: number, sessions: number): string {
  for (const tier of SR_TIERS_V2) {
    if (sr >= tier.minSR && km >= tier.minKm && sessions >= tier.minSessions) return tier.name;
  }
  return 'F';
}

function getLicenseTierV2(rating: DriverRatingV2): string {
  if (rating.totalKm < 100) return 'Rookie';
  for (const name of LICENSE_TIER_ORDER) {
    const tier = LICENSE_TIERS[name];
    if (
      rating.totalKm >= tier.minKm &&
      rating.licenseScore >= tier.minScore &&
      (tier.minTracks == null || rating.uniqueTracks >= tier.minTracks)
    ) {
      return name;
    }
  }
  return 'Bronze';
}

function recentLicenseAdjustmentPct(racecraftScore: number, confidence: number, ratedRaces: number): number {
  if (ratedRaces < 5) return 0;
  // Recent result data is incomplete history, so keep it as a small correction.
  // Positive/negative range is capped at 4%.
  return clamp(((racecraftScore - 65) / 100) * confidence * 0.06, -0.04, 0.04);
}

function recentSafetyAdjustment(
  legacySafetyRating: number,
  resultsSafetyRating: number,
  confidence: number,
  ratedSessions: number
): number {
  if (ratedSessions < 5) return 0;
  // Recent results can flag direction, but must not erase the all-time KMR SR
  // baseline. Cap the results signal to a gentle +/- range.
  return clamp((resultsSafetyRating - legacySafetyRating) * confidence * 0.12, -0.25, 0.2);
}

export function computeDriverSessionStatsV2(
  sessions: RatingV2Session[],
  trackLengthsKm: Record<string, number> = RATING_V2_TRACK_LENGTHS_KM
): DriverSessionStatV2[] {
  const stats: DriverSessionStatV2[] = [];

  for (const session of sessions) {
    if (session.listed === false) continue;
    const laps = session.detail?.laps ?? [];
    const classification = session.detail?.classification ?? [];
    const activeGuids = new Set(laps.map((lap) => lap.guid).filter(Boolean));
    if (activeGuids.size < 2) continue;

    const trackId = sessionTrackId(session);
    const lengthKm = trackLengthsKm[trackId] ?? trackLengthsKm[session.track_name ?? ''];
    const classificationByGuid = new Map(classification.map((row) => [row.guid, row]));
    const lapsByGuid = new Map<string, RatingV2LapRow[]>();
    for (const lap of laps) {
      if (!lap.guid) continue;
      const list = lapsByGuid.get(lap.guid) ?? [];
      list.push(lap);
      lapsByGuid.set(lap.guid, list);
    }

    const statByGuid = new Map<string, DriverSessionStatV2>();
    for (const guid of activeGuids) {
      const driverLaps = lapsByGuid.get(guid) ?? [];
      const classRow = classificationByGuid.get(guid);
      const lapCount = driverLaps.length;
      if (lapCount <= 0) continue;
      const excludedReason = typeof lengthKm === 'number' ? null : 'missing_track_length';
      const ratedKm = excludedReason ? 0 : lapCount * lengthKm;
      const winnerLaps = Math.max(1, ...classification.map((row) => row.numLaps ?? 0), lapCount);
      const completionRatio = clamp((classRow?.numLaps ?? lapCount) / winnerLaps, 0, 1);
      const fieldSize = activeGuids.size;
      const finishPos = classRow?.pos ?? null;
      const finishQuality =
        session.type === 'RACE' && finishPos != null && fieldSize > 1
          ? (fieldSize - finishPos) / (fieldSize - 1)
          : null;
      const racecraftPoints =
        finishQuality == null
          ? null
          : clamp((finishQuality * 0.78 + completionRatio * 0.22) * 100, 0, 100);
      const cuts = driverLaps.reduce((sum, lap) => sum + (lap.cuts ?? 0), 0);
      const penaltyCount = (classRow?.hasPenalty ? 1 : 0) + (classRow?.lapPenalty ?? 0);
      const disqualified = Boolean(classRow?.disqualified);

      const stat: DriverSessionStatV2 = {
        sessionId: session.id,
        sessionFile: session.session_file ?? String(session.id),
        sessionDate: session.session_date,
        type: session.type,
        trackId,
        trackName: session.track_name,
        guid,
        name: classRow?.name ?? driverLaps[0]?.name ?? '',
        laps: lapCount,
        ratedKm,
        fieldSize,
        finishPos,
        completionRatio,
        cuts,
        penaltyCount,
        disqualified,
        carCollisions: 0,
        envCollisions: 0,
        collisionPoints: 0,
        safetyIncidentPoints: 0,
        racecraftPoints,
        excludedReason,
      };
      statByGuid.set(guid, stat);
      stats.push(stat);
    }

    for (const incident of session.detail?.incidents ?? []) {
      const points = impactSeverityPoints(incident.impactSpeed);
      const apply = (guid: string | undefined, kind: 'car' | 'env') => {
        if (!guid) return;
        const stat = statByGuid.get(guid);
        if (!stat) return;
        if (kind === 'car') stat.carCollisions += 1;
        else stat.envCollisions += 1;
        stat.collisionPoints += points;
      };
      if (incident.type === 'CAR') {
        apply(incident.guid, 'car');
        apply(incident.otherGuid, 'car');
      } else {
        apply(incident.guid, 'env');
      }
    }

    for (const stat of statByGuid.values()) {
      stat.safetyIncidentPoints =
        stat.collisionPoints + stat.cuts * 0.15 + stat.penaltyCount * 1.5 + (stat.disqualified ? 5 : 0);
    }
  }

  return stats;
}

export function computeDriverRatingsV2(
  rankDrivers: RankDriver[],
  sessionStats: DriverSessionStatV2[],
  computedAt = new Date().toISOString()
): DriverRatingV2[] {
  const licenseMap = computeLicenseMap(rankDrivers);
  const maxPace = Math.max(1, ...rankDrivers.map((driver) => getDriverLicense(driver, licenseMap).paceScore));
  const statsByGuid = new Map<string, DriverSessionStatV2[]>();
  for (const stat of sessionStats) {
    const list = statsByGuid.get(stat.guid) ?? [];
    list.push(stat);
    statsByGuid.set(stat.guid, list);
  }

  return rankDrivers.map((driver) => {
    const stats = statsByGuid.get(driver.guid) ?? [];
    const includedStats = stats.filter((stat) => !stat.excludedReason);
    const raceStats = includedStats.filter((stat) => stat.type === 'RACE' && stat.racecraftPoints != null);
    const totalKm = driver.kilometers ?? 0;
    const ratedKm = includedStats.reduce((sum, stat) => sum + stat.ratedKm, 0);
    const ratedSessions = includedStats.length;
    const ratedRaces = raceStats.length;
    const uniqueTracks = new Set([
      ...Object.keys(driver.leaderboard ?? {}),
      ...includedStats.map((stat) => stat.trackId).filter(Boolean),
    ]).size;
    const paceRaw = getDriverLicense(driver, licenseMap).paceScore;
    const legacyLicense = getDriverLicense(driver, licenseMap).license;
    const paceNormalized = clamp((paceRaw / maxPace) * 100, 0, 100);
    const racecraftScore = raceStats.length
      ? raceStats.reduce((sum, stat) => sum + (stat.racecraftPoints ?? 0), 0) / raceStats.length
      : paceNormalized * 0.55;
    const activityScore =
      clamp(ratedSessions / 60, 0, 1) * 50 +
      clamp(uniqueTracks / 10, 0, 1) * 30 +
      clamp(totalKm / 6000, 0, 1) * 20;
    const incidentPoints = includedStats.reduce((sum, stat) => sum + stat.safetyIncidentPoints, 0);
    const cuts = includedStats.reduce((sum, stat) => sum + stat.cuts, 0);
    const penalties = includedStats.reduce((sum, stat) => sum + stat.penaltyCount, 0);
    const disqualifications = includedStats.filter((stat) => stat.disqualified).length;
    const carCollisions = includedStats.reduce((sum, stat) => sum + stat.carCollisions, 0);
    const envCollisions = includedStats.reduce((sum, stat) => sum + stat.envCollisions, 0);
    const incidentsPer100Km = ratedKm > 0 ? (incidentPoints / ratedKm) * 100 : 0;
    const cutsPer100Km = ratedKm > 0 ? (cuts / ratedKm) * 100 : 0;
    const rawSafety = ratedKm > 0 ? 1 + 8.99 / (1 + incidentsPer100Km / 2.5) : 2.5;
    const confidence = clamp(Math.sqrt(ratedKm / 1200) * 0.7 + clamp(ratedSessions / 20, 0, 1) * 0.3, 0, 1);
    const resultsSafetyRating = clamp(2.5 + (rawSafety - 2.5) * confidence, 1, 9.99);
    const legacySafetyRating = safetyRating(driver);
    const legacySafetyTier = getSRTier(legacySafetyRating, totalKm);
    const resultsSafetyTier = getSafetyTierV2(resultsSafetyRating, ratedKm, ratedSessions);
    const licenseAdjustment = recentLicenseAdjustmentPct(racecraftScore, confidence, ratedRaces);
    const safetyAdjustment = recentSafetyAdjustment(
      legacySafetyRating,
      resultsSafetyRating,
      confidence,
      ratedSessions
    );
    const licenseScore = Math.max(0, paceRaw * (1 + licenseAdjustment));
    const adjustedSafetyRating = clamp(legacySafetyRating + safetyAdjustment, 1, 9.99);
    const adjustedSafetyTier = getSRTier(adjustedSafetyRating, totalKm);
    const safetyScore = clamp(((adjustedSafetyRating - 1) / 8.99) * 100, 0, 100);

    const rating: DriverRatingV2 = {
      guid: driver.guid,
      name: driver.name ?? '',
      licenseTier: 'Bronze',
      licenseScore: round(licenseScore),
      paceScore: round(paceNormalized),
      racecraftScore: round(racecraftScore),
      activityScore: round(activityScore),
      safetyTier: adjustedSafetyTier,
      safetyRating: round(adjustedSafetyRating),
      safetyScore: round(safetyScore),
      confidence: round(confidence),
      ratedSessions,
      ratedRaces,
      ratedKm: round(ratedKm),
      totalKm: round(totalKm),
      uniqueTracks,
      incidentsPer100Km: round(incidentsPer100Km),
      cutsPer100Km: round(cutsPer100Km),
      computedAt,
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
        racecraft: round(racecraftScore),
        activity: round(activityScore),
        safety: round(safetyScore),
        confidence: round(confidence),
        ratedSessions,
        ratedRaces,
        ratedKm: round(ratedKm),
        totalKm: round(totalKm),
        uniqueTracks,
        carCollisions,
        envCollisions,
        cuts,
        penalties,
        disqualifications,
        incidentPoints: round(incidentPoints),
        excludedSessions: stats.length - includedStats.length,
      },
    };
    rating.licenseTier = getLicenseTierV2(rating);
    return rating;
  });
}

export function summarizeRatingV2(rating: DriverRatingV2): string {
  return [
    `Rating v2`,
    `License ${rating.licenseTier} (${rating.licenseScore.toFixed(1)})`,
    `SR ${rating.safetyTier} (${rating.safetyRating.toFixed(2)})`,
    `${rating.ratedSessions} rated sessions`,
    `${Math.round(rating.ratedKm).toLocaleString()} rated km`,
    `confidence ${(rating.confidence * 100).toFixed(0)}%`,
  ].join(' | ');
}

export function hasRatingV2Data(ratings: Map<string, DriverRatingV2>): boolean {
  return ratings.size > 0;
}
