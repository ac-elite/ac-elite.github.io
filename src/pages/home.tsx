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
import { getSRBadgeSx, getLicenseBadgeSx } from 'src/lib/ac-elite-data';

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

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 50px 50px, 50px 50px, 100px 0; }
`;

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

function formatNumber(value: number) {
  return value.toLocaleString();
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

function getRoleLabel(role: TeamRole) {
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
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
  const sr = SR_CONFIG.SR_BASE + SR_CONFIG.SR_SCALE / (1 + weighted);
  return Math.min(SR_CONFIG.SR_MAX, Math.max(SR_CONFIG.SR_MIN, sr));
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
      const multiplier = LICENSE_CONFIG.POSITION_MULTIPLIERS[pos1] || 1.0;
      const score = baseScore * multiplier * trackWeight;
      paceScores[entry.driverIndex] += score;
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length !== 6) return null;
  const num = Number.parseInt(cleaned, 16);
  const r = Math.floor(num / 65536);
  const g = Math.floor((num % 65536) / 256);
  const b = num % 256;
  return { r, g, b };
}

function glassFromHex(hexBg: string) {
  const rgb = hexToRgb(hexBg);
  if (!rgb) return {};

  return {
    background: `linear-gradient(135deg, rgba(${rgb.r},${rgb.g},${rgb.b},0.28) 0%, rgba(${rgb.r},${rgb.g},${rgb.b},0.08) 100%)`,
    border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`,
    backdropFilter: 'blur(12px)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
  };
}

