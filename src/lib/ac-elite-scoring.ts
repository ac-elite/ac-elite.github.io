/**
 * Pure AC Elite scoring — Safety Rating + License/pace.
 *
 * This module has ZERO dependencies (no MUI, no DOM, no `src/` imports), so it
 * can be imported both by the React app and by the Supabase `sync-kmr-data`
 * Edge Function (Deno). The Edge Function uses it to compute each driver's SR
 * and pace at snapshot time, so historical (windowed) deltas are possible.
 *
 * `ac-elite-data.ts` re-exports everything here for backwards compatibility —
 * existing `import { ... } from 'src/lib/ac-elite-data'` call sites are unchanged.
 */

export type CarLap = { laptime?: number; laps?: number; ts?: number };

/** Per-driver leaderboard: trackId -> carId -> lap stats. */
export type DriverLeaderboard = Record<string, Record<string, CarLap>>;

export type RankDriver = {
  guid: string;
  name?: string;
  points?: number;
  kilometers?: number;
  collisions?: number;
  infr?: number;
  /** Unix ts (seconds or ms) from rank sync — used for “last update” UI. */
  last_seen?: number;
  /** Session stats when present in rank.json */
  wins?: number;
  podiums?: number;
  poles?: number;
  flaps?: number;
  leaderboard?: DriverLeaderboard;
};

export const CAR = 'tatuusfa1';

export const SR_CONFIG = {
  SR_BASE: 1.0,
  SR_SCALE: 8.99,
  SR_MIN: 1.0,
  SR_MAX: 9.99,
  SR_START: 2.5,
  // SR is only fully trusted once a driver has enough distance.
  // This prevents very low-km drivers from instantly sitting at extreme SR values.
  CONFIDENCE_FULL_KM: 3000,
  COLLISION_WEIGHT: 1.0,
  INFRACTION_WEIGHT: 2.0,
};

export const SR_TIERS = [
  { name: 'S', minSR: 3.0, minKm: 3000 },
  { name: 'A1', minSR: 2.9, minKm: 2000 },
  { name: 'A2', minSR: 2.8, minKm: 2000 },
  { name: 'A3', minSR: 2.7, minKm: 2000 },
  { name: 'B1', minSR: 2.6, minKm: 1500 },
  { name: 'B2', minSR: 2.5, minKm: 1500 },
  { name: 'B3', minSR: 2.4, minKm: 1500 },
  { name: 'C1', minSR: 2.3, minKm: 1000 },
  { name: 'C2', minSR: 2.2, minKm: 1000 },
  { name: 'C3', minSR: 2.1, minKm: 1000 },
  { name: 'D1', minSR: 2.0, minKm: 500 },
  { name: 'D2', minSR: 1.9, minKm: 500 },
  { name: 'D3', minSR: 1.8, minKm: 500 },
  { name: 'E1', minSR: 1.7, minKm: 100 },
  { name: 'E2', minSR: 1.6, minKm: 100 },
  { name: 'E3', minSR: 1.5, minKm: 100 },
] as const;

const LICENSE_CONFIG = {
  MIN_KM: 100,
  TRACK_MIN_DRIVERS: 5,
  TRACK_WEIGHT_BASE: 1.0,
  TRACK_WEIGHT_SCALE: 0.02,
  TRACK_WEIGHT_MAX: 2.0,
  // Around 30 laps per track means "full confidence".
  // This keeps anti-cheese protection while being less punitive for consistently quick drivers.
  CONFIDENCE_FULL_LAPS: 30,
  // Full pace participation at this many distinct tracks (min(1, count / N)). Even 8 keeps a round bar and
  // matches legacy feel; Elite minTracks (10) stays the separate, stricter badge requirement.
  PARTICIPATION_FULL_TRACKS: 8,
  // Keep at 0 by default; raise to e.g. 5 if you want a hard lap floor.
  MIN_LAPS_FOR_SCORING: 6,
  CONSISTENCY_BONUS_PER_TRACK: 2,
  CONSISTENCY_BONUS_MAX: 50,
  // Final fine-tune: reward drivers that are consistently high on each leaderboard.
  POSITION_QUALITY_WEIGHT: 0.8,
  POSITION_STABILITY_WEIGHT: 0.15,
  // Extra signal: how often a driver finishes in the top group.
  POSITION_TOP_FINISH_WEIGHT: 0.25,
  TOP_FINISH_CUTOFF_POSITION: 5,
  POSITION_FACTOR_BASE: 0.9,
  POSITION_FACTOR_SCALE: 0.3,
  POSITION_MULTIPLIERS: {
    1: 2.0,
    2: 1.7,
    3: 1.5,
    4: 1.3,
    5: 1.2,
    6: 1.1,
    7: 1.1,
    8: 1.1,
    9: 1.1,
    10: 1.1,
  } as Record<number, number>,
};

