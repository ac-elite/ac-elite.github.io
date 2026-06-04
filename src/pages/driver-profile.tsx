import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { SITE_TEAM_ROLES } from 'src/site-manual-config';
import { getDiscordRolesForGuid } from 'src/lib/team-roles';
import { getHomeHref, getLeaderboardTrackSearch } from 'src/lib/routes';
import { BRAND_ACCENT, brandAccentBorderSx } from 'src/lib/status-accent';
import { liveriesAssetUrl, getTeamLiveryMeta } from 'src/lib/driver-liveries';
import { fetchPrevRankData } from 'src/lib/delta';
import { useWindowedDriverDeltas } from 'src/lib/trend-window/trend-window-context';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { GLASS_PANEL_SX, GLASS_INNER_PANEL_SX, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import {
  subtleEnterUpSx,
  subtleRowEnterSx,
  glassCardMotionSx,
  softFloatWrapperSx,
  glassCardEnterOnlySx,
} from 'src/lib/subtle-motion';
import {
  DATA_PAGE_SHELL_SX,
  ACTION_PRIMARY_SMALL_SX,
  PANEL_OVERLINE_MUTED_SX,
  HERO_TERTIARY_CAPTION_SX,
  ACTION_OUTLINED_SMALL_DENSE_SX,
} from 'src/lib/page-shell';
import {
  CAR,
  getDriverSR,
  calculateGap,
  getSRBadgeSx,
  getSRPanelSx,
  formatNumber,
  ROLE_CHIP_SX,
  formatLaptime,
  SR_CHIP_WIDTH,
  getPodiumChipSx,
  type RankDriver,
  type DiscordRole,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  getLicensePanelSx,
  LICENSE_CHIP_WIDTH,
  getTrackDisplayName,
  getDriverOverallRank,
  type LeaderboardCarRow,
} from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';

import { Chart, CHART_COLORS } from 'src/components/chart';
import { Reveal } from 'src/components/reveal';
import { DeltaChip } from 'src/components/delta-chip/delta-chip';
import { EmptyState, ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { LiveryEnlargeDialog } from 'src/components/livery/livery-enlarge-dialog';
import { DriverSessionsTable } from 'src/components/driver-sessions/driver-sessions-table';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

/** Stagger inner stat cards after the hero panel starts animating */
const INNER_CARD_MOTION = { baseDelayMs: 380 } as const;

/** KMR money tile accent — matches the +/- colours used by {@link DeltaChip}. */
const MONEY_POSITIVE = '#4ADE80';
const MONEY_NEGATIVE = '#FB7185';

/** Top row: License + SR span half the grid each; below: 6 + 6 compact stats (14 cells). */
const DRIVER_STAT_GRID_SX = {
  display: 'grid',
  gap: 1.5,
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(6, minmax(0, 1fr))',
  },
} as const;

/** Tight padding, height from content — avoids empty space under short labels. */
const DRIVER_STAT_COMPACT_SX = {
  ...GLASS_INNER_PANEL_SX,
  p: 1.25,
  textAlign: { xs: 'center', md: 'left' } as const,
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'flex-start',
} as const;

/** Hero License / SR: wide cells, larger type, stronger presence. */
const DRIVER_STAT_HERO_SX = {
  ...GLASS_INNER_PANEL_SX,
  gridColumn: { xs: 'span 2', sm: 'span 3', md: 'span 3' },
  p: { xs: 1.75, sm: 2, md: 2.25 },
  textAlign: { xs: 'center', md: 'left' } as const,
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box' as const,
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  minHeight: { xs: 128, md: 140 },
} as const;

/**
 * Quiet glass hover for License / SR hero cards.
 * (Other stat tiles use {@link glassCardEnterOnlySx} without hover.)
 */
const DRIVER_STAT_HERO_GLASS_HOVER_SX = {
  cursor: 'default',
  transition:
    'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'translateY(-1px)',
      filter: 'brightness(1.014)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.16)',
        'inset 0 -1px 0 rgba(0,0,0,0.16)',
        '0 10px 26px -24px rgba(0,0,0,0.7)',
      ].join(', '),
    },
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': {
      transform: 'none',
      filter: 'none',
    },
  },
} as const;

