import type { Theme } from '@mui/material/styles';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';
import { getLeaderboardHref, getDriverProfileHref } from 'src/lib/routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { GLASS_CARD_SX, GLASS_PANEL_SX, GLASS_CARD_INNER_SX } from 'src/lib/glass';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { subtleEnterUpSx, glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx, statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
import { CAR, formatNumber, formatLaptime, type RankDriver, getTrackDisplayName } from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';

import { StatTile } from 'src/components/stat-tile/stat-tile';
import { ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

export default function Page() {
  useTrackCatalogVersion();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<SiteMetadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, meta] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchJson<Record<string, any>>(DATA_FILES.leaderboard),
          fetchJson<SiteMetadata>(DATA_FILES.metadata),
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
  const syncHealth = getSyncHealth(effectiveLastSync);

  return (
    <>
      <title>{`Stats - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite community stats: driver counts, lap totals, and track activity." />
      <meta property="og:title" content="Stats - AC Elite" />
      <meta property="og:description" content="AC Elite community stats: driver counts, lap totals, and track activity." />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.dashboard)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          <Box sx={softFloatWrapperSx()}>
            <Box sx={{ ...GLASS_PANEL_SX, ...statusAccentBorderSx(syncHealth.color), ...statusAccentSplitRimSx(syncHealth.color), ...glassCardMotionSx(0) }}>
              <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="h4" fontWeight={800}>
                  Stats
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Community-wide totals for drivers, tracks, laps, and distance.
                </Typography>
                <Typography variant="body2" sx={{ color: syncHealth.color, fontWeight: 700 }}>
                  {syncHealth.label} · {syncHealth.ageText}
                </Typography>
                <Box sx={{ pt: 0.5 }}>
                  <TrendWindowStats variant="community" rankData={rankData} />
                </Box>
              </Stack>
            </Box>
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
              {/* Hero metrics — larger figures */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatTile
                  size="hero"
                  motionIndex={1}
                  label="Total Drivers"
                  value={formatNumber(quickStats.totalDrivers)}
                  ariaLabel="Total drivers in synced KMR data"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatTile
                  size="hero"
                  motionIndex={2}
                  label="Total Laps"
                  value={formatNumber(quickStats.totalLaps)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatTile
                  size="hero"
                  motionIndex={3}
                  label="Total KM"
                  value={formatNumber(quickStats.totalKm)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatTile
                  size="hero"
                  motionIndex={4}
                  label="Incidents / 100 KM"
                  value={quickStats.incidentsPer100Km.toFixed(2)}
                />
              </Grid>

              {/* Secondary metrics */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <StatTile
                  motionIndex={5}
                  label="Active Drivers (100+ KM)"
                  value={formatNumber(quickStats.activeDrivers)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <StatTile
                  motionIndex={6}
                  label="Total Tracks"
                  value={formatNumber(quickStats.totalTracks)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <StatTile
                  motionIndex={7}
                  label="Avg KM per Driver"
                  value={formatNumber(quickStats.avgKmPerDriver)}
                />
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
                        onClick={() => {
                          window.location.href = getDriverProfileHref(driver.guid);
                        }}
                        sx={{
                          ...GLASS_CARD_INNER_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
                          p: 1.1,
                          borderRadius: 1.5,
                          cursor: 'pointer',
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
                        onClick={() => {
                          window.location.href = getLeaderboardHref(track.trackId);
                        }}
                        sx={{
                          ...GLASS_CARD_INNER_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
                          p: 1.1,
                          borderRadius: 1.5,
                          cursor: 'pointer',
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
                            #{idx + 1}{' '}
                            <Link
                              href={getLeaderboardHref(track.trackId)}
                              onClick={(e) => e.stopPropagation()}
                              underline="hover"
                              color="inherit"
                              sx={{ fontWeight: 600 }}
                            >
                              {getTrackDisplayName(track.trackId)}
                            </Link>
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