function getTrackConfidence(laps: number) {
  if (!Number.isFinite(laps) || laps <= 0) return 0;
  return Math.min(1, Math.sqrt(laps / LICENSE_CONFIG.CONFIDENCE_FULL_LAPS));
}

/**
 * Pace + km + tracks: km/score ladder unchanged.
 * minTracks uses even steps of 2 (easy to explain): Silver 2 → Gold 4 → Platinum 6 → Diamond 8 → Elite 10.
 */
export const LICENSE_TIERS: Record<string, { minKm: number; minScore: number; minTracks?: number }> = {
  Elite: { minKm: 6000, minScore: 4000, minTracks: 10 },
  'Diamond+': { minKm: 5000, minScore: 3000, minTracks: 8 },
  Diamond: { minKm: 5000, minScore: 2500, minTracks: 8 },
  'Platinum+': { minKm: 4000, minScore: 2000, minTracks: 6 },
  Platinum: { minKm: 4000, minScore: 1500, minTracks: 6 },
  'Gold+': { minKm: 2000, minScore: 1200, minTracks: 4 },
  Gold: { minKm: 2000, minScore: 800, minTracks: 4 },
  'Silver+': { minKm: 1000, minScore: 600, minTracks: 2 },
  Silver: { minKm: 1000, minScore: 400, minTracks: 2 },
  'Bronze+': { minKm: 100, minScore: 200 },
  Bronze: { minKm: 100, minScore: 0 },
};

export const LICENSE_TIER_ORDER = [
  'Elite',
  'Diamond+',
  'Diamond',
  'Platinum+',
  'Platinum',
  'Gold+',
  'Gold',
  'Silver+',
  'Silver',
  'Bronze+',
  'Bronze',
] as const;

export function safetyRating(driver: RankDriver) {
  const km = driver.kilometers || 0;
  if (km <= 0) return SR_CONFIG.SR_START;
  const crashes = driver.collisions || 0;
  const infr = driver.infr || 0;
  const c100 = (crashes / km) * 100;
  const i100 = (infr / km) * 100;
  if (!Number.isFinite(c100) || !Number.isFinite(i100)) return SR_CONFIG.SR_START;
  const weighted = c100 * SR_CONFIG.COLLISION_WEIGHT + i100 * SR_CONFIG.INFRACTION_WEIGHT;
  const rawSr = SR_CONFIG.SR_BASE + SR_CONFIG.SR_SCALE / (1 + weighted);

  // Confidence rises with distance, so low-km SR stays closer to SR_START.
  const confidence = Math.min(1, Math.sqrt(km / SR_CONFIG.CONFIDENCE_FULL_KM));
  const confidenceAdjustedSr = SR_CONFIG.SR_START + (rawSr - SR_CONFIG.SR_START) * confidence;

  return Math.min(SR_CONFIG.SR_MAX, Math.max(SR_CONFIG.SR_MIN, confidenceAdjustedSr));
}

export function getSRTier(sr: number, km: number) {
  for (const tier of SR_TIERS) {
    if (sr >= tier.minSR && km >= tier.minKm) return tier.name;
  }
  return 'F';
}

export function getDriverSR(driver: RankDriver) {
  const sr = safetyRating(driver);
  const tier = getSRTier(sr, driver.kilometers || 0);
  return { sr, tier };
}

