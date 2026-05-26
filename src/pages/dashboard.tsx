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
import {
  GLASS_PANEL_SX,
  GLASS_INNER_ROW_SX,
  GLASS_INNER_PANEL_SX,
  GLASS_PANEL_SPACIOUS_SX,
} from 'src/lib/glass';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { subtleEnterUpSx, glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  CAR,
  getSRTier,
  getSrTierRgb,
  formatNumber,
  safetyRating,
  formatLaptime,
  type RankDriver,
  LICENSE_TIER_RGB,
  getDriverLicense,
  computeLicenseMap,
  LICENSE_TIER_ORDER,
  getTrackDisplayName,
} from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';

import { Reveal } from 'src/components/reveal';
import { StatTile } from 'src/components/stat-tile/stat-tile';
import { Chart, CHART_COLORS } from 'src/components/chart';
import { ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { DataPageHeader } from 'src/components/data-page-header/data-page-header';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

// License + SR chart colours come from the shared tier source (LICENSE_TIER_RGB
// / getSrTierRgb in ac-elite-data) so the donut, the bars and the chips/cards
// all speak one colour language and never drift apart.
function GridCompositionSection({ rankData }: { rankData: RankDriver[] }) {
  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);

  const dist = useMemo(() => {
    const counts = new Map<string, number>();
    rankData.forEach((driver) => {
      const license = getDriverLicense(driver, licenseMap).license;
      if (license === 'Rookie') return;
      counts.set(license, (counts.get(license) ?? 0) + 1);
    });

    const order = LICENSE_TIER_ORDER as readonly string[];
    const entries = [...counts.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1] - a[1];
    });

    return {
      labels: entries.map((e) => e[0]),
      series: entries.map((e) => e[1]),
      colors: entries.map((e) => `rgb(${LICENSE_TIER_RGB[e[0]] ?? LICENSE_TIER_RGB.Bronze})`),
      total: entries.reduce((sum, e) => sum + e[1], 0),
    };
  }, [licenseMap, rankData]);

  const grades = useMemo(() => {
    const order = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
    const counts = new Map<string, number>();

    rankData.forEach((driver) => {
      const safety = safetyRating(driver);
      const grade = getSRTier(safety, driver.kilometers || 0)[0]?.toUpperCase() || '?';
      if (grade === 'F') return;
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    });

    const entries = [...counts.entries()].sort((a, b) => {
      const ai = order.indexOf(a[0]);
      const bi = order.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a[0].localeCompare(b[0]);
    });

    return {
      categories: entries.map((e) => e[0]),
      data: entries.map((e) => e[1]),
      colors: entries.map((e) => `rgb(${getSrTierRgb(e[0])})`),
    };
  }, [rankData]);

  if (!rankData.length || !dist.total) return null;

  return (
    <Grid size={{ xs: 12 }}>
      <Reveal>
        <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(8) }}>
        <Stack spacing={0.7} sx={{ mb: 2 }}>
          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
            Grid composition
          </Typography>
          <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
            The field at a glance
          </Typography>
          <Typography color="text.secondary">
            How the field breaks down across earned license tiers and Safety Rating — {formatNumber(dist.total)} ranked
            drivers (starting Rookie &amp; F tiers excluded).
          </Typography>
        </Stack>

      <Grid container spacing={2.5} alignItems="stretch">
        <Grid size={{ xs: 12, md: 6 }}>
          <Reveal index={1} sx={{ height: 1 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, height: 1, p: 2 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                License tiers
              </Typography>
              <Chart
                type="donut"
                height={360}
                series={dist.series}
                options={{
                  labels: dist.labels,
                  colors: dist.colors,
                  stroke: { width: 0 },
                  fill: { type: 'solid' },
                  legend: { position: 'bottom', horizontalAlign: 'center' },
                  dataLabels: { enabled: false },
                  tooltip: { y: { formatter: (v: number) => `${formatNumber(v)} drivers` } },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: '72%',
                        labels: {
                          show: true,
                          name: { color: 'rgba(255,255,255,0.6)' },
                          value: {
                            color: '#fff',
                            fontSize: '30px',
                            fontWeight: 800,
                            formatter: (v: string) => formatNumber(Number(v)),
                          },
                          total: {
                            show: true,
                            label: 'Drivers',
                            color: 'rgba(255,255,255,0.6)',
                            formatter: () => formatNumber(dist.total),
                          },
                        },
                      },
                    },
                  },
                }}
              />
            </Box>
          </Reveal>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Reveal index={2} sx={{ height: 1 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, height: 1, p: 2 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                Safety Rating grades
              </Typography>
              <Chart
                type="bar"
                height={360}
                series={[{ name: 'Drivers', data: grades.data }]}
                options={{
                  colors: grades.colors,
                  fill: { type: 'solid' },
                  legend: { show: false },
                  plotOptions: {
                    bar: {
                      distributed: true,
                      borderRadius: 8,
                      borderRadiusApplication: 'end',
                      columnWidth: '52%',
                      dataLabels: { position: 'top' },
                    },
                  },
                  dataLabels: {
                    enabled: true,
                    offsetY: -20,
                    formatter: (v: number) => formatNumber(Number(v)),
                    style: { colors: ['rgba(255,255,255,0.92)'], fontWeight: 700, fontSize: '12px' },
                  },
                  xaxis: { categories: grades.categories },
                  yaxis: { labels: { formatter: (v: number) => formatNumber(Math.round(v)) } },
                  grid: { xaxis: { lines: { show: false } }, yaxis: { lines: { show: true } } },
                  tooltip: { y: { formatter: (v: number) => `${formatNumber(v)} drivers` } },
                }}
              />
            </Box>
          </Reveal>
        </Grid>
      </Grid>
        </Box>
      </Reveal>
    </Grid>
  );
}

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

  const trackActivityChart = useMemo(() => {
    const rows = Object.entries(leaderboardData || {})
      .map(([trackId, trackData]) => ({
        name: getTrackDisplayName(trackId),
        entries: Array.isArray((trackData as Record<string, any>)?.[CAR])
          ? ((trackData as Record<string, any>)[CAR] as any[]).length
          : 0,
      }))
      .filter((r) => r.entries > 0)
      .sort((a, b) => b.entries - a.entries)
      .slice(0, 10);
    return { categories: rows.map((r) => r.name), data: rows.map((r) => r.entries) };
  }, [leaderboardData]);

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
          <DataPageHeader
            title="Stats"
            description="Community-wide totals for drivers, tracks, laps, and distance."
            syncHealth={syncHealth}
          >
            <Box sx={{ pt: 0.5 }}>
              <TrendWindowStats variant="community" rankData={rankData} />
            </Box>
          </DataPageHeader>

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

              <GridCompositionSection rankData={rankData} />

              {trackActivityChart.categories.length > 0 && (
                <Grid size={{ xs: 12 }}>
                 <Reveal>
                  <Paper sx={{ ...GLASS_PANEL_SPACIOUS_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(8) }}>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                      Track activity
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3, mb: 1 }}>
                      Laps logged by track
                    </Typography>
                    <Chart
                      type="bar"
                      height={Math.max(300, trackActivityChart.categories.length * 40)}
                      series={[{ name: 'Entries', data: trackActivityChart.data }]}
                      options={{
                        colors: CHART_COLORS,
                        fill: { type: 'solid' },
                        legend: { show: false },
                        plotOptions: {
                          bar: {
                            horizontal: true,
                            distributed: true,
                            borderRadius: 7,
                            borderRadiusApplication: 'end',
                            barHeight: '64%',
                          },
                        },
                        dataLabels: {
                          enabled: true,
                          textAnchor: 'start',
                          offsetX: 4,
                          formatter: (v: number) => formatNumber(Number(v)),
                          style: { colors: ['rgba(255,255,255,0.92)'], fontWeight: 700, fontSize: '12px' },
                        },
                        xaxis: { categories: trackActivityChart.categories, labels: { show: false } },
                        grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
                        tooltip: { y: { formatter: (v: number) => `${formatNumber(v)} entries` } },
                      }}
                    />
                  </Paper>
                 </Reveal>
                </Grid>
              )}

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper
                  sx={{
                    ...GLASS_PANEL_SPACIOUS_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(9),
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
                          ...GLASS_INNER_ROW_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
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
                <Paper sx={{ ...GLASS_PANEL_SPACIOUS_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(10) }}>
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
                          ...GLASS_INNER_ROW_SX,
                          ...subtleEnterUpSx(idx, { baseDelayMs: 520 }),
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