function AnimatedLinesBackground({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.11) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.11) 1px, transparent 1px),' +
          'repeating-linear-gradient(45deg, transparent, transparent 88px, rgba(147,197,253,0.2) 88px, rgba(147,197,253,0.2) 90px)',
        backgroundSize: '44px 44px, 44px 44px, 100% 100%',
        animation: `${gridMove} 18s linear infinite`,
        mixBlendMode: 'screen',
      }}
    />
  );
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
      <AnimatedLinesBackground opacity={0.42} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
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
                    textShadow:
                      '0 0 14px rgba(0,0,0,0.7), 0 0 32px rgba(15,23,42,0.9)',
                  }}
                >
                  Track your stats.
                  <br />
                  Dominate the{' '}
                  <Box component="span" sx={{ color: 'warning.main' }}>
                    leaderboard.
                  </Box>
                </Typography>

                <Typography variant="body1" sx={{ maxWidth: 540, color: 'text.secondary' }}>
                  Live drivers, live stats, and live progress from your AC Elite data.
                </Typography>
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 3.5,
                    borderRadius: 3,
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.22)',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow:
                      '0 10px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(173,216,255,0.16) 100%)',
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                  href="https://discord.gg/d2EbxGYBbj"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join the community
                </Button>

                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                  sx={{
                    px: 3.5,
                    borderRadius: 3,
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    backdropFilter: 'blur(10px)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.72)',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                  href={`${APP_BASE_URL}dashboard`}
                >
                  Open stats
                </Button>
              </Stack>

            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                borderRadius: 4,
                p: 2.5,
                background: 'linear-gradient(145deg, rgba(19,36,71,0.7), rgba(35,31,32,0.4))',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(14px)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
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
                    Live KMR-powered insights for driver search, safety rating, and licence progression.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    borderRadius: 2,
                    p: 1.5,
                    border: '1px solid rgba(255,255,255,0.16)',
                    background: 'linear-gradient(150deg, rgba(23,33,59,0.72), rgba(23,33,59,0.52))',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
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
                          borderRadius: 2,
                          px: 1.5,
                          py: 1.35,
                          minHeight: 78,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          border: '1px solid rgba(255,255,255,0.16)',
                          bgcolor: 'rgba(15,28,56,0.5)',
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
            mt: { xs: 3, md: 4 },
            mb: 0,
            borderRadius: 2.5,
            px: { xs: 2, md: 2.5 },
            py: { xs: 1.5, md: 1.75 },
            border: '1px solid rgba(245,158,11,0.45)',
            background:
              'linear-gradient(135deg, rgba(245,158,11,0.16) 0%, rgba(217,119,6,0.08) 100%), rgba(15,23,42,0.4)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)' }}>
            <Box component="span" sx={{ fontWeight: 800, color: '#fbbf24' }}>
              Note:
            </Box>{' '}
            Licence and Safety Rating calculations are currently work in progress. Values and thresholds may change
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
  initialDriverGuid,
}: {
  drivers: DriverView[];
  loading: boolean;
  error: string | null;
  initialDriverGuid?: string;
}) {
  const [query, setQuery] = useState('');
  const [selectedGuid, setSelectedGuid] = useState('');

  const selected = useMemo(
    () => drivers.find((driver) => driver.guid === selectedGuid) || null,
    [drivers, selectedGuid]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return drivers
      .filter((driver) => driver.name.toLowerCase().includes(q) || driver.guid.includes(q))
      .slice(0, 8);
  }, [drivers, query]);

  useEffect(() => {
    if (!initialDriverGuid || selectedGuid) return;
    const found = drivers.find((driver) => driver.guid === initialDriverGuid);
    if (!found) return;
    setSelectedGuid(found.guid);
    setQuery(found.name);
  }, [drivers, initialDriverGuid, selectedGuid]);

  return (
    <Box
      id="driver-search"
      component="section"
      sx={{
        position: 'relative',
        py: { xs: 6, md: 8 },
        background: 'linear-gradient(180deg, rgba(31,44,73,0.98) 0%, rgba(23,33,59,0.98) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3} sx={{ mb: 3 }}>
          <Stack spacing={1}>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.82)', letterSpacing: 3 }}>
              Driver statistics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Search drivers and view their profile
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 680, color: 'text.secondary' }}>
              This search now uses live data from your previous version (`rank.json`) with real Safety Rating and licence calculations.
            </Typography>
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: { xs: 2.75, md: 3.25 },
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.2)',
            background:
              'linear-gradient(135deg, rgba(19,36,71,0.62) 0%, rgba(35,31,32,0.46) 100%)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <Grid container spacing={2} alignItems="stretch">
            <Grid size={{ xs: 12, md: 9 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Search driver
                </Typography>

                <TextField
                  fullWidth
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedGuid('');
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
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(191,225,255,0.9)',
                        boxShadow: '0 0 0 2px rgba(191,225,255,0.2)',
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
                      mt: 1,
                      borderRadius: 2,
                      maxHeight: 280,
                      overflowY: 'auto',
                      border: '1px solid rgba(255,255,255,0.24)',
                      bgcolor: 'rgba(12,24,50,0.78)',
                      backdropFilter: 'blur(14px)',
                    }}
                  >
                    <List dense disablePadding>
                      {matches.map((driver) => (
                        <ListItemButton
                          key={driver.guid}
                          onClick={() => {
                            setSelectedGuid(driver.guid);
                            setQuery(driver.name);
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
                                {driver.teamRole && (
                                  <Chip
                                    size="small"
                                    label={getRoleLabel(driver.teamRole)}
                                    color={driver.teamRole === 'creator' ? 'secondary' : 'info'}
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
              <Stack spacing={1.25} sx={{ height: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{
                    minHeight: 50,
                    borderRadius: 2,
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.22)',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow:
                      '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.22)',
                    '&:hover': {
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(173,216,255,0.16) 100%)',
                      borderColor: 'rgba(255,255,255,0.3)',
                    },
                  }}
                  href={`${APP_BASE_URL}dashboard`}
                >
                  Open full stats page
                </Button>

                <Box
                  sx={{
                    borderRadius: 1.75,
                    p: 1.5,
                    border: '1px solid rgba(255,255,255,0.16)',
                    bgcolor: 'rgba(9,20,42,0.35)',
                    backdropFilter: 'blur(10px)',
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

                  {selected && (
                    <Box sx={{ mt: 0.75 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Selected driver
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selected.name}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {loading && <Typography color="text.secondary">Loading drivers...</Typography>}
                {error && <Typography color="error">Failed to load driver data: {error}</Typography>}
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {selected && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              border: '1px solid rgba(148,163,184,0.45)',
              background: 'linear-gradient(135deg, rgba(19,36,71,0.96), rgba(35,31,32,0.82))',
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  Driver
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  {selected.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                  {selected.guid}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, md: 8 }}>
                <Grid container spacing={1.5}>
                  {[
                    { label: 'Licence', value: `${selected.license} | ${Math.round(selected.paceScore)}` },
                    { label: 'Safety Rating', value: `${selected.safetyTier} | ${selected.safety.toFixed(2)}` },
                    { label: 'KM', value: formatNumber(Math.round(selected.kilometers)) },
                    { label: 'Collisions', value: formatNumber(selected.collisions) },
                    { label: 'Total Laps', value: formatNumber(selected.totalLaps) },
                    { label: 'Tracks Driven', value: formatNumber(selected.tracksDriven) },
                    { label: 'Favorite Track', value: selected.favoriteTrack },
                  ].map((item) => (
                    <Grid key={item.label} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Box
                        sx={{
                          borderRadius: 2,
                          p: 1.5,
                          ...(item.label === 'Licence'
                            ? (() => {
                                const badge = getLicenseBadgeSx(selected.license) as any;
                                const bg = typeof badge?.bgcolor === 'string' ? badge.bgcolor : '#F59E0B';
                                return {
                                  ...(glassFromHex(bg) as object),
                                };
                              })()
                            : {}),
                          ...(item.label === 'Safety Rating'
                            ? (() => {
                                const badge = getSRBadgeSx(selected.safetyTier) as any;
                                const bg = typeof badge?.bgcolor === 'string' ? badge.bgcolor : '#EF4444';
                                return {
                                  ...(glassFromHex(bg) as object),
                                };
                              })()
                            : {}),

                          ...(item.label !== 'Licence' && item.label !== 'Safety Rating' && {
                            bgcolor: 'rgba(23,33,59,0.82)',
                            border: '1px solid rgba(148,163,184,0.35)',
                          }),
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        )}
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
        py: { xs: 6, md: 10 },
        background: 'radial-gradient(circle at 50% 0%, rgba(23,33,59,0.18) 0, transparent 60%), #17213B',
        overflow: 'hidden',
      }}
    >
      <AnimatedLinesBackground opacity={0.2} />

      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ mb: 4 }}>
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
              detail: topSr ? `KM: ${formatNumber(Math.round(topSr.kilometers))}` : 'Waiting for data',
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
                  borderRadius: 3,
                  p: 2.5,
                  bgcolor: 'rgba(23,33,59,0.9)',
                  border: '1px solid rgba(148,163,184,0.45)',
                  boxShadow: '0 18px 45px rgba(0,0,0,0.7), 0 0 24px rgba(23,33,59,0.16)',
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
  const initialDriverGuid = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('driver') || '';
  }, []);

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
        initialDriverGuid={initialDriverGuid}
      />
      <DashboardSection drivers={drivers} />
    </>
  );
}

