import type { Theme } from '@mui/material/styles';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';
import { subtleEnterUpSx, glassCardMotionSx } from 'src/lib/subtle-motion';
import { GLASS_CARD_SX, GLASS_PANEL_SX, GLASS_CARD_INNER_SX } from 'src/lib/glass';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { brandAccentBorderSx, statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
import {
  formatSignedKm,
  fetchPrevRankData,
  computeCommunitySnapshotDelta,
} from 'src/lib/delta';
import { CAR, formatNumber, formatLaptime, type RankDriver, getTrackDisplayName } from 'src/lib/ac-elite-data';

import { ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [prevRankData, setPrevRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<SiteMetadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, meta, prevRank] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
          fetchJson<SiteMetadata>('/data/metadata.json'),
          fetchPrevRankData(),
        ]);

        if (!mounted) return;
        setRankData(rank);
        setPrevRankData(prevRank);
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
  const syncHealth = getSyncHealth(effectiveLastSync);

  const communityDelta = useMemo(
    () => computeCommunitySnapshotDelta(rankData, prevRankData),
    [rankData, prevRankData]
  );

  return (
    <>
      <title>{`Stats - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite community stats: driver counts, lap totals, and track activity." />
      <meta property="og:title" content="Stats - AC Elite" />
      <meta property="og:description" content="AC Elite community stats: driver counts, lap totals, and track activity." />
      <meta property="og:url" content="https://ac-elite.github.io/dashboard" />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          <Box sx={{ ...GLASS_PANEL_SX, ...statusAccentBorderSx(syncHealth.color), ...statusAccentSplitRimSx(syncHealth.color), ...glassCardMotionSx(0) }}>
            <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="h4" fontWeight={800}>
                Stats
              </Typography>
              <Typography color="text.secondary">
                Community-wide totals for drivers, tracks, laps, and distance.
              </Typography>
              <Typography variant="body2" sx={{ color: syncHealth.color, fontWeight: 700 }}>
                {syncHealth.label} · {syncHealth.ageText}
              </Typography>
              {communityDelta.hasBaseline ? (
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
                  vs daily snapshot:{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                    {formatSignedKm(communityDelta.deltaKm)} km
                  </Box>{' '}
                  community-wide
                  {communityDelta.newDrivers > 0 ? (
                    <>
                      {' '}
                      ·{' '}
                      <Box component="span" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                        +{communityDelta.newDrivers}
                      </Box>{' '}
                      new driver{communityDelta.newDrivers === 1 ? '' : 's'}
                    </>
                  ) : null}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          {loading && (
            <LoadingPanel title="Loading dashboard…" message="Aggregating community totals and track coverage from the latest sync.">
              <Grid container spacing={2.5}>
                {[0, 1, 2, 3].map((k) => (
                  <Grid key={k} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Skeleton
                      variant="rounded"
                      height={152}
                      sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}
                    />
                  </Grid>
                ))}
                {[0, 1, 2].map((k) => (
                  <Grid key={`s-${k}`} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Skeleton
                      variant="rounded"
                      height={124}
                      sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                    />
                  </Grid>
                ))}
                <Grid size={{ xs: 12 }}>
                  <Skeleton
                    variant="rounded"
                    height={100}
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton
                    variant="rounded"
                    height={280}
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Skeleton
                    variant="rounded"
                    height={280}
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Grid>
              </Grid>
            </LoadingPanel>
          )}

          {!loading && error && <ErrorPanel error={error} onRetry={() => window.location.reload()} />}

          {!loading && !error && (
            <Grid container spacing={2.5}>
              {/* Hero metrics — coloured top accent + larger figures */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  component="article"
                  aria-label="Total drivers in synced KMR data"
                  tabIndex={0}
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(1),
                    p: { xs: 2.5, md: 3 },
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    Total Drivers
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: 38, md: 46 },
                      fontWeight: 900,
                      mt: 0.75,
                      lineHeight: 1.05,
                      letterSpacing: -0.02,
                    }}
                  >
                    {formatNumber(quickStats.totalDrivers)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(2),
                    p: { xs: 2.5, md: 3 },
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    Total Laps
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: 38, md: 46 },
                      fontWeight: 900,
                      mt: 0.75,
                      lineHeight: 1.05,
                      letterSpacing: -0.02,
                    }}
                  >
                    {formatNumber(quickStats.totalLaps)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(3),
                    p: { xs: 2.5, md: 3 },
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    Total KM
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: 38, md: 46 },
                      fontWeight: 900,
                      mt: 0.75,
                      lineHeight: 1.05,
                      letterSpacing: -0.02,
                    }}
                  >
                    {formatNumber(quickStats.totalKm)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(4),
                    p: { xs: 2.5, md: 3 },
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)', fontWeight: 700 }}>
                    Incidents / 100 KM
                  </Typography>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: 38, md: 46 },
                      fontWeight: 900,
                      mt: 0.75,
                      lineHeight: 1.05,
                      letterSpacing: -0.02,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {quickStats.incidentsPer100Km.toFixed(2)}
                  </Typography>
                </Paper>
              </Grid>

              {/* Secondary metrics */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(5),
                    p: 2.75,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    Active Drivers (100+ KM)
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.activeDrivers)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(6),
                    p: 2.75,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    Total Tracks
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalTracks)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(7),
                    p: 2.75,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                    Avg KM per Driver
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.avgKmPerDriver)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(8),
                    p: 2.75,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Session Totals
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.5, sm: 3 }}
                    sx={{ mt: 1.25, alignItems: { xs: 'center', sm: 'flex-start' } }}
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
                <Paper
                  sx={{
                    ...GLASS_CARD_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(9),
                    p: 2.75,
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Top Distance Drivers
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                    {topDistanceDrivers.map((driver, idx) => (
                      <Stack
                        key={driver.guid}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          ...GLASS_CARD_INNER_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
                          p: 1.1,
                          borderRadius: 1.5,
                          transition: (t: Theme) => t.transitions.create(['background-color', 'border-color'], { duration: 200 }),
                          '@media (hover: hover)': {
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.06)',
                              borderColor: 'rgba(191,219,254,0.22)',
                            },
                          },
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
                <Paper sx={{ ...GLASS_CARD_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(10), p: 2.75 }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Most Active Tracks
                  </Typography>
                  <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                    {topTracksByEntries.map((track, idx) => (
                      <Stack
                        key={track.trackId}
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{
                          ...GLASS_CARD_INNER_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
                          p: 1.1,
                          borderRadius: 1.5,
                          transition: (t: Theme) => t.transitions.create(['background-color', 'border-color'], { duration: 200 }),
                          '@media (hover: hover)': {
                            '&:hover': {
                              bgcolor: 'rgba(255,255,255,0.06)',
                              borderColor: 'rgba(191,219,254,0.22)',
                            },
                          },
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
