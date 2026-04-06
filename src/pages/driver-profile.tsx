import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getLeaderboardTrackSearch } from 'src/lib/routes';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { type TeamRoles, getDiscordRolesForGuid } from 'src/lib/team-roles';
import { liveriesAssetUrl, getTeamLiveryMeta } from 'src/lib/driver-liveries';
import { computeDeltas, type DriverDelta, fetchPrevRankData } from 'src/lib/delta';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { GLASS_PANEL_SX, GLASS_INNER_PANEL_SX, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import { subtleEnterUpSx, subtleRowEnterSx, glassCardMotionSx, glassCardEnterOnlySx } from 'src/lib/subtle-motion';
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
  type LeaderboardCarRow,
} from 'src/lib/ac-elite-data';

import { DeltaChip } from 'src/components/delta-chip/delta-chip';
import { ErrorPanel } from 'src/components/data-state/error-panel';
import { LiveryEnlargeDialog } from 'src/components/livery/livery-enlarge-dialog';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

/** Stagger inner stat cards after the hero panel starts animating */
const INNER_CARD_MOTION = { baseDelayMs: 380 } as const;

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
 * Chip-like “glass” hover: specular inset line + lift — only used on License / SR hero cards.
 * (Other stat tiles use {@link glassCardEnterOnlySx} without hover.)
 */