export function computeLicenseMap(drivers: RankDriver[]) {
  const map = new Map<string, { license: string; paceScore: number }>();
  if (!drivers.length) return map;

  const paceScores = new Array(drivers.length).fill(0) as number[];
  const trackCounts = new Array(drivers.length).fill(0) as number[];
  const positionRatios = drivers.map(() => [] as number[]);
  const topFinishCounts = new Array(drivers.length).fill(0) as number[];
  const tracks = new Set<string>();

  for (const driver of drivers) {
    const lb = driver.leaderboard || {};
    for (const [trackId, cars] of Object.entries(lb)) {
      if (cars?.[CAR]?.laptime != null) tracks.add(trackId);
    }
  }

  for (const trackId of tracks) {
    const entries: { driverIndex: number; laptime: number; laps: number }[] = [];

    drivers.forEach((driver, idx) => {
      const carData = driver.leaderboard?.[trackId]?.[CAR];
      const laptime = carData?.laptime;
      if (typeof laptime !== 'number') return;
      const laps = typeof carData?.laps === 'number' ? carData.laps : 0;
      entries.push({ driverIndex: idx, laptime, laps });
    });

    entries.sort((a, b) => a.laptime - b.laptime);
    if (entries.length < LICENSE_CONFIG.TRACK_MIN_DRIVERS) continue;

    const extra = entries.length - LICENSE_CONFIG.TRACK_MIN_DRIVERS;
    const trackWeight = Math.min(
      LICENSE_CONFIG.TRACK_WEIGHT_MAX,
      LICENSE_CONFIG.TRACK_WEIGHT_BASE + extra * LICENSE_CONFIG.TRACK_WEIGHT_SCALE
    );

    entries.forEach((entry, position) => {
      const pos1 = position + 1;
      const baseScore = entries.length > 1 ? ((entries.length - position) / entries.length) * 100 : 100;
      const multiplier = LICENSE_CONFIG.POSITION_MULTIPLIERS[pos1] || 1;

      trackCounts[entry.driverIndex] += 1;

      if (entry.laps < LICENSE_CONFIG.MIN_LAPS_FOR_SCORING) return;

      const confidence = getTrackConfidence(entry.laps);
      if (confidence <= 0) return;

      paceScores[entry.driverIndex] += baseScore * multiplier * trackWeight * confidence;

      // 0 means P1, 1 means last place. Used for consistency fine-tuning.
      const ratio = entries.length > 1 ? position / (entries.length - 1) : 0;
      positionRatios[entry.driverIndex].push(ratio);

      if (pos1 <= LICENSE_CONFIG.TOP_FINISH_CUTOFF_POSITION) {
        topFinishCounts[entry.driverIndex] += 1;
      }
    });
  }

  paceScores.forEach((score, idx) => {
    const bonus = Math.min(
      LICENSE_CONFIG.CONSISTENCY_BONUS_MAX,
      trackCounts[idx] * LICENSE_CONFIG.CONSISTENCY_BONUS_PER_TRACK
    );
    const participationFactor = Math.min(1, trackCounts[idx] / LICENSE_CONFIG.PARTICIPATION_FULL_TRACKS);
    const baseScore = (score + bonus) * participationFactor;

    // Position quality/stability factor:
    // - quality rewards being near the top more often
    // - stability rewards less spread in placements
    const ratios = positionRatios[idx];
    if (!ratios.length) {
      paceScores[idx] = baseScore;
      return;
    }

    const avgRatio = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
    const quality = 1 - avgRatio;

    const variance = ratios.reduce((sum, value) => sum + (value - avgRatio) ** 2, 0) / ratios.length;
    const stdDev = Math.sqrt(variance);
    const stability = Math.max(0, 1 - stdDev * 2);

    const topFinishRate = topFinishCounts[idx] / ratios.length;
    const combined =
      quality * LICENSE_CONFIG.POSITION_QUALITY_WEIGHT +
      stability * LICENSE_CONFIG.POSITION_STABILITY_WEIGHT +
      topFinishRate * LICENSE_CONFIG.POSITION_TOP_FINISH_WEIGHT;
    const positionFactor = LICENSE_CONFIG.POSITION_FACTOR_BASE + LICENSE_CONFIG.POSITION_FACTOR_SCALE * combined;

    paceScores[idx] = baseScore * positionFactor;
  });

  const qualified = drivers
    .map((driver, idx) => ({
      driver,
      score: (driver.kilometers || 0) >= LICENSE_CONFIG.MIN_KM ? paceScores[idx] || 0 : -1,
      tracks: trackCounts[idx] || 0,
    }))
    .filter((x) => (x.driver.kilometers || 0) >= LICENSE_CONFIG.MIN_KM)
    .sort((a, b) => b.score - a.score);

  for (const item of qualified) {
    const km = item.driver.kilometers || 0;
    let license = 'Bronze';
    for (const name of LICENSE_TIER_ORDER) {
      const tier = LICENSE_TIERS[name];
      const meetsTracks = tier.minTracks == null || item.tracks >= tier.minTracks;
      if (km >= tier.minKm && item.score >= tier.minScore && meetsTracks) {
        license = name;
        break;
      }
    }
    map.set(item.driver.guid, { license, paceScore: item.score });
  }

  for (const driver of drivers) {
    if (!map.has(driver.guid)) map.set(driver.guid, { license: 'Rookie', paceScore: 0 });
  }

  return map;
}

export function getDriverLicense(
  driver: RankDriver,
  licenseMap: Map<string, { license: string; paceScore: number }>
) {
  if ((driver.kilometers || 0) < 100) return { license: 'Rookie', paceScore: 0 };
  return licenseMap.get(driver.guid) || { license: 'Bronze', paceScore: 0 };
}
