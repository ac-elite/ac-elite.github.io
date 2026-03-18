import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { getTrackDisplayName } from 'src/lib/ac-elite-data';

type RankDriver = {
  guid: string;
  name?: string;
  kilometers?: number;
  collisions?: number;
  infr?: number;
  wins?: number;
  podiums?: number;
  poles?: number;
  flaps?: number;
  last_seen?: number;
};

type Metadata = {
  lastSync?: string;
  status?: string;
  error?: string;
};

const APP_BASE_URL = import.meta.env.BASE_URL;
const CAR = 'tatuusfa1';

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatLaptime(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return '—';
  const min = Math.floor(ms / 60000);
  const sec = ((ms / 1000) % 60).toFixed(3).padStart(6, '0');
  return `${min}:${sec}`;
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

function getSyncBadge(lastSync?: string) {
  if (!lastSync) return { label: 'Unknown', color: '#f59e0b' };

  const timestamp = new Date(lastSync).getTime();
  if (!Number.isFinite(timestamp)) return { label: 'Unknown', color: '#f59e0b' };

  const diffMs = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs <= 2 * hour) return { label: 'Live', color: '#22c55e' };
  if (diffMs <= day) return { label: 'Delayed', color: '#f59e0b' };
  return { label: 'Stale', color: '#ef4444' };
}

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 48px 48px, 48px 48px; }
`;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<Metadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, meta] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
          fetchJson<Metadata>('/data/metadata.json'),
        ]);

        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
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

  const quickStats = useMemo(() => {
    const totalDrivers = rankData.length;
    const totalTracks = Object.keys(leaderboardData || {}).length;

    let totalLaps = 0;
    let totalKm = 0;
    let totalCollisions = 0;
    let totalInfractions = 0;
    let totalWins = 0;
    let totalPodiums = 0;
    let totalPoles = 0;
    let totalFastestLaps = 0;

    for (const d of rankData) {
      totalKm += d.kilometers || 0;
      totalCollisions += d.collisions || 0;
      totalInfractions += d.infr || 0;
      totalWins += d.wins || 0;
      totalPodiums += d.podiums || 0;
      totalPoles += d.poles || 0;
      totalFastestLaps += d.flaps || 0;
    }

    for (const track of Object.values(leaderboardData || {})) {
      // track -> { [carId]: arrayOfRows }
      if (!track || typeof track !== 'object') continue;
      for (const carRows of Object.values(track as Record<string, any>)) {
        if (Array.isArray(carRows)) totalLaps += carRows.length;
      }
    }

    const activeDrivers = rankData.filter((driver) => (driver.kilometers || 0) >= 100).length;
    const avgKmPerDriver = totalDrivers > 0 ? Math.round(totalKm / totalDrivers) : 0;
    const incidentsPer100Km = totalKm > 0 ? ((totalCollisions + totalInfractions) / totalKm) * 100 : 0;

    return {
      totalDrivers,
      activeDrivers,
      totalTracks,
      totalLaps,
      totalKm: Math.round(totalKm),
      avgKmPerDriver,
      totalCollisions,
      totalInfractions,
      totalWins,
      totalPodiums,
      totalPoles,
      totalFastestLaps,
      incidentsPer100Km,
    };
  }, [leaderboardData, rankData]);

  const topDistanceDrivers = useMemo(
    () =>
      [...rankData]
        .sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0))
        .slice(0, 5)
        .map((driver) => ({
          guid: driver.guid,
          name: driver.name || 'Unknown',
          km: Math.round(driver.kilometers || 0),
        })),
    [rankData]
  );

  const topTracksByEntries = useMemo(
    () =>
      Object.entries(leaderboardData || {})
      .map(([trackId, trackData]) => ({
        trackId,
        entries: Array.isArray((trackData as Record<string, any>)?.[CAR])
          ? ((trackData as Record<string, any>)[CAR] as any[]).length
          : 0,
        bestLap:
          Array.isArray((trackData as Record<string, any>)?.[CAR]) &&
          typeof (trackData as Record<string, any>)[CAR]?.[0]?.laptime === 'number'
            ? (trackData as Record<string, any>)[CAR][0].laptime
            : undefined,
      }))
      .sort((a, b) => b.entries - a.entries)
      .slice(0, 5),
    [leaderboardData]
  );

  const effectiveLastSync = getEffectiveLastSync(metadata?.lastSync, rankData);
  const lastSyncText = formatTimeAgo(effectiveLastSync);
  const syncBadge = getSyncBadge(effectiveLastSync);

  return (
    <>
      <title>{`Stats - ${CONFIG.appName}`}</title>

      <meta name="description" content="AC Elite Stats (v2)" />
      <meta name="keywords" content="react,material,kit,stats,ac elite" />

      <Box
        sx={{
          position: 'relative',
          py: 4,
          background:
            'radial-gradient(circle at 20% 0%, rgba(23,33,59,0.24) 0, transparent 50%),' +
            'linear-gradient(180deg, #17213B 0%, #1f2c49 100%)',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.45,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),' +
              'repeating-linear-gradient(45deg, transparent, transparent 92px, rgba(147,197,253,0.16) 92px, rgba(147,197,253,0.16) 94px)',
            backgroundSize: '48px 48px, 48px 48px, 100% 100%',
            animation: `${gridMove} 20s linear infinite`,
            mixBlendMode: 'screen',
          }}
        />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3.5}>
          <Stack spacing={0.75}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 0.5 }}>
              Stats
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: syncBadge.color, fontWeight: 700 }}>
                {syncBadge.label}
              </Box>{' '}
              Data sync • Last update: {lastSyncText}
            </Typography>
          </Stack>

          {loading && (
            <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.3)' }}>
              <Typography>Loading data…</Typography>
            </Paper>
          )}

          {!loading && error && (
            <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.3)' }}>
              <Typography color="error" fontWeight={700}>
                Failed to load data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {error}
              </Typography>
              <Button
                sx={{
                  mt: 2,
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
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </Paper>
          )}

          {!loading && !error && (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Drivers
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalDrivers)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Active Drivers (100+ KM)
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.activeDrivers)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Tracks
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalTracks)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Avg KM per Driver
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.avgKmPerDriver)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Laps
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalLaps)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Incidents / 100 KM
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {quickStats.incidentsPer100Km.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total KM
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalKm)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Session Totals
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    sx={{ mt: 1.25 }}
                  >
                    <Typography variant="body2">
                      Wins: <Box component="span" sx={{ fontWeight: 700 }}>{formatNumber(quickStats.totalWins)}</Box>
                    </Typography>
                    <Typography variant="body2">
                      Podiums:{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>{formatNumber(quickStats.totalPodiums)}</Box>
                    </Typography>
                    <Typography variant="body2">
                      Poles: <Box component="span" sx={{ fontWeight: 700 }}>{formatNumber(quickStats.totalPoles)}</Box>
                    </Typography>
                    <Typography variant="body2">
                      Fastest Laps:{' '}
                      <Box component="span" sx={{ fontWeight: 700 }}>
                        {formatNumber(quickStats.totalFastestLaps)}
                      </Box>
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Top Distance Drivers
                  </Typography>
                  <Stack spacing={1.1} sx={{ mt: 1.25 }}>
                    {topDistanceDrivers.map((driver, idx) => (
                      <Stack
                        key={driver.guid}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: 1.1,
                          borderRadius: 1.5,
                          border: '1px solid rgba(148,163,184,0.28)',
                          bgcolor: 'rgba(15,26,52,0.45)',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          #{idx + 1} {driver.name}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {formatNumber(driver.km)} km
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 2.75, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Most Active Tracks
                  </Typography>
                  <Stack spacing={1.1} sx={{ mt: 1.25 }}>
                    {topTracksByEntries.map((track, idx) => (
                      <Stack
                        key={track.trackId}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          p: 1.1,
                          borderRadius: 1.5,
                          border: '1px solid rgba(148,163,184,0.28)',
                          bgcolor: 'rgba(15,26,52,0.45)',
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            #{idx + 1} {getTrackDisplayName(track.trackId)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Best lap: {formatLaptime(track.bestLap)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {formatNumber(track.entries)} entries
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}

        </Stack>
      </Container>
      </Box>
    </>
  );
}
