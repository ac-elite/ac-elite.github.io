import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import ListItemButton from '@mui/material/ListItemButton';
import { useTheme, keyframes } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { GLASS_CARD_SX, GLASS_PANEL_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { formatNumber, getSRBadgeSx, getLicenseBadgeSx, ROLE_CHIP_SX, type DiscordRole } from 'src/lib/ac-elite-data';

import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

type CarLap = { laptime?: number; laps?: number; ts?: number };
type DriverLeaderboard = Record<string, Record<string, CarLap>>;
type TeamRole = 'creator' | 'admin' | 'moderator' | null;

type RankDriver = {
  guid: string;
  name?: string;
  points?: number;
  kilometers?: number;
  collisions?: number;
  infr?: number;
  last_seen?: number;
  leaderboard?: DriverLeaderboard;
};

type TeamRoles = {
  creator: string[];
  admin: string[];
  moderator: string[];
};

type Metadata = {
  lastSync?: string;
};

type SyncStatus = {
  label: 'Live' | 'Delayed' | 'Stale' | 'Unknown';
  color: string;
  ageText: string;
};

type DriverView = {
  guid: string;
  name: string;
  kilometers: number;
  collisions: number;
  totalLaps: number;
  tracksDriven: number;
  favoriteTrack: string;
  favoriteTrackLaps: number;
  license: string;
  paceScore: number;
  safety: number;
  safetyTier: string;
  teamRole: TeamRole;
};

const CAR = 'tatuusfa1';

const SR_CONFIG = {
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

const APP_BASE_URL = import.meta.env.BASE_URL;

const SR_TIERS = [
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
];

const LICENSE_CONFIG = {
  MIN_KM: 100,
  TRACK_MIN_DRIVERS: 5,
  TRACK_WEIGHT_BASE: 1.0,
  TRACK_WEIGHT_SCALE: 0.02,
  TRACK_WEIGHT_MAX: 2.0,
  // Around 50 laps per track means "full confidence".
  CONFIDENCE_FULL_LAPS: 50,
  // Reaching this many distinct tracks gives full participation scaling.
  PARTICIPATION_FULL_TRACKS: 8,
  // Keep at 0 by default; raise to e.g. 5 if you want a hard lap floor.
  MIN_LAPS_FOR_SCORING: 0,
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

const LICENSE_TIER_ORDER = [
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

/** Hero CTA: subtle “breathing” glass glow (matches grid energy, stays on-brand). */
const heroPrimaryPulse = keyframes`
  0%, 100% {
    box-shadow: 0 2px 10px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.16);
    border-color: rgba(255,255,255,0.22);
  }
  50% {
    box-shadow: 0 2px 12px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.24);
    border-color: rgba(255,255,255,0.3);
  }
`;

/** Soft highlight on “leaderboard.” — white-forward, not loud accent color. */
const heroWordShimmer = keyframes`
  0%, 100% {
    text-shadow: 0 0 18px rgba(255,255,255,0.12), 0 0 36px rgba(23,33,59,0.45);
    opacity: 0.96;
  }
  50% {
    text-shadow: 0 0 26px rgba(255,255,255,0.2), 0 0 48px rgba(255,255,255,0.05);
    opacity: 1;
  }
`;

const heroKeywordPulse = keyframes`
  0%, 100% {
    color: rgba(255,255,255,0.97);
    text-shadow: 0 0 18px rgba(255,255,255,0.14), 0 0 34px rgba(147,197,253,0.12);
  }
  50% {
    color: #ffffff;
    text-shadow: 0 0 24px rgba(255,255,255,0.22), 0 0 44px rgba(191,219,254,0.18);
  }
`;

const reducedMotionNone = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
} as const;

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

function formatTrackName(trackId: string) {
  return trackNames[trackId] || trackId.replace(/_/g, ' ').trim();
}

function formatTimeAgo(isoString?: string) {
  if (!isoString) return 'Unknown';
  const timestamp = new Date(isoString).getTime();
  if (!Number.isFinite(timestamp)) return 'Unknown';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'just now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function parseTimestamp(input?: string | number) {
  if (input == null) return undefined;
  if (typeof input === 'number') {
    // Support seconds and milliseconds unix timestamps
    const ms = input < 1_000_000_000_000 ? input * 1000 : input;
    return Number.isFinite(ms) ? ms : undefined;
  }
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

function getEffectiveLastSync(metadataLastSync: string | undefined, drivers: RankDriver[]) {
  const metadataMs = parseTimestamp(metadataLastSync);
  const rankLastSeenMs = drivers.reduce<number | undefined>((latest, driver) => {
    const ts = parseTimestamp(driver.last_seen);
    if (!ts) return latest;
    if (!latest || ts > latest) return ts;
    return latest;
  }, undefined);

  const best = [metadataMs, rankLastSeenMs].filter((x): x is number => Boolean(x)).sort((a, b) => b - a)[0];
  return best ? new Date(best).toISOString() : undefined;
}

function getSyncStatus(lastSync?: string): SyncStatus {
  if (!lastSync) {
    return { label: 'Unknown', color: '#f59e0b', ageText: 'Unknown' };
  }

  const timestamp = new Date(lastSync).getTime();
  if (!Number.isFinite(timestamp)) {
    return { label: 'Unknown', color: '#f59e0b', ageText: 'Unknown' };
  }

  const diffMs = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const ago = formatTimeAgo(lastSync);

  if (diffMs <= 2 * hour) {
    return { label: 'Live', color: '#22c55e', ageText: ago };
  }

  if (diffMs <= day) {
    return { label: 'Delayed', color: '#f59e0b', ageText: ago };
  }

  return { label: 'Stale', color: '#ef4444', ageText: ago };
}

function getRoleLabel(role: TeamRole): DiscordRole | null {
  if (!role) return null;
  return (role.charAt(0).toUpperCase() + role.slice(1)) as DiscordRole;
}

function safetyRating(driver: RankDriver) {
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

function getSRTier(sr: number, km: number) {
  for (const tier of SR_TIERS) {
    if (sr >= tier.minSR && km >= tier.minKm) return tier.name;
  }
  return 'F';
}

function computeFullLeaderboardScores(drivers: RankDriver[]) {
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
      const multiplier = LICENSE_CONFIG.POSITION_MULTIPLIERS[pos1] || 1.0;

      trackCounts[entry.driverIndex] += 1;

      if (entry.laps < LICENSE_CONFIG.MIN_LAPS_FOR_SCORING) return;

      const confidence = getTrackConfidence(entry.laps);
      if (confidence <= 0) return;

      const score = baseScore * multiplier * trackWeight * confidence;
      paceScores[entry.driverIndex] += score;

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

  return { paceScores, trackCounts };
}

function computeLicenseMap(drivers: RankDriver[]) {
  const map = new Map<string, { license: string; paceScore: number }>();
  if (!drivers.length) return map;

  const { paceScores, trackCounts } = computeFullLeaderboardScores(drivers);

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

function getTeamRole(guid: string, roles: TeamRoles): TeamRole {
  if (roles.creator.includes(guid)) return 'creator';
  if (roles.admin.includes(guid)) return 'admin';
  if (roles.moderator.includes(guid)) return 'moderator';
  return null;
}

function HeroSection({
  totalDrivers,
  totalLaps,
  activeTracks,
  syncStatus,
}: {
  totalDrivers: number;
  totalLaps: number;
  activeTracks: number;
  syncStatus: SyncStatus;
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 8, md: 12 },
        pb: { xs: 6, md: 6 },
        background:
          'radial-gradient(circle at 0% 0%, rgba(23,33,59,0.28) 0, transparent 55%),' +
          'radial-gradient(circle at 100% 100%, rgba(35,31,32,0.2) 0, transparent 55%),' +
          'linear-gradient(180deg, #17213B 0%, #1f2c49 55%, #17213B 100%)',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <PageGridOverlay opacity={0.42} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3} alignItems={{ xs: 'center', md: 'flex-start' }}>
              <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 4,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.82)',
                    fontWeight: 700,
                  }}
                >
                  AC Elite Simracing
                </Typography>

                <Typography
                  variant={isMdUp ? 'h2' : 'h3'}
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textShadow: '0 0 16px rgba(0,0,0,0.72), 0 0 36px rgba(15,23,42,0.92)',
                  }}
                >
                  Track your{' '}
                  <Box
                    component="span"
                    sx={{
                      color: 'rgba(255,255,255,0.97)',
                      fontWeight: 900,
                      animation: `${heroKeywordPulse} 5.2s ease-in-out infinite`,
                      ...reducedMotionNone,
                    }}
                  >
                    stats
                  </Box>
                  .
                  <br />
                  Dominate the{' '}
                  <Box
                    component="span"
                    sx={{
                      color: 'rgba(255,255,255,0.98)',
                      fontWeight: 900,
                      animation: `${heroKeywordPulse} 5.2s ease-in-out 1.2s infinite, ${heroWordShimmer} 5.5s ease-in-out 1.2s infinite`,
                      textShadow: '0 0 28px rgba(255,255,255,0.16)',
                      ...reducedMotionNone,
                    }}
                  >
                    leaderboard.
                  </Box>
                </Typography>

                <Typography variant="body1" sx={{ maxWidth: 540, color: 'text.secondary' }}>
                  Live drivers, live stats, and live progress from your AC Elite data.
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                flexWrap="wrap"
                alignItems={{ xs: 'center', sm: 'center' }}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                sx={{ width: '100%' }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 3.5,
                    borderRadius: 3,
                    minHeight: { xs: 46, sm: 48 },
                    width: { xs: '100%', sm: 'auto' },
                    maxWidth: { xs: 320, sm: 'none' },
                    animation: `${heroPrimaryPulse} 4.5s ease-in-out infinite`,
                    ...reducedMotionNone,
                  }}
                  href="https://discord.gg/d2EbxGYBbj"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join the community
                </Button>

              </Stack>

            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                ...GLASS_PANEL_SX,
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}
                  >
                    Race Intelligence
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.4 }}>
                    One view. All key data.
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Live KMR-powered insights for driver search, safety rating, and license progression.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    ...GLASS_INNER_PANEL_SX,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        bgcolor: syncStatus.color,
                        boxShadow: `0 0 0 3px ${syncStatus.color}22`,
                      }}
                    />
                    <Typography sx={{ fontWeight: 800, color: syncStatus.color }}>
                      {syncStatus.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      • Data sync {syncStatus.ageText}
                    </Typography>
                  </Stack>
                </Box>

                <Grid container spacing={1}>
                  {[
                    { label: 'Total drivers', value: formatNumber(totalDrivers) },
                    { label: 'Logged laps', value: formatNumber(totalLaps) },
                    { label: 'Active tracks', value: formatNumber(activeTracks) },
                    { label: 'Driver search', value: 'Steam64 + name' },
                  ].map((item) => (
                    <Grid key={item.label} size={{ xs: 6 }}>
                      <Box
                        sx={{
                          ...GLASS_INNER_PANEL_SX,
                          minHeight: 78,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: { xs: 'center', md: 'flex-start' },
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.2 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: { xs: 4, md: 4 },
            mb: 0,
            borderRadius: 2.5,
            px: { xs: 2, md: 2.5 },
            py: { xs: 1.5, md: 1.75 },
            border: '1px solid rgba(245,196,53,0.45)',
            background:
              'linear-gradient(135deg, rgba(245,196,53,0.2) 0%, rgba(245,196,53,0.08) 42%, rgba(31,44,73,0.34) 100%), rgba(15,23,42,0.48)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', textAlign: { xs: 'center', md: 'left' } }}>
            <Box component="span" sx={{ fontWeight: 800, color: '#f6d365' }}>
              Note:
            </Box>{' '}
            License and Safety Rating calculations are currently work in progress. Values and thresholds may change
            while we continue tuning.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function DriverSearchSection({
  drivers,
  loading,
  error,
}: {
  drivers: DriverView[];
  loading: boolean;
  error: string | null;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return drivers
      .filter((driver) => driver.name.toLowerCase().includes(q) || driver.guid.includes(q))
      .slice(0, 8);
  }, [drivers, query]);

  return (
    <Box
      id="driver-search"
      component="section"
      sx={{
        position: 'relative',
        py: 4,
        background: 'linear-gradient(180deg, rgba(31,44,73,0.98) 0%, rgba(23,33,59,0.98) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3} sx={{ mb: 3, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
          <Stack spacing={1} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.82)', letterSpacing: 3 }}>
              Driver statistics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Search drivers and view their profile
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 680, color: 'text.secondary' }}>
              This search now uses live data from your previous version (`rank.json`) with real Safety Rating and License calculations.
            </Typography>
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            ...GLASS_PANEL_SX,
            mb: 4,
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          <Grid container spacing={2} alignItems="stretch">
            <Grid size={{ xs: 12, md: 9 }}>
              <Stack spacing={1.5} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Search driver
                </Typography>

                <TextField
                  fullWidth
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  placeholder="Driver name or Steam64 ID..."
                  variant="outlined"
                  size="medium"
                  autoComplete="off"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'rgba(13,27,56,0.72)',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.26)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.42)',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(147, 197, 253, 0.28)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(191,225,255,0.92)',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255,255,255,0.65)',
                      opacity: 1,
                    },
                  }}
                />

                {!loading && !error && matches.length > 0 && (
                  <Paper
                    sx={{
                      ...GLASS_CARD_SX,
                      mt: 1,
                      borderRadius: 2,
                      maxHeight: 280,
                      overflowY: 'auto',
                      boxShadow: '0 8px 26px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                  >
                    <List dense disablePadding>
                      {matches.map((driver) => (
                        <ListItemButton
                          key={driver.guid}
                          onClick={() => {
                            window.location.href = getDriverProfileHref(driver.guid);
                          }}
                          sx={{
                            px: 1.75,
                            py: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography variant="body2">{driver.name}</Typography>
                                {driver.teamRole && getRoleLabel(driver.teamRole) && (
                                  <Chip
                                    size="small"
                                    label={getRoleLabel(driver.teamRole)}
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '0.72rem',
                                      ...ROLE_CHIP_SX[getRoleLabel(driver.teamRole)!],
                                    }}
                                  />
                                )}
                                <Chip
                                  size="small"
                                  label={driver.license}
                                  sx={{ fontWeight: 700, ...getLicenseBadgeSx(driver.license) }}
                                />
                                <Chip
                                  size="small"
                                  label={`${driver.safetyTier} | ${driver.safety.toFixed(2)}`}
                                  sx={{ fontWeight: 700, ...getSRBadgeSx(driver.safetyTier) }}
                                />
                              </Stack>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {driver.guid}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Stack spacing={1.25} sx={{ height: 1, alignItems: { xs: 'center', md: 'stretch' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ minHeight: 50, borderRadius: 2 }}
                  href={`${APP_BASE_URL}dashboard`}
                >
                  Open full stats page
                </Button>

                <Box
                  sx={{
                    ...GLASS_INNER_PANEL_SX,
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                      Drivers loaded
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loading ? '...' : formatNumber(drivers.length)}
                    </Typography>
                  </Stack>
                </Box>

                {loading && <Typography color="text.secondary">Loading drivers...</Typography>}
                {error && <Typography color="error">Failed to load driver data: {error}</Typography>}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}

function DashboardSection({ drivers }: { drivers: DriverView[] }) {
  const topSr = useMemo(
    () =>
      drivers
        .filter((driver) => driver.kilometers >= 500)
        .sort((a, b) => b.safety - a.safety)[0],
    [drivers]
  );
  const topPace = useMemo(
    () => [...drivers].sort((a, b) => b.paceScore - a.paceScore)[0],
    [drivers]
  );
  const mostActive = useMemo(
    () => [...drivers].sort((a, b) => b.kilometers - a.kilometers)[0],
    [drivers]
  );

  return (
    <Box
      id="dashboard"
      component="section"
      sx={{
        position: 'relative',
        py: 4,
        background: 'radial-gradient(circle at 50% 0%, rgba(23,33,59,0.18) 0, transparent 60%), #17213B',
        overflow: 'hidden',
      }}
    >
      <PageGridOverlay opacity={0.2} />

      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ mb: 4, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.82)' }}>
            Community highlights
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Real-time summary from live data
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 640, color: 'text.secondary' }}>
            These cards are generated from the same rank data and formulas used in your previous website version.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {[
            {
              title: 'Top Safety Driver',
              value: topSr ? `${topSr.name} (${topSr.safetyTier} | ${topSr.safety.toFixed(2)})` : 'No data',
              detail: topSr ? `Total KM: ${formatNumber(Math.round(topSr.kilometers))}` : 'Waiting for data',
            },
            {
              title: 'Highest Pace Score',
              value: topPace ? `${topPace.name} (${topPace.license})` : 'No data',
              detail: topPace ? `Score: ${formatNumber(Math.round(topPace.paceScore))}` : 'Waiting for data',
            },
            {
              title: 'Most Active Driver',
              value: mostActive ? mostActive.name : 'No data',
              detail: mostActive ? `${formatNumber(Math.round(mostActive.kilometers))} km driven` : 'Waiting for data',
            },
          ].map((card) => (
            <Grid key={card.title} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  ...GLASS_PANEL_SX,
                  textAlign: { xs: 'center', md: 'left' },
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {card.detail}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoles>({
    creator: [],
    admin: [],
    moderator: [],
  });
  const [metadata, setMetadata] = useState<Metadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, roles, meta] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<TeamRoles>('/data/team-roles.json'),
          fetchJson<Metadata>('/data/metadata.json'),
        ]);

        if (!mounted) return;
        setRankData(rank);
        setTeamRoles(roles);
        setMetadata(meta);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const drivers = useMemo<DriverView[]>(() => {
    if (!rankData.length) return [];

    const licenseMap = computeLicenseMap(rankData);

    return rankData.map((driver) => {
      const km = driver.kilometers || 0;
      const collisions = driver.collisions || 0;
      const safety = safetyRating(driver);
      const safetyTier = getSRTier(safety, km);
      const licenseInfo = km < 100 ? { license: 'Rookie', paceScore: 0 } : licenseMap.get(driver.guid) || { license: 'Bronze', paceScore: 0 };
      const role = getTeamRole(driver.guid, teamRoles);

      let totalLaps = 0;
      let tracksDriven = 0;
      let favoriteTrack = 'N/A';
      let favoriteTrackLaps = 0;

      const leaderboard = driver.leaderboard || {};
      for (const [trackId, cars] of Object.entries(leaderboard)) {
        const carData = cars?.[CAR];
        if (!carData) continue;

        const laps = carData.laps || 0;
        const laptime = carData.laptime;
        totalLaps += laps;
        if (typeof laptime === 'number') tracksDriven += 1;

        if (laps > favoriteTrackLaps) {
          favoriteTrackLaps = laps;
          favoriteTrack = formatTrackName(trackId);
        }
      }

      return {
        guid: driver.guid,
        name: driver.name || 'Unknown',
        kilometers: km,
        collisions,
        totalLaps,
        tracksDriven,
        favoriteTrack: favoriteTrackLaps > 0 ? `${favoriteTrack} (${favoriteTrackLaps} laps)` : 'N/A',
        favoriteTrackLaps,
        license: licenseInfo.license,
        paceScore: licenseInfo.paceScore,
        safety,
        safetyTier,
        teamRole: role,
      };
    });
  }, [rankData, teamRoles]);

  const community = useMemo(() => {
    const totalDrivers = drivers.length;
    const totalLaps = drivers.reduce((sum, d) => sum + d.totalLaps, 0);
    const trackIds = new Set<string>();

    rankData.forEach((driver) => {
      const leaderboard = driver.leaderboard || {};
      Object.entries(leaderboard).forEach(([trackId, cars]) => {
        const laptime = cars?.[CAR]?.laptime;
        if (typeof laptime === 'number') trackIds.add(trackId);
      });
    });

    return { totalDrivers, totalLaps, activeTracks: trackIds.size };
  }, [drivers, rankData]);
  const syncStatus = getSyncStatus(getEffectiveLastSync(metadata.lastSync, rankData));

  return (
    <>
      <title>{`${CONFIG.appName} | Simracing Community`}</title>
      <meta
        name="description"
        content="AC Elite | Simracing community. Track your stats, search drivers, and compete on leaderboards."
      />

      <HeroSection
        totalDrivers={community.totalDrivers}
        totalLaps={community.totalLaps}
        activeTracks={community.activeTracks}
        syncStatus={syncStatus}
      />
      <DriverSearchSection
        drivers={drivers}
        loading={loading}
        error={error}
      />
      <DashboardSection drivers={drivers} />
    </>
  );
}

