import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
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
  GLASS_INNER_PANEL_SX,
  GLASS_PANEL_SPACIOUS_SX,
} from 'src/lib/glass';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  CAR,
  getSRTier,
  getSrTierRgb,
  formatNumber,
  safetyRating,
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

    const series = entries.map((e) => e[1]);
    // Display-only angular sizes: a gentle power compression (exp 0.7) widens the
    // tiny top tiers (Elite/Diamond+) enough to be visible and trims the dominant
    // Bronze wedge — slight, deliberate disproportion. Legend %, tooltip counts and
    // the center total all stay sourced from the real `series`/`total` below.
    const displaySeries = series.map((v) => Math.round(Math.pow(v, 0.7) * 100) / 100);

    return {
      labels: entries.map((e) => e[0]),
      series,
      displaySeries,
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
              How the field breaks down across earned license tiers and Safety Rating —{' '}
              {formatNumber(dist.total)} ranked drivers (Rookie &amp; F tiers excluded).
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
                    series={dist.displaySeries}
                    options={{
                      // Disable ApexCharts' default pie/donut drop shadow so the chart
                      // sits flat like the bar chart and the rest of the site's charts.
                      chart: { dropShadow: { enabled: false } },
                      labels: dist.labels,
                      colors: dist.colors,
                      stroke: { width: 0 },
                      fill: { type: 'solid' },
                      // Append each tier's share so the small slivers stay quantifiable.
                      legend: {
                        position: 'bottom',
                        horizontalAlign: 'center',
                        formatter: (name: string, opts: { seriesIndex: number }) => {
                          const value = dist.series[opts.seriesIndex] ?? 0;
                          const pct = dist.total > 0 ? (value / dist.total) * 100 : 0;
                          return `${name} · ${pct < 1 ? '<1' : pct.toFixed(0)}%`;
                        },
                      },
                      dataLabels: { enabled: false },
                      tooltip: {
                        // Pie/donut otherwise fills the tooltip row with the slice color,
                        // which leaves white text unreadable on light tiers (Platinum/Silver).
                        fillSeriesColor: false,
                        y: {
                          // Map the compressed display value back to the real count.
                          formatter: (_v: number, opts: { seriesIndex: number }) =>
                            `${formatNumber(dist.series[opts.seriesIndex] ?? 0)} drivers`,
                        },
                      },
                      plotOptions: {
                        pie: {
                          donut: {
                            size: '72%',
                            labels: {
                              show: true,
                              name: { color: 'rgba(255,255,255,0.6)' },
                              value: {
                                color: '#fff',
                                fontSize: 'clamp(22px, 6.5vw, 30px)',
                                fontWeight: 800,
                                // Show the real count for the hovered slice, not the
                                // compressed display value.
                                formatter: (_v: string, opts?: { seriesIndex: number }) =>
                                  formatNumber(dist.series[opts?.seriesIndex ?? 0] ?? 0),
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
                        style: {
                          colors: ['rgba(255,255,255,0.92)'],
                          fontWeight: 700,
                          fontSize: 'clamp(10px, 2.7vw, 12px)',
                        },
                      },
                      xaxis: { categories: grades.categories },
                      // Log scale so the small grades (S/A/B…) stay legible next to the
                      // dominant entry grade instead of collapsing into invisible stubs.
                      yaxis: {
                        logarithmic: true,
                        logBase: 10,
                        labels: { formatter: (v: number) => formatNumber(Math.round(v)) },
                      },
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
    const incidentsPer100Km =
      totalKm > 0 ? ((totalCollisions + totalInfractions) / totalKm) * 100 : 0;

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

  const driverActivityChart = useMemo(() => {
    const rows = [...rankData]
      .filter((d) => (d.kilometers || 0) > 0)
      .sort((a, b) => (b.kilometers || 0) - (a.kilometers || 0))
      .slice(0, 20)
      .map((driver) => ({
        guid: driver.guid,
        name: driver.name || 'Unknown',
        km: Math.round(driver.kilometers || 0),
      }));
    return {
      categories: rows.map((r) => r.name),
      data: rows.map((r) => r.km),
      guids: rows.map((r) => r.guid),
      driverCount: rows.length,
    };
  }, [rankData]);

  const tracksWithEntries = useMemo(
    () =>
      Object.entries(leaderboardData || {})
        .map(([trackId, trackData]) => ({
          trackId,
          entries: Array.isArray((trackData as Record<string, any>)?.[CAR])
            ? ((trackData as Record<string, any>)[CAR] as any[]).length
            : 0,
        }))
        .filter((t) => t.entries > 0),
    [leaderboardData]
  );

  const trackActivityChart = useMemo(() => {
    const rows = [...tracksWithEntries].sort((a, b) => b.entries - a.entries);
    return {
      categories: rows.map((r) => getTrackDisplayName(r.trackId)),
      data: rows.map((r) => r.entries),
      trackIds: rows.map((r) => r.trackId),
      trackCount: rows.length,
    };
  }, [tracksWithEntries]);

  const effectiveLastSync = getEffectiveLastSync(metadata?.lastSync, rankData);
  const syncHealth = getSyncHealth(effectiveLastSync);

  return (
    <>
      <title>{`Stats - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="AC Elite community stats: driver counts, lap totals, and track activity."
      />
      <meta property="og:title" content="Stats - AC Elite" />
      <meta
        property="og:description"
        content="AC Elite community stats: driver counts, lap totals, and track activity."
      />
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
              <LoadingPanel
                title="Loading dashboard…"
                message="Aggregating community totals and track coverage from the latest sync."
              >
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
                  {[400, 400].map((h, i) => (
                    <Grid key={`chart-${i}`} size={{ xs: 12 }}>
                      <Skeleton
                        variant="rounded"
                        height={h}
                        sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </LoadingPanel>
            )}

            {!loading && error && (
              <ErrorPanel error={error} onRetry={() => window.location.reload()} />
            )}

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
                      <Paper
                        sx={{
                          ...GLASS_PANEL_SPACIOUS_SX,
                          ...brandAccentBorderSx(),
                          ...glassCardMotionSx(8),
                        }}
                      >
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                          Track activity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3 }}>
                          Laps logged by track
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                          All {formatNumber(trackActivityChart.trackCount)} tracks with at least one
                          logged lap, sorted by activity.
                        </Typography>
                        <Chart
                          type="bar"
                          height={Math.max(300, trackActivityChart.categories.length * 40)}
                          series={[{ name: 'Laps', data: trackActivityChart.data }]}
                          sx={{ cursor: 'pointer' }}
                          options={{
                            colors: CHART_COLORS,
                            fill: { type: 'solid' },
                            legend: { show: false },
                            chart: {
                              events: {
                                dataPointSelection: (
                                  _e: unknown,
                                  _ctx: unknown,
                                  opts: { dataPointIndex: number }
                                ) => {
                                  const trackId = trackActivityChart.trackIds[opts.dataPointIndex];
                                  if (trackId) {
                                    window.location.href = getLeaderboardHref(trackId);
                                  }
                                },
                              },
                            },
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
                              style: {
                                colors: ['rgba(255,255,255,0.92)'],
                                fontWeight: 700,
                                fontSize: 'clamp(10px, 2.7vw, 12px)',
                              },
                            },
                            xaxis: {
                              categories: trackActivityChart.categories,
                              labels: { show: false },
                            },
                            grid: {
                              xaxis: { lines: { show: true } },
                              yaxis: { lines: { show: false } },
                            },
                            tooltip: {
                              y: { formatter: (v: number) => formatNumber(v) },
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}
                        >
                          Tap a bar to open that track&apos;s leaderboard.
                        </Typography>
                      </Paper>
                    </Reveal>
                  </Grid>
                )}

                {driverActivityChart.categories.length > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Reveal>
                      <Paper
                        sx={{
                          ...GLASS_PANEL_SPACIOUS_SX,
                          ...brandAccentBorderSx(),
                          ...glassCardMotionSx(9),
                        }}
                      >
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                          Driver activity
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3 }}>
                          Distance driven
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                          Top {formatNumber(driverActivityChart.driverCount)} drivers by kilometers
                          logged.
                        </Typography>
                        <Chart
                          type="bar"
                          height={Math.max(300, driverActivityChart.categories.length * 40)}
                          series={[{ name: 'KM', data: driverActivityChart.data }]}
                          sx={{ cursor: 'pointer' }}
                          options={{
                            colors: CHART_COLORS,
                            fill: { type: 'solid' },
                            legend: { show: false },
                            chart: {
                              events: {
                                dataPointSelection: (
                                  _e: unknown,
                                  _ctx: unknown,
                                  opts: { dataPointIndex: number }
                                ) => {
                                  const guid = driverActivityChart.guids[opts.dataPointIndex];
                                  if (guid) {
                                    window.location.href = getDriverProfileHref(guid);
                                  }
                                },
                              },
                            },
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
                              style: {
                                colors: ['rgba(255,255,255,0.92)'],
                                fontWeight: 700,
                                fontSize: 'clamp(10px, 2.7vw, 12px)',
                              },
                            },
                            xaxis: {
                              categories: driverActivityChart.categories,
                              labels: { show: false },
                            },
                            grid: {
                              xaxis: { lines: { show: true } },
                              yaxis: { lines: { show: false } },
                            },
                            tooltip: {
                              y: { formatter: (v: number) => `${formatNumber(v)} km` },
                            },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 0.5 }}
                        >
                          Tap a bar to open the driver profile.
                        </Typography>
                      </Paper>
                    </Reveal>
                  </Grid>
                )}
              </Grid>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