const DRIVER_STAT_HERO_GLASS_HOVER_SX = {
  cursor: 'default',
  transition:
    'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), filter 220ms cubic-bezier(0.22, 1, 0.36, 1)',
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'translateY(-3px)',
      filter: 'brightness(1.08)',
      boxShadow: [
        'inset 0 1px 0 rgba(255,255,255,0.38)',
        'inset 0 -1px 0 rgba(0,0,0,0.14)',
        '0 18px 46px rgba(0,0,0,0.48)',
        '0 0 36px rgba(255,255,255,0.14)',
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
  const navigate = useNavigate();
  const { openGuide } = useLicenseSafetyGuide();
  const { driverGuid = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [teamRoles, setTeamRoles] = useState<TeamRoles>({ creator: [], admin: [], moderator: [] });
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const [delta, setDelta] = useState<DriverDelta | null>(null);
  const [liveryShowcaseSections, setLiveryShowcaseSections] = useState<LiveryShowcaseSectionsFile | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, roles, prevRank, meta, liverySectionsRaw] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
          fetchJson<TeamRoles>('/data/team-roles.json'),
          fetchPrevRankData(),
          fetchJson<SiteMetadata>('/data/metadata.json').catch(() => ({})),
          fetchJson<LiveryShowcaseSectionsFile>('/data/livery-showcase-sections.json').catch(() => ({})),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
        setTeamRoles(roles);
        setMetadata(meta);
        setLiveryShowcaseSections(liverySectionsRaw && typeof liverySectionsRaw === 'object' ? liverySectionsRaw : {});
        const allDeltas = computeDeltas(rank, prevRank);
        setDelta(allDeltas.get(driverGuid) || null);
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

  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);
  const license = useMemo(() => (driver ? getDriverLicense(driver, licenseMap) : null), [driver, licenseMap]);
  const sr = useMemo(() => (driver ? getDriverSR(driver) : null), [driver]);

  useEffect(() => {
    const baseTitle = `Driver Profile - ${CONFIG.appName}`;
    const baseDesc = 'AC Elite driver profile and per-track leaderboard performance.';
    const resetHead = () => {
      document.title = baseTitle;
      document.querySelector('meta[property="og:title"]')?.setAttribute('content', 'Driver Profile - AC Elite');
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
    document.querySelector('meta[property="og:title"]')?.setAttribute(
      'content',
      `${driver.name} · ${lic} · SR ${srPart}`
    );
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

  const totalLaps = useMemo(
    () => trackRows.reduce((sum, row) => sum + row.laps, 0),
    [trackRows]
  );

  const leaderboardInsights = useMemo(() => {
    if (!trackRows.length) return { bestPosition: null as number | null, topThreeTracks: 0 };
    const positions = trackRows.map((r) => r.position);
    return {
      bestPosition: Math.min(...positions),
      topThreeTracks: trackRows.filter((r) => r.position <= 3).length,
    };
  }, [trackRows]);

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
      <meta name="description" content="AC Elite driver profile and per-track leaderboard performance." />
      <meta property="og:title" content="Driver Profile - AC Elite" />
      <meta property="og:description" content="AC Elite driver profile and per-track leaderboard performance." />

      <Box
        sx={{
          position: 'relative',
          pt: { xs: 5, md: 6 },
          pb: 4,
          background:
            'radial-gradient(circle at 20% 0%, rgba(23,33,59,0.24) 0, transparent 50%),' +
            'linear-gradient(180deg, #17213B 0%, #1f2c49 100%)',
          overflow: 'hidden',
        }}
      >
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            {loading && (
              <Stack spacing={2}>
                <Skeleton variant="rounded" height={340} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                <Skeleton variant="rounded" height={300} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
              </Stack>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && !driver && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800}>
                  Driver not found
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  This driver is not in the current AC Elite data. Check the link or use the driver search on the home
                  page.
                </Typography>
              </Paper>
            )}

            {!loading && !error && driver && license && sr && (
              <>
                <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0), textAlign: { xs: 'center', md: 'left' } }}>
                  <Stack spacing={1.5} sx={{ width: 1 }}>
                    <Stack spacing={0.5} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                          Driver profile
                        </Typography>
                        <Typography variant="caption" sx={{ color: syncHealth.color, fontWeight: 700 }}>
                          {syncHealth.label}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        justifyContent={{ xs: 'center', md: 'flex-start' }}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
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
                    </Stack>

                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', display: 'block', textAlign: { xs: 'center', md: 'left' } }}>
                      Session totals, rank points, and safety — when your driver record includes them.
                    </Typography>

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
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 800, letterSpacing: 1 }}>
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
                        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 800, letterSpacing: 1 }}>
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
                          {delta ? <DeltaChip value={delta.deltaSR} decimals={2} kind="sr" /> : null}
                        </Stack>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(2, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Total KM
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(Math.round(driver.kilometers || 0))}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(3, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Tracks Driven
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(trackRows.length)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(4, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Total Laps
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(totalLaps)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(5, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Rank points
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {driver.points != null && Number.isFinite(driver.points)
                            ? driver.points.toLocaleString('en-GB', { maximumFractionDigits: 1 })
                            : '—'}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(6, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Wins
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(driver.wins ?? 0)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(7, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Podiums
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(driver.podiums ?? 0)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(8, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Poles
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(driver.poles ?? 0)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(9, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Fastest laps
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(driver.flaps ?? 0)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(10, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Best position (leaderboards)
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {leaderboardInsights.bestPosition != null
                            ? `P${leaderboardInsights.bestPosition}`
                            : '—'}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(11, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Top-3 (leaderboards)
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(leaderboardInsights.topThreeTracks)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(12, INNER_CARD_MOTION) }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Collisions
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.35 }}>
                          {formatNumber(driver.collisions ?? 0)}
                        </Typography>
                      </Paper>
                      <Paper sx={{ ...DRIVER_STAT_COMPACT_SX, ...glassCardEnterOnlySx(13, INNER_CARD_MOTION) }}>
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
                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                              No leaderboard entries found for this driver yet.
                            </TableCell>
                          </TableRow>
                        )}
                        {trackRows.map((row, rowIndex) => (
                          <TableRow
                            key={`${row.trackId}-${row.position}`}
                            hover
                            onClick={() =>
                              navigate({
                                pathname: '/leaderboard',
                                search: getLeaderboardTrackSearch(row.trackId),
                              })
                            }
                            sx={{ cursor: 'pointer', ...subtleRowEnterSx(rowIndex, { baseDelayMs: 340 }) }}
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

                {teamLiveryMeta && showTeamLiveryBlock ? (
                  <>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_SX,
                        ...glassCardMotionSx(2),
                        p: 2,
                        width: 1,
                      }}
                    >
                      <Stack spacing={1.25} alignItems="stretch">
                        <Typography
                          variant="overline"
                          sx={{
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.4,
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
