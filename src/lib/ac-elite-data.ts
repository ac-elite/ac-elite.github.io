import type { Theme, SxProps } from '@mui/material/styles';

export type CarLap = { laptime?: number; laps?: number; ts?: number };
export type DriverLeaderboard = Record<string, Record<string, CarLap>>;

export type RankDriver = {
  guid: string;
  name?: string;
  points?: number;
  kilometers?: number;
  collisions?: number;
  infr?: number;
  leaderboard?: DriverLeaderboard;
};

export const CAR = 'tatuusfa1';

const SR_CONFIG = {
  SR_BASE: 1.0,
  SR_SCALE: 8.99,
  SR_MIN: 1.0,
  SR_MAX: 9.99,
  SR_START: 2.5,
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
  CONSISTENCY_BONUS_PER_TRACK: 2,
  CONSISTENCY_BONUS_MAX: 50,
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

const LICENSE_TIERS: Record<string, { minKm: number; minScore: number; minTracks?: number }> = {
  Elite: { minKm: 6000, minScore: 3700, minTracks: 8 },
  'Diamond+': { minKm: 5000, minScore: 3100, minTracks: 6 },
  Diamond: { minKm: 5000, minScore: 2500, minTracks: 6 },
  'Platinum+': { minKm: 3500, minScore: 2000, minTracks: 5 },
  Platinum: { minKm: 3500, minScore: 1500, minTracks: 5 },
  'Gold+': { minKm: 2000, minScore: 1150, minTracks: 4 },
  Gold: { minKm: 2000, minScore: 800, minTracks: 4 },
  'Silver+': { minKm: 1000, minScore: 600, minTracks: 3 },
  Silver: { minKm: 1000, minScore: 400, minTracks: 3 },
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
  const sr = SR_CONFIG.SR_BASE + SR_CONFIG.SR_SCALE / (1 + weighted);
  return Math.min(SR_CONFIG.SR_MAX, Math.max(SR_CONFIG.SR_MIN, sr));
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
  const tracks = new Set<string>();

  for (const driver of drivers) {
    const lb = driver.leaderboard || {};
    for (const [trackId, cars] of Object.entries(lb)) {
      if (cars?.[CAR]?.laptime != null) tracks.add(trackId);
    }
  }

  for (const trackId of tracks) {
    const entries: { driverIndex: number; laptime: number }[] = [];

    drivers.forEach((driver, idx) => {
      const laptime = driver.leaderboard?.[trackId]?.[CAR]?.laptime;
      if (typeof laptime !== 'number') return;
      entries.push({ driverIndex: idx, laptime });
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
      paceScores[entry.driverIndex] += baseScore * multiplier * trackWeight;
      trackCounts[entry.driverIndex] += 1;
    });
  }

  paceScores.forEach((score, idx) => {
    const bonus = Math.min(
      LICENSE_CONFIG.CONSISTENCY_BONUS_MAX,
      trackCounts[idx] * LICENSE_CONFIG.CONSISTENCY_BONUS_PER_TRACK
    );
    paceScores[idx] = score + bonus;
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

export function getDriverLicense(driver: RankDriver, licenseMap: Map<string, { license: string; paceScore: number }>) {
  if ((driver.kilometers || 0) < 100) return { license: 'Rookie', paceScore: 0 };
  return licenseMap.get(driver.guid) || { license: 'Bronze', paceScore: 0 };
}

const trackNames: Record<string, string> = {
  ks_barcelona_layout_gp: 'Barcelona - GP',
  ks_barcelona_layout_moto: 'Barcelona - Moto',
  ks_black_cat_county_layout_short: 'Black Cat County - Short',
  ks_brands_hatch_gp: 'Brands Hatch - GP',
  imola_: 'Imola',
  ks_laguna_seca_: 'Laguna Seca',
  magione_: 'Magione',
  monza_: 'Monza',
  ks_monza66_junior: 'Monza 1966 - Junior',
  ks_monza66_road: 'Monza 1966 - Road',
  mugello_: 'Mugello',
  ks_nordschleife_nordschleife: 'Nordschleife',
  ks_nordschleife_endurance: 'Nordschleife Endurance',
  ks_nurburgring_layout_gp_a: 'Nurburgring GP',
  ks_nurburgring_layout_gp_b: 'Nurburgring GP - GT',
  ks_red_bull_ring_layout_gp: 'Red Bull Ring - GP',
  ks_silverstone_gp: 'Silverstone - GP',
  ks_silverstone_national: 'Silverstone - National',
  spa_: 'Spa',
  ks_vallelunga_extended_circuit: 'Vallelunga - Extended',
  ks_vallelunga_classic_circuit: 'Vallelunga - Classic',
  ks_zandvoort_: 'Zandvoort',
  rt_suzuka_suzukagp: 'Suzuka GP',
  canada_2021_: 'Montreal (Canada)',
  acu_unitedstates_a: 'COTA (USA)',
};

export function getTrackDisplayName(trackId: string) {
  return trackNames[trackId] || trackId.replace(/_/g, ' ').trim();
}

export function formatLaptime(ms: number) {
  const min = Math.floor(ms / 60000);
  const sec = ((ms / 1000) % 60).toFixed(3).padStart(6, '0');
  return `${min}:${sec}`;
}

export function calculateGap(fastestLap: number, currentLap: number) {
  if (fastestLap === currentLap) return '-';
  return `+${((currentLap - fastestLap) / 1000).toFixed(3)}`;
}

export function getLicenseBadgeSx(license: string): SxProps<Theme> {
  const styles: Record<string, SxProps<Theme>> = {
    Elite: { bgcolor: '#7C3AED', color: '#FFFFFF' },
    'Diamond+': { bgcolor: '#2563EB', color: '#FFFFFF' },
    Diamond: { bgcolor: '#0EA5E9', color: '#082F49' },
    'Platinum+': { bgcolor: '#E2E8F0', color: '#0F172A' },
    Platinum: { bgcolor: '#CBD5E1', color: '#0F172A' },
    'Gold+': { bgcolor: '#FBBF24', color: '#111827' },
    Gold: { bgcolor: '#F59E0B', color: '#111827' },
    'Silver+': { bgcolor: '#94A3B8', color: '#0F172A' },
    Silver: { bgcolor: '#64748B', color: '#FFFFFF' },
    'Bronze+': { bgcolor: '#C2410C', color: '#FFFFFF' },
    Bronze: { bgcolor: '#92400E', color: '#FFFFFF' },
    Rookie: { bgcolor: '#374151', color: '#FFFFFF' },
  };
  return styles[license] || styles.Bronze;
}

export function getSRBadgeSx(tier: string): SxProps<Theme> {
  const first = tier.charAt(0);
  if (first === 'S') return { bgcolor: '#16A34A', color: '#FFFFFF' };
  if (first === 'A') return { bgcolor: '#22C55E', color: '#052E16' };
  if (first === 'B') return { bgcolor: '#06B6D4', color: '#083344' };
  if (first === 'C') return { bgcolor: '#F59E0B', color: '#111827' };
  if (first === 'D') return { bgcolor: '#F97316', color: '#111827' };
  if (first === 'E') return { bgcolor: '#EF4444', color: '#FFFFFF' };
  return { bgcolor: '#6B7280', color: '#FFFFFF' };
}

export function getOverallCombinedScore(paceScore: number, sr: number, maxPaceScore: number) {
  const paceNorm = maxPaceScore > 0 ? paceScore / maxPaceScore : 0;
  const srNorm = Math.max(0, Math.min(1, (sr - 1.0) / (9.99 - 1.0)));
  return 0.7 * paceNorm + 0.3 * srNorm;
}