type TrackStatRow = {
  trackId: string;
  trackName: string;
  position: number;
  totalDrivers: number;
  lapTime: number;
  gap: string;
  laps: number;
};

/** Same file as Livery Showcase — toggles whether team skins are promoted site-wide. */
type LiveryShowcaseSectionsFile = {
  officialPack?: boolean;
  aceSkinPack?: boolean;
  teamLiveries?: boolean;
};

export default function Page() {
  useTrackCatalogVersion();
  const navigate = useNavigate();
  const { openGuide } = useLicenseSafetyGuide();
  const { driverGuid = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [prevRankData, setPrevRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const teamRoles = SITE_TEAM_ROLES;
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const [liveryShowcaseSections, setLiveryShowcaseSections] =
    useState<LiveryShowcaseSectionsFile | null>(null);

  // SR/pace delta for this driver, following the shared trend-window filter.
  const deltas = useWindowedDriverDeltas(rankData, prevRankData);
  const delta = deltas.get(driverGuid) ?? null;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, prevRank, meta, liverySectionsRaw] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchJson<Record<string, any>>(DATA_FILES.leaderboard),
          fetchPrevRankData(),
          fetchJson<SiteMetadata>(DATA_FILES.metadata).catch(() => ({})),
          fetchJson<LiveryShowcaseSectionsFile>(DATA_FILES.liveryShowcaseSections).catch(
            () => ({})
          ),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setPrevRankData(prevRank);
        setLeaderboardData(leaderboard);
        setMetadata(meta);
        setLiveryShowcaseSections(
          liverySectionsRaw && typeof liverySectionsRaw === 'object' ? liverySectionsRaw : {}
        );
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
  }, [driverGuid]);

  const driver = useMemo(
    () => rankData.find((item) => item.guid === driverGuid) || null,
    [driverGuid, rankData]
  );

  /** Same ordering as Rankings → Overall (combined score, pace tie-break), not raw `rank.json` order. */
  const overallRank = useMemo(
    () => (driver ? getDriverOverallRank(rankData, driver.guid) : null),
    [driver, rankData]
  );

  const driverSeasonHeaderBandSx = useMemo(() => {
    const base = {
      ...GLASS_INNER_PANEL_SX,
      borderRadius: 2,
      px: { xs: 2, md: 2.25 },
      py: { xs: 1.5, md: 1.75 },
      mb: 0,
    };
    if (overallRank === 1) {
      return {
        ...base,
        borderColor: 'rgba(245,158,11,0.42)',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0) 58%),' +
          'radial-gradient(340px 160px at 80px -60px, rgba(245,158,11,0.18), rgba(245,158,11,0.04) 48%, transparent 78%)',
      };
    }
    if (overallRank === 2) {
      return {
        ...base,
        borderColor: 'rgba(203,213,225,0.34)',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0) 58%),' +
          'radial-gradient(340px 160px at 80px -60px, rgba(203,213,225,0.14), rgba(203,213,225,0.035) 48%, transparent 78%)',
      };
    }
    if (overallRank === 3) {
      return {
        ...base,
        borderColor: 'rgba(194,101,31,0.38)',
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0) 58%),' +
          'radial-gradient(340px 160px at 80px -60px, rgba(194,101,31,0.16), rgba(194,101,31,0.04) 48%, transparent 78%)',
      };
    }
    return base;
  }, [overallRank]);

  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);
  const license = useMemo(
    () => (driver ? getDriverLicense(driver, licenseMap) : null),
    [driver, licenseMap]
  );
  const sr = useMemo(() => (driver ? getDriverSR(driver) : null), [driver]);

  useEffect(() => {
    const baseTitle = `Driver Profile - ${CONFIG.appName}`;
    const baseDesc = 'AC Elite driver profile and per-track leaderboard performance.';
    const resetHead = () => {
      document.title = baseTitle;
      document
        .querySelector('meta[property="og:title"]')
        ?.setAttribute('content', 'Driver Profile - AC Elite');
      document.querySelector('meta[name="description"]')?.setAttribute('content', baseDesc);
      document.querySelector('meta[property="og:description"]')?.setAttribute('content', baseDesc);
    };

    if (!driver) {
      resetHead();
      return undefined;
    }
    const lic = license?.license ?? '—';
    const srPart = sr != null ? sr.sr.toFixed(2) : '—';
    document.title = `${driver.name} · ${lic} · SR ${srPart} | ${CONFIG.appName}`;
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', `${driver.name} · ${lic} · SR ${srPart}`);
    const desc = `Leaderboards and stats for ${driver.name} on AC Elite.`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc);
    return () => {
      resetHead();
    };
  }, [driver, license, sr]);

  const trackRows = useMemo<TrackStatRow[]>(() => {
    if (!driver) return [];

    const rows: TrackStatRow[] = [];
    for (const [trackId, trackData] of Object.entries(leaderboardData || {})) {
      const carRows = Array.isArray((trackData as Record<string, any>)?.[CAR])
        ? ([...(trackData as Record<string, any>)[CAR]] as LeaderboardCarRow[]).filter(
            (item) => typeof item?.laptime === 'number'
          )
        : [];

      if (!carRows.length) continue;

      carRows.sort((a, b) => (a.laptime || 0) - (b.laptime || 0));
      const index = carRows.findIndex((item) => item.guid === driver.guid);
      if (index < 0) continue;

      const row = carRows[index];
      if (typeof row.laptime !== 'number') continue;

      const fastest = carRows[0]?.laptime || row.laptime;
      rows.push({
        trackId,
        trackName: getTrackDisplayName(trackId),
        position: index + 1,
        totalDrivers: carRows.length,
        lapTime: row.laptime,
        gap: index === 0 ? '-' : calculateGap(fastest, row.laptime),
        laps: row.laps || 0,
      });
    }

    return rows.sort((a, b) => a.position - b.position || a.trackName.localeCompare(b.trackName));
  }, [driver, leaderboardData]);

  const totalLaps = useMemo(() => trackRows.reduce((sum, row) => sum + row.laps, 0), [trackRows]);

  const leaderboardInsights = useMemo(() => {
    if (!trackRows.length) return { bestPosition: null as number | null, topThreeTracks: 0 };
    const positions = trackRows.map((r) => r.position);
    return {
      bestPosition: Math.min(...positions),
      topThreeTracks: trackRows.filter((r) => r.position <= 3).length,
    };
  }, [trackRows]);

  const performanceCharts = useMemo(() => {
    if (trackRows.length < 2) return null;
    const byLaps = [...trackRows].sort((a, b) => b.laps - a.laps).slice(0, 8);
    if (!driver) return null;

    const driverByGuid = new Map(rankData.map((item) => [item.guid, item]));
    const qualifiedPaceRows = byLaps
      .map((row) => {
        const rawRows = Array.isArray(
          (leaderboardData as Record<string, any>)?.[row.trackId]?.[CAR]
        )
          ? ([...(leaderboardData as Record<string, any>)[row.trackId][CAR]] as LeaderboardCarRow[])
          : [];

        const qualifiedRows = rawRows
          .filter((entry) => {
            if (typeof entry?.laptime !== 'number') return false;
            if (entry.guid === driver.guid) return true;
            const rankedDriver = driverByGuid.get(entry.guid);
            if (!rankedDriver) return false;
            // Field comparison excludes only the F safety grade (the unranked entry
            // grade — also covers every sub-100km Rookie). E and above are included.
            return getDriverSR(rankedDriver).tier !== 'F';
          })
          .sort((a, b) => (a.laptime || 0) - (b.laptime || 0));

        const qualifiedIndex = qualifiedRows.findIndex((entry) => entry.guid === driver.guid);
        if (qualifiedIndex < 0 || qualifiedRows.length < 8 || row.laps < 2) return null;

        return {
          trackName: row.trackName,
          percentile:
            qualifiedRows.length > 1
              ? Math.round((1 - qualifiedIndex / (qualifiedRows.length - 1)) * 100)
              : 100,
        };
      })
      .filter((row): row is { trackName: string; percentile: number } => Boolean(row));

    if (qualifiedPaceRows.length < 2) {
      return {
        laps: { categories: byLaps.map((r) => r.trackName), data: byLaps.map((r) => r.laps) },
        radar: null,
        avgPercentile: null,
      };
    }
    // "Grid percentile" — 100% = pole/P1, 0% = last. Reads as relative pace.
    const radarData = qualifiedPaceRows.map((r) => r.percentile);
    const avgPercentile = radarData.length
      ? Math.round(radarData.reduce((s, v) => s + v, 0) / radarData.length)
      : 0;
    // Radar floor capped at 40 (outer ring = 100%). This keeps the scale gentle —
    // a 10-point gap (85 vs 95%) shows a visible but not exaggerated difference —
    // while still lifting top drivers off a featureless maxed-out polygon. Weaker
    // drivers drop the floor below 40 so their sub-average tracks aren't clipped.
    const radarMin = Math.min(40, Math.max(0, Math.floor((Math.min(...radarData) - 8) / 5) * 5));
    return {
      laps: { categories: byLaps.map((r) => r.trackName), data: byLaps.map((r) => r.laps) },
      radar: { categories: qualifiedPaceRows.map((r) => r.trackName), data: radarData, min: radarMin },
      avgPercentile,
    };
  }, [driver, leaderboardData, rankData, trackRows]);

  const driverRoles = useMemo<DiscordRole[]>(
    () => (driverGuid ? getDiscordRolesForGuid(driverGuid, teamRoles) : []),
    [driverGuid, teamRoles]
  );

  const syncHealth = useMemo(
    () => getSyncHealth(getEffectiveLastSync(metadata?.lastSync, rankData)),
    [metadata?.lastSync, rankData]
  );

  const teamLiveryMeta = useMemo(
    () => (driver ? getTeamLiveryMeta(driver.guid) : undefined),
    [driver]
  );
  const showTeamLiveryBlock = useMemo(() => {
    if (!teamLiveryMeta || !liveryShowcaseSections) return false;
    return liveryShowcaseSections.teamLiveries !== false;
  }, [teamLiveryMeta, liveryShowcaseSections]);
  const [teamLiveryDialogOpen, setTeamLiveryDialogOpen] = useState(false);

  return (
    <>
      <title>{`Driver Profile - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="AC Elite driver profile and per-track leaderboard performance."
      />
      <meta property="og:title" content="Driver Profile - AC Elite" />
      <meta
        property="og:description"
        content="AC Elite driver profile and per-track leaderboard performance."
      />

      {/* Same vertical rhythm as other data pages (py:4 via DATA_PAGE_SHELL_SX). */}
      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            {loading && (
              <LoadingPanel
                title="Loading profile…"
                message="Resolving driver, license, SR, and per-track leaderboard rows."
              >
                <Stack spacing={2}>
                  <Skeleton
                    variant="rounded"
                    height={340}
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }}
                  />
                  <Skeleton
                    variant="rounded"
                    height={300}
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
                  />
                </Stack>
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && !driver && (
              <Box sx={softFloatWrapperSx()}>
                <Paper
                  sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}
                >
                  <Stack
                    spacing={1.5}
                    sx={{
                      alignItems: { xs: 'center', md: 'flex-start' },
                      textAlign: { xs: 'center', md: 'left' },
                    }}
                  >
                    <Typography variant="h6" fontWeight={800}>
                      Driver not found
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 560 }}>
                      This driver is not in the current AC Elite data. Check the link or use the
                      driver search on the home page.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 0.5 }}>
                      <Button
                        component={RouterLink}
                        href={getHomeHref()}
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{ ...ACTION_PRIMARY_SMALL_SX }}
                      >
                        Home
                      </Button>
                      <Button
                        component={RouterLink}
                        href={APP_ROUTES.rankings}
                        variant="outlined"
                        color="primary"
                        size="small"
                        sx={{ ...ACTION_OUTLINED_SMALL_DENSE_SX }}
                      >
                        Rankings
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              </Box>
            )}

            {!loading && !error && driver && license && sr && (
              <>
                <Box sx={softFloatWrapperSx()}>
                  <Paper
                    sx={{
                      ...GLASS_PANEL_SX,
                      ...brandAccentBorderSx(),
                      ...glassCardMotionSx(0),
                      textAlign: { xs: 'center', md: 'left' },
                    }}
                  >
                    <Stack spacing={1.5} sx={{ width: 1 }}>
                      <Box sx={driverSeasonHeaderBandSx}>
                        <Stack spacing={1} sx={{ alignItems: { xs: 'center', md: 'stretch' } }}>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent={{ xs: 'center', md: 'space-between' }}
                            flexWrap="wrap"
                            useFlexGap
                            columnGap={1.5}
                            rowGap={1}
                            sx={{ width: 1 }}
                          >
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="center"
                              flexWrap="wrap"
                              useFlexGap
                              justifyContent={{ xs: 'center', md: 'flex-start' }}
                            >
                              <Typography
                                variant="overline"
                                sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}
                              >
                                Driver profile
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: syncHealth.color, fontWeight: 700 }}
                              >
                                {syncHealth.label} · {syncHealth.ageText}
                              </Typography>
                            </Stack>
                            {overallRank != null ? (
                              <Chip
                                size="small"
                                label={`Overall #${overallRank}`}
                                sx={{
                                  fontWeight: 800,
                                  flexShrink: 0,
                                  ...getPodiumChipSx(overallRank),
                                }}
                              />
                            ) : null}
                          </Stack>

                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent={{ xs: 'center', md: 'flex-start' }}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ width: 1 }}
                          >
                            <Typography
                              component="h1"
                              variant="h4"
                              sx={{ fontWeight: 800, letterSpacing: 0 }}
                            >
                              {driver.name || 'Unknown Driver'}
                            </Typography>
                            {driverRoles.map((role) => (
                              <Chip
                                key={role}
                                size="small"
                                label={role}
                                sx={{ fontWeight: 700, fontSize: '0.72rem', ...ROLE_CHIP_SX[role] }}
                              />
                            ))}
                          </Stack>

                          <Typography
                            variant="caption"
                            sx={{
                              ...HERO_TERTIARY_CAPTION_SX,
                              display: 'block',
                              textAlign: { xs: 'center', md: 'left' },
                              pt: 0.25,
                            }}
                          >
                            Figures below are from the latest synced AC Elite laps and results for
                            this driver.
                          </Typography>
                        </Stack>
                      </Box>

                      <Box sx={{ pb: 0.5 }}>
                        <TrendWindowStats variant="driver" driver={driver} />
                      </Box>

                      <Box sx={DRIVER_STAT_GRID_SX}>
                        <Paper
                          sx={
                            [
                              DRIVER_STAT_HERO_SX,
                              subtleEnterUpSx(0, INNER_CARD_MOTION),
                              getLicensePanelSx(license.license),
                              DRIVER_STAT_HERO_GLASS_HOVER_SX,
                            ] as any
                          }
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              color: 'rgba(255,255,255,0.75)',
                              fontWeight: 800,
                              letterSpacing: 1,
                            }}
                          >
                            License
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            justifyContent={{ xs: 'center', md: 'flex-start' }}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 1 }}
                          >
                            <Chip
                              size="medium"
                              label={license.license}
                              onClick={() => openGuide('license')}
                              sx={{
                                minWidth: LICENSE_CHIP_WIDTH + 8,
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                py: 0.25,
                                ...getLicenseBadgeSx(license.license),
                              }}
                            />
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.96)',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1.15,
                              }}
                            >
                              {Math.round(license.paceScore).toLocaleString()}
                            </Typography>
                            {delta ? <DeltaChip value={Math.round(delta.deltaPace)} /> : null}
                          </Stack>
                        </Paper>
                        <Paper
                          sx={
                            [
                              DRIVER_STAT_HERO_SX,
                              subtleEnterUpSx(1, INNER_CARD_MOTION),
                              getSRPanelSx(sr.tier),
                              DRIVER_STAT_HERO_GLASS_HOVER_SX,
                            ] as any
                          }
                        >
                          <Typography
                            variant="overline"
                            sx={{
                              color: 'rgba(255,255,255,0.75)',
                              fontWeight: 800,
                              letterSpacing: 1,
                            }}
                          >
                            Safety Rating
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1.25}
                            alignItems="center"
                            justifyContent={{ xs: 'center', md: 'flex-start' }}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 1 }}
                          >
                            <Chip
                              size="medium"
                              label={sr.tier}
                              onClick={() => openGuide('safety')}
                              sx={{
                                minWidth: SR_CHIP_WIDTH + 8,
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                py: 0.25,
                                ...getSRBadgeSx(sr.tier),
                              }}
                            />
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 800,
                                color: 'rgba(255,255,255,0.96)',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1.15,
                              }}
                            >
                              {sr.sr.toFixed(2)}
                            </Typography>
                            {delta ? (
                              <DeltaChip value={delta.deltaSR} decimals={2} kind="sr" />
                            ) : null}
                          </Stack>
                        </Paper>
                        {(() => {
                          const money =
                            typeof driver.points === 'number' && Number.isFinite(driver.points)
                              ? driver.points
                              : null;
                          const accent =
                            money == null
                              ? null
                              : money < 0
                                ? MONEY_NEGATIVE
                                : money > 0
                                  ? MONEY_POSITIVE
                                  : null;
                          return (
                            <Paper
                              sx={{
                                ...DRIVER_STAT_COMPACT_SX,
                                ...glassCardEnterOnlySx(2, INNER_CARD_MOTION),
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                KMR Money
                              </Typography>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: 800,
                                  mt: 0.35,
                                  color: accent ?? undefined,
                                }}
                              >
                                {money != null
                                  ? `$${Math.round(money * 1000).toLocaleString('en-GB')}`
                                  : '—'}
                              </Typography>
                            </Paper>
                          );
                        })()}
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(3, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Total KM
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(Math.round(driver.kilometers || 0))}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(4, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Tracks Driven
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(trackRows.length)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(5, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Total Laps
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(totalLaps)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(6, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Wins
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.wins ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(7, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Podiums
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.podiums ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(8, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Poles
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.poles ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(9, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Fastest laps
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.flaps ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(10, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Best position (leaderboards)
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {leaderboardInsights.bestPosition != null
                              ? `P${leaderboardInsights.bestPosition}`
                              : '—'}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(11, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Top-3 (leaderboards)
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(leaderboardInsights.topThreeTracks)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(12, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Collisions
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.collisions ?? 0)}
                          </Typography>
                        </Paper>
                        <Paper
                          sx={{
                            ...DRIVER_STAT_COMPACT_SX,
                            ...glassCardEnterOnlySx(13, INNER_CARD_MOTION),
                          }}
                        >
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Infractions
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                            {formatNumber(driver.infr ?? 0)}
                          </Typography>
                        </Paper>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>

                {performanceCharts && (
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Reveal index={0} sx={{ height: 1 }}>
                        <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), height: 1 }}>
                          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                            Overall pace
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3 }}>
                            Faster than the field
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: 'text.secondary', mb: 0.5 }}
                          >
                            Qualified tracks only · 100% = pole
                          </Typography>
                          {performanceCharts.avgPercentile != null ? (
                            <Chart
                              type="radialBar"
                              height={300}
                              series={[performanceCharts.avgPercentile]}
                              options={{
                                colors: [BRAND_ACCENT],
                                fill: { type: 'solid' },
                                labels: ['of drivers'],
                                stroke: { lineCap: 'round' },
                                plotOptions: {
                                  radialBar: {
                                    hollow: { size: '62%' },
                                    track: {
                                      background: 'rgba(255,255,255,0.06)',
                                      strokeWidth: '100%',
                                    },
                                    dataLabels: {
                                      name: {
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: 'clamp(11px, 2.9vw, 13px)',
                                        offsetY: 22,
                                      },
                                      value: {
                                        color: '#fff',
                                        fontSize: 'clamp(26px, 8vw, 38px)',
                                        fontWeight: 800,
                                        offsetY: -12,
                                        formatter: (v: number) => `${Math.round(Number(v))}%`,
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          ) : (
                            <EmptyState
                              title="Not enough qualified pace data yet."
                              description="Pace graphs need multiple tracks with enough established drivers to avoid noisy comparisons."
                            />
                          )}
                        </Paper>
                      </Reveal>
                    </Grid>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Reveal index={1} sx={{ height: 1 }}>
                        <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), height: 1 }}>
                          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                            Track pace
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3 }}>
                            Pace by track
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: 'text.secondary', mb: 1 }}
                          >
                            Qualified field you beat on each track · outer ring = fastest ·
                            scaled to highlight differences
                          </Typography>
                          {performanceCharts.radar ? (
                            <Chart
                              type="radar"
                              height={340}
                              series={[{ name: 'Beats', data: performanceCharts.radar.data }]}
                              options={{
                                labels: performanceCharts.radar.categories,
                                colors: [BRAND_ACCENT],
                                stroke: { width: 2.5 },
                                fill: { type: 'solid', opacity: 0.32 },
                                markers: { size: 4, strokeWidth: 0 },
                                yaxis: { show: false, min: performanceCharts.radar.min, max: 100 },
                                tooltip: {
                                  y: { formatter: (v: number) => `Faster than ${v}% of the grid` },
                                },
                                plotOptions: {
                                  radar: {
                                    polygons: {
                                      strokeColors: 'rgba(255,255,255,0.08)',
                                      connectorColors: 'rgba(255,255,255,0.08)',
                                    },
                                  },
                                },
                              }}
                            />
                          ) : (
                            <EmptyState
                              title="Track pace is still building."
                              description="This view ignores tiny grids and mostly-new fields so the shape stays meaningful."
                            />
                          )}
                        </Paper>
                      </Reveal>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Reveal index={2}>
                        <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx() }}>
                          <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                            Activity
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3, mb: 1 }}>
                            Laps by track
                          </Typography>
                          <Chart
                            type="bar"
                            height={Math.max(280, performanceCharts.laps.categories.length * 40)}
                            series={[{ name: 'Laps', data: performanceCharts.laps.data }]}
                            options={{
                              colors: CHART_COLORS,
                              fill: { type: 'solid' },
                              legend: { show: false },
                              plotOptions: {
                                bar: {
                                  horizontal: true,
                                  distributed: true,
                                  borderRadius: 6,
                                  borderRadiusApplication: 'end',
                                  barHeight: '62%',
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
                                categories: performanceCharts.laps.categories,
                                labels: { show: false },
                              },
                              grid: {
                                xaxis: { lines: { show: true } },
                                yaxis: { lines: { show: false } },
                              },
                              tooltip: {
                                y: { formatter: (v: number) => `${formatNumber(v)} laps` },
                              },
                            }}
                          />
                        </Paper>
                      </Reveal>
                    </Grid>
                  </Grid>
                )}

                <Reveal>
                  <Paper
                    sx={{
                      ...GLASS_TABLE_WRAPPER_SX,
                      ...brandAccentBorderSx(),
                      ...glassCardMotionSx(1),
                    }}
                  >
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Track</TableCell>
                            <TableCell>Position</TableCell>
                            <TableCell>Lap Time</TableCell>
                            <TableCell>Gap to P1</TableCell>
                            <TableCell align="right">Laps</TableCell>
                            <TableCell align="right">Grid Size</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {trackRows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ py: 4, px: 2 }}>
                                <EmptyState
                                  title="No leaderboard entries found for this driver yet."
                                  description="When this driver sets a ranked lap on a track, it will show up here after sync."
                                />
                              </TableCell>
                            </TableRow>
                          )}
                          {trackRows.map((row, rowIndex) => (
                            <TableRow
                              key={`${row.trackId}-${row.position}`}
                              hover
                              onClick={() =>
                                navigate({
                                  pathname: APP_ROUTES.leaderboard,
                                  search: getLeaderboardTrackSearch(row.trackId),
                                })
                              }
                              sx={{
                                cursor: 'pointer',
                                ...subtleRowEnterSx(rowIndex, { baseDelayMs: 340 }),
                              }}
                            >
                              <TableCell sx={{ fontWeight: 700 }}>{row.trackName}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`P${row.position}`}
                                  sx={{
                                    minWidth: 44,
                                    fontWeight: 700,
                                    ...getPodiumChipSx(row.position),
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                {formatLaptime(row.lapTime)}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace' }}>{row.gap}</TableCell>
                              <TableCell align="right">{formatNumber(row.laps)}</TableCell>
                              <TableCell align="right">{formatNumber(row.totalDrivers)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Reveal>

                <DriverSessionsTable driverGuid={driver.guid} driverName={driver.name} />

                {teamLiveryMeta && showTeamLiveryBlock ? (
                  <>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_SX,
                        ...brandAccentBorderSx(),
                        ...glassCardMotionSx(2),
                        p: 2,
                        width: 1,
                      }}
                    >
                      <Stack spacing={1.25} alignItems="stretch">
                        <Typography
                          variant="overline"
                          sx={{
                            ...PANEL_OVERLINE_MUTED_SX,
                            textAlign: { xs: 'center', md: 'left' },
                          }}
                        >
                          Team livery
                        </Typography>
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setTeamLiveryDialogOpen(true)}
                          aria-label="View team livery full size"
                          sx={{
                            p: 0,
                            m: 0,
                            width: 1,
                            minWidth: 0,
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: 1.25,
                            overflow: 'hidden',
                            cursor: 'zoom-in',
                            bgcolor: 'rgba(0,0,0,0.2)',
                            display: 'block',
                            lineHeight: 0,
                            '&:focus-visible': {
                              outline: '2px solid',
                              outlineColor: 'primary.main',
                              outlineOffset: 2,
                            },
                          }}
                        >
                          <Box
                            component="img"
                            src={liveriesAssetUrl(driver.guid)}
                            alt={teamLiveryMeta.alt}
                            sx={{
                              width: '100%',
                              height: 'auto',
                              display: 'block',
                            }}
                          />
                        </Box>
                      </Stack>
                    </Paper>
                    <LiveryEnlargeDialog
                      open={teamLiveryDialogOpen}
                      onClose={() => setTeamLiveryDialogOpen(false)}
                      title={driver.name || 'Team livery'}
                      src={liveriesAssetUrl(driver.guid)}
                      alt={teamLiveryMeta.alt}
                    />
                  </>
                ) : null}
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
