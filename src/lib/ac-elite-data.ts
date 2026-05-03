import type { Theme, SxProps } from '@mui/material/styles';

import { GLASS_CHIP_SHEEN_SX } from 'src/lib/glass';

export type CarLap = { laptime?: number; laps?: number; ts?: number };
/** One driver row under a car id in `leaderboard.json` (e.g. per track). */
export type LeaderboardCarRow = {
  guid: string;
  laptime?: number;
  laps?: number;
  name?: string;
};
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
export const LICENSE_CHIP_WIDTH = 96;
export const SR_CHIP_WIDTH = 62;

export const ROLE_CHIP_SX = {
  Creator: {
    color: '#fff',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #ED4245 100%)',
    border: '1px solid rgba(237,66,69,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
  },
  Admin: {
    color: '#fff',
    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
    border: '1px solid rgba(168,85,247,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
  },
  Moderator: {
    color: '#0a2e14',
    background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
    border: '1px solid rgba(74,222,128,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  },
} as const satisfies Record<string, SxProps<Theme>>;

export type DiscordRole = keyof typeof ROLE_CHIP_SX;

export function formatNumber(value: number) {
  return value.toLocaleString();
}

export function getPodiumChipSx(position: number, zeroIndexed = false): SxProps<Theme> {
  const rank = zeroIndexed ? position + 1 : position;

  if (rank === 1) {
    return {
      color: '#fef3c7',
      border: '1px solid rgba(245, 158, 11, 0.55)',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.38), rgba(245,158,11,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
    };
  }
  if (rank === 2) {
    return {
      color: '#e2e8f0',
      border: '1px solid rgba(148, 163, 184, 0.55)',
      background: 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(148,163,184,0.12))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  if (rank === 3) {
    return {
      color: '#ffedd5',
      border: '1px solid rgba(194, 101, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(194,101,31,0.36), rgba(194,101,31,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  return {
    bgcolor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  };
}

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

/**
 * Server /INFO often omits a trailing `_` that leaderboard.json uses (e.g. `spa` vs `spa_`).
 * Map the short form to the canonical key when it is unambiguous (no separate `trackNames` entry for the short form).
 */
function buildTrailingUnderscoreAliases(names: Record<string, string>): Record<string, string> {
  const aliases: Record<string, string> = {};
  for (const key of Object.keys(names)) {
    if (!key.endsWith('_')) continue;
    const without = key.slice(0, -1);
    if (without && !(without in names)) aliases[without] = key;
  }
  return aliases;
}

/** Server id → canonical leaderboard key (trailing `_` variants derived from `trackNames`). */
const SERVER_TRACK_ID_ALIASES: Record<string, string> = {
  ...buildTrailingUnderscoreAliases(trackNames),
};

/** Normalize track id from live server or URL params to keys used in leaderboard.json and trackNames. */
export function normalizeServerTrackId(trackId: string): string {
  let t = trackId.trim();
  t = t.replace('-layout', '_layout').replace(/-/g, '_');
  return SERVER_TRACK_ID_ALIASES[t] ?? t;
}

/**
 * Ordered ids to try when matching a server /INFO string to `leaderboard.json` top-level keys.
 * Includes a generic `id` / `id_` pair so **unknown** tracks still match if the file uses a trailing `_`
 * (common in AC) while the server omits it — without listing every circuit in `trackNames`.
 */
export function leaderboardTrackIdLookupCandidates(rawTrackId: string): string[] {
  const t = rawTrackId.trim();
  if (!t) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
    if (!id.endsWith('_')) {
      const suffixed = `${id}_`;
      if (!seen.has(suffixed)) {
        seen.add(suffixed);
        out.push(suffixed);
      }
    }
  };

  push(normalizeServerTrackId(t));
  push(t);
  push(t.replace('-layout', '_layout'));
  push(t.replace(/-/g, '_'));
  push(t.replace('-layout', '_layout').replace(/-/g, '_'));

  return out;
}

export function getTrackDisplayName(trackId: string) {
  const id = normalizeServerTrackId(trackId);
  const pretty =
    trackNames[id] ?? (!id.endsWith('_') ? trackNames[`${id}_`] : undefined);
  return pretty ?? id.replace(/_/g, ' ').trim();
}

export function formatLaptime(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const min = Math.floor(ms / 60000);
  const sec = ((ms / 1000) % 60).toFixed(3).padStart(6, '0');
  return `${min}:${sec}`;
}

export function calculateGap(fastestLap: number, currentLap: number) {
  if (fastestLap === currentLap) return '-';
  return `+${((currentLap - fastestLap) / 1000).toFixed(3)}`;
}

/** Animated glass sheen + hover lift for license / SR chips (same timing as theme buttons). */
function withBadgeGlassHover(base: SxProps<Theme>): SxProps<Theme> {
  return {
    ...GLASS_CHIP_SHEEN_SX,
    ...base,
    transition: (theme: Theme) =>
      theme.transitions.create(['transform', 'box-shadow', 'filter'], { duration: 180 }),
    '@media (hover: hover)': {
      '&:hover': {
        transform: 'translateY(-1px)',
        filter: 'brightness(1.08)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.48), 0 0 0 1px rgba(255,255,255,0.2), 0 10px 28px rgba(0,0,0,0.38), 0 0 20px rgba(255,255,255,0.14)',
        '&::before': {
          mixBlendMode: 'screen',
        },
      },
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': {
        transform: 'none',
        filter: 'none',
      },
    },
  } as SxProps<Theme>;
}

export function getLicenseBadgeSx(license: string): SxProps<Theme> {
  const textColor = '#111827';
  const glass = (start: string, end: string, border: string, color = textColor): SxProps<Theme> => ({
    color,
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
    border: `1px solid ${border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  });

  const styles: Record<string, SxProps<Theme>> = {
    Elite: glass('#D8B4FE', '#C084FC', 'rgba(216,180,254,0.9)'),
    'Diamond+': {
      color: '#0b1f3a',
      background: 'linear-gradient(135deg, #93C5FD 0%, #60A5FA 52%, #A5F3FC 100%)',
      border: '1px solid rgba(191,219,254,0.92)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 0 0 1px rgba(147,197,253,0.22)',
    },
    Diamond: glass('#67E8F9', '#22D3EE', 'rgba(103,232,249,0.8)'),
    'Platinum+': glass('#F8FAFC', '#E2E8F0', 'rgba(226,232,240,0.95)'),
    Platinum: glass('#E2E8F0', '#CBD5E1', 'rgba(203,213,225,0.86)'),
    'Gold+': glass('#FEF08A', '#FDE047', 'rgba(254,240,138,0.88)'),
    Gold: glass('#FDE047', '#FACC15', 'rgba(250,204,21,0.86)'),
    'Silver+': glass('#C9D5E1', '#A8B9CC', 'rgba(201,213,225,0.84)'),
    Silver: glass('#D9E2EC', '#C9D5E1', 'rgba(201,213,225,0.82)'),
    'Bronze+': glass('#FDBA74', '#FB923C', 'rgba(251,146,60,0.86)'),
    Bronze: glass('#FB923C', '#F97316', 'rgba(249,115,22,0.84)'),
    Rookie: glass('#CBD5E1', '#B2BDC8', 'rgba(178,189,200,0.82)'),
  };
  return withBadgeGlassHover(styles[license] || styles.Bronze);
}

export function getSRBadgeSx(tier: string): SxProps<Theme> {
  const textColor = '#111827';
  const glass = (start: string, end: string, border: string, color = textColor): SxProps<Theme> => ({
    color,
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
    border: `1px solid ${border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  });

  const first = tier.charAt(0);
  if (first === 'S') return withBadgeGlassHover(glass('#4ADE80', '#22C55E', 'rgba(74,222,128,0.86)'));
  if (first === 'A') return withBadgeGlassHover(glass('#A78BFA', '#7C3AED', 'rgba(167,139,250,0.84)'));
  if (first === 'B') return withBadgeGlassHover(glass('#FDE047', '#EAF239', 'rgba(234,242,57,0.86)'));
  if (first === 'C') return withBadgeGlassHover(glass('#E5E7EB', '#D1D5DB', 'rgba(209,213,219,0.84)'));
  if (first === 'D') return withBadgeGlassHover(glass('#FDBA74', '#EA7A2D', 'rgba(253,186,116,0.84)'));
  if (first === 'E') return withBadgeGlassHover(glass('#D1D5DB', '#9CA3AF', 'rgba(209,213,219,0.8)'));
  return withBadgeGlassHover(glass('#FB7185', '#FF1F2D', 'rgba(251,113,133,0.86)'));
}

/** Medal-style tinted panel for license tier — used on driver profile stat cards. */
export function getLicensePanelSx(license: string): SxProps<Theme> {
  const medal = (rgb: string, opacity = 0.38, borderOpacity = 0.85): SxProps<Theme> => ({
    background: `linear-gradient(135deg, rgba(${rgb},${opacity}) 0%, rgba(${rgb},${opacity * 0.55}) 55%, rgba(${rgb},${opacity * 0.28}) 100%)`,
    border: `1.5px solid rgba(${rgb},${borderOpacity * 0.7})`,
    borderLeft: `3.5px solid rgba(${rgb},${borderOpacity})`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(${rgb},${opacity * 0.6}), 0 0 4px rgba(${rgb},${opacity * 0.35})`,
  });
  const map: Record<string, SxProps<Theme>> = {
    Elite: medal('192,132,252', 0.42, 0.9),
    'Diamond+': medal('96,165,250', 0.4, 0.85),
    Diamond: medal('34,211,238', 0.38, 0.82),
    'Platinum+': medal('226,232,240', 0.28, 0.65),
    Platinum: medal('203,213,225', 0.25, 0.6),
    'Gold+': medal('253,224,71', 0.38, 0.82),
    Gold: medal('250,204,21', 0.36, 0.78),
    'Silver+': medal('168,185,204', 0.24, 0.58),
    Silver: medal('201,213,225', 0.22, 0.55),
    'Bronze+': medal('251,146,60', 0.36, 0.78),
    Bronze: medal('249,115,22', 0.34, 0.75),
    Rookie: medal('178,189,200', 0.18, 0.48),
  };
  return map[license] || map.Bronze;
}

/** Medal-style tinted panel for safety rating tier. */
export function getSRPanelSx(tier: string): SxProps<Theme> {
  const medal = (rgb: string, opacity = 0.38, borderOpacity = 0.85): SxProps<Theme> => ({
    background: `linear-gradient(135deg, rgba(${rgb},${opacity}) 0%, rgba(${rgb},${opacity * 0.55}) 55%, rgba(${rgb},${opacity * 0.28}) 100%)`,
    border: `1.5px solid rgba(${rgb},${borderOpacity * 0.7})`,
    borderLeft: `3.5px solid rgba(${rgb},${borderOpacity})`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(${rgb},${opacity * 0.6}), 0 0 4px rgba(${rgb},${opacity * 0.35})`,
  });
  const first = tier.charAt(0);
  if (first === 'S') return medal('34,197,94', 0.42, 0.9);
  if (first === 'A') return medal('124,58,237', 0.4, 0.85);
  if (first === 'B') return medal('234,242,57', 0.36, 0.78);
  if (first === 'C') return medal('209,213,219', 0.22, 0.55);
  if (first === 'D') return medal('234,122,45', 0.36, 0.78);
  if (first === 'E') return medal('156,163,175', 0.18, 0.48);
  return medal('251,113,133', 0.36, 0.78);
}

const PACE_WEIGHT = 0.85;
const SR_WEIGHT = 0.15;

export function getOverallCombinedScore(paceScore: number, sr: number, maxPaceScore: number) {
  const paceNorm = maxPaceScore > 0 ? paceScore / maxPaceScore : 0;
  const srNorm = Math.max(0, Math.min(1, (sr - 1.0) / (9.99 - 1.0)));
  return PACE_WEIGHT * paceNorm + SR_WEIGHT * srNorm;
}

/**
 * 1-based overall standing for Rankings → "Overall" (combined score, then pace tie-break).
 * Matches {@link getOverallCombinedScore} ordering used on the rankings page — not `rank.json` array order.
 */
export function getDriverOverallRank(rankData: RankDriver[], guid: string): number | null {
  if (!rankData.length) return null;
  const licenseMap = computeLicenseMap(rankData);
  const maxPaceScore = Math.max(1, ...rankData.map((d) => getDriverLicense(d, licenseMap).paceScore));

  const scored = rankData.map((driver) => {
    const license = getDriverLicense(driver, licenseMap);
    const sr = getDriverSR(driver);
    return {
      guid: driver.guid,
      combined: getOverallCombinedScore(license.paceScore, sr.sr, maxPaceScore),
      paceScore: license.paceScore,
    };
  });

  scored.sort((a, b) => {
    if (b.combined !== a.combined) return b.combined - a.combined;
    return b.paceScore - a.paceScore;
  });

  const idx = scored.findIndex((row) => row.guid === guid);
  return idx >= 0 ? idx + 1 : null;
}
