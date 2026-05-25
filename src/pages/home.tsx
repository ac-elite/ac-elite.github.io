import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import ListItemButton from '@mui/material/ListItemButton';
import TableContainer from '@mui/material/TableContainer';
import { useTheme, keyframes } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { SITE_TEAM_ROLES } from 'src/site-manual-config';
import { ACE_SKIN_PACK_DOWNLOAD_URL } from 'src/lib/ace-skin-pack-download';
import { type DriverDelta, fetchPrevRankData } from 'src/lib/delta';
import { subscribeKmrSync } from 'src/lib/kmr-sync';
import { useWindowedDriverDeltas } from 'src/lib/trend-window/trend-window-context';
import { getTeamRole, type TeamRole, teamRoleToDiscordRole } from 'src/lib/team-roles';
import { brandAccentBorderSx, statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
import { getSyncHealth, type SyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import {
  subtleEnterUpSx,
  subtleRowEnterSx,
  glassCardMotionSx,
  softFloatWrapperSx,
} from 'src/lib/subtle-motion';
import {
  DATA_PAGE_SHELL_SX,
  PAGE_BACKGROUND_GRADIENT,
  PAGINATION_NAV_BUTTON_SX,
  PAGINATION_PAGE_BUTTON_SX,
  MARKETING_CTA_LARGE_LAYOUT_SX,
  MARKETING_CTA_PRIMARY_GLASS_SX,
  MARKETING_CTA_SECONDARY_GLASS_SX,
} from 'src/lib/page-shell';
import {
  GLASS_PANEL_SX,
  getPodiumRowSx,
  GLASS_CARD_INNER_SX,
  GLASS_INNER_PANEL_SX,
  GLASS_TABLE_WRAPPER_SX,
  GLASS_TABLE_PAGINATION_SX,
} from 'src/lib/glass';
import {
  pickNewerCurrentTrack,
  toCurrentTrackPayload,
  applyServerOfflineDebug,
  type CurrentTrackPayload,
  subscribeLiveServerStatus,
  LIVE_SERVER_STATUS_POLL_MS,
  shouldPollLiveServerStatus,
  isServerStatusDebugEnabled,
  canAttemptLiveServerStatusFetch,
  fetchLiveServerStatusFromSupabase,
} from 'src/lib/server-status';
import {
  CAR,
  getSRTier,
  getDriverSR,
  calculateGap,
  formatNumber,
  getSRBadgeSx,
  ROLE_CHIP_SX,
  safetyRating,
  formatLaptime,
  SR_CHIP_WIDTH,
  type RankDriver,
  getPodiumChipSx,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
  getTrackDisplayName,
  type LeaderboardCarRow,
  leaderboardTrackIdLookupCandidates,
} from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';

import { Reveal } from 'src/components/reveal';
import { EmptyState } from 'src/components/data-state';
import { DeltaChip } from 'src/components/delta-chip/delta-chip';
import { InfoNotesPanel } from 'src/components/info-notes/info-notes-panel';
import { ServerJoinCard } from 'src/components/server-join-card';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

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

type CurrentTrackData = CurrentTrackPayload;

const HOME_CURRENT_TRACK_PER_PAGE = 20;

/**
 * Static Apple-style gradient keyword (white → soft ice-blue, clipped to text).
 * Replaces the former infinite colour/shimmer pulses — premium through restraint.
 */
const heroKeywordFloat = keyframes`
  0%, 100% {
    transform: translate3d(0, 0, 0) rotate(-1deg);
  }
  50% {
    transform: translate3d(0, -5px, 0) rotate(-1deg);
  }
`;

const heroKeywordSx = {
  display: 'inline-block',
  position: 'relative',
  zIndex: 1,
  mx: { xs: 0.35, md: 0.55 },
  lineHeight: 0.9,
  letterSpacing: 0,
  // On-brand electric-blue accent gradient (matches the CTA / accent blue).
  backgroundImage:
    'linear-gradient(180deg, #F5FBFF 0%, #A9D8FF 26%, #4F8DF6 62%, #173EA8 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  fontWeight: 800,
  // Soft depth shadow; avoid neon-style glow.
  textShadow: '0 2px 10px rgba(15,23,42,0.56)',
  animation: `${heroKeywordFloat} 5.8s ease-in-out infinite`,
  transformOrigin: '50% 65%',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
} as const;

const heroStatsKeywordSx = {
  ...heroKeywordSx,
  fontSize: { xs: '1.18em', sm: '1.24em', md: '1.3em' },
  top: { xs: 2, md: 4 },
} as const;

const heroLeaderboardKeywordSx = {
  ...heroKeywordSx,
  display: { xs: 'inline-block', md: 'block' },
  width: 'fit-content',
  ml: { xs: 0.35, md: 5.5 },
  mt: { xs: 0, md: -0.4 },
  fontSize: { xs: '1.12em', sm: '1.2em', md: '1.26em' },
  animationDelay: '-1.8s',
} as const;

/** Soft "live" pulse for the green dot in the hero kicker. */
const heroLiveDotPulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
`;

const reducedMotionNone = {
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
} as const;

const sectionKickerSx = {
  color: 'rgba(255,255,255,0.75)',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
};

function RaceIntelligenceCard({
  syncStatus,
  totalDrivers,
  totalLaps,
  activeTracks,
  currentTrack,
  motionSxIndex = 1,
}: {
  syncStatus: SyncHealth;
  totalDrivers: number;
  totalLaps: number;
  activeTracks: number;
  currentTrack: CurrentTrackData | null;
  motionSxIndex?: number;
}) {
  return (
    <Box sx={softFloatWrapperSx({ alternatePhase: true })}>
      <Box
        sx={{
          ...GLASS_PANEL_SX,
          ...statusAccentBorderSx(syncStatus.color),
          ...statusAccentSplitRimSx(syncStatus.color),
          textAlign: { xs: 'center', md: 'left' },
          ...glassCardMotionSx(motionSxIndex),
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" sx={sectionKickerSx}>
              Race Intelligence
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.4 }}>
              One view. All key data.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Live KMR-powered insights for driver search, safety rating, and license progression.
            </Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{ color: syncStatus.color, fontWeight: 700, textAlign: { xs: 'center', md: 'left' } }}
          >
            {syncStatus.label} · {syncStatus.ageText}
          </Typography>

          <Grid container spacing={1}>
            {[
              { label: 'Total drivers', value: formatNumber(totalDrivers) },
              { label: 'Logged laps', value: formatNumber(totalLaps) },
              { label: 'Active tracks', value: formatNumber(activeTracks) },
              {
                label: 'Live server track',
                value: currentTrack?.track ? getTrackDisplayName(currentTrack.track) : '—',
              },
            ].map((item, tileIndex) => (
              <Grid key={item.label} size={{ xs: 6 }}>
                <Box
                  sx={{
                    ...GLASS_INNER_PANEL_SX,
                    ...glassCardMotionSx(3 + tileIndex),
                    minHeight: 78,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: { xs: 'center', md: 'flex-start' },
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600, letterSpacing: 0.2 }}>
                    {item.label}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.2 }}
                    noWrap
                    title={typeof item.value === 'string' ? item.value : undefined}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Box>
    </Box>
  );
}

function HeroSection({ currentTrack }: { currentTrack: CurrentTrackData | null }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 8, md: 12 },
        pb: { xs: 6, md: 6 },
        background: PAGE_BACKGROUND_GRADIENT,
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <PageGridOverlay opacity={0.34} />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack
              spacing={3}
              alignItems={{ xs: 'center', md: 'flex-start' }}
              sx={{
                ...subtleEnterUpSx(0),
              }}
            >
              <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* Live dot — subtle "we're alive and updating" cue. */}
                  <Box
                    aria-hidden
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#22c55e',
                      animation: `${heroLiveDotPulse} 2.4s ease-in-out infinite`,
                      ...reducedMotionNone,
                    }}
                  />
                  <Typography variant="overline" sx={sectionKickerSx}>
                    AC Elite Simracing · Live
                  </Typography>
                </Stack>

                <Typography
                  component="h1"
                  variant={isMdUp ? 'h2' : 'h3'}
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 0,
                    lineHeight: { xs: 1.02, md: 0.96 },
                    maxWidth: 840,
                    textShadow: '0 2px 12px rgba(15,23,42,0.72)',
                    '&::selection': {
                      backgroundColor: 'rgba(147,197,253,0.32)',
                    },
                  }}
                >
                  Track your{' '}
                  <Box component="span" sx={heroStatsKeywordSx}>
                    stats
                  </Box>
                  .
                  <br />
                  Dominate the{' '}
                  <Box component="span" sx={heroLeaderboardKeywordSx}>
                    leaderboard.
                  </Box>
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    maxWidth: 610,
                    color: 'rgba(226,232,240,0.9)',
                    fontSize: { xs: '1rem', md: '1.075rem' },
                    lineHeight: 1.6,
                    textShadow: '0 1px 8px rgba(15,23,42,0.62)',
                  }}
                >
                  Real-time leaderboards, license rankings, and Safety Rating — every lap from
                  the AC Elite server, updated as drivers cross the line.
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                flexWrap="wrap"
                alignItems={{ xs: 'center', md: 'flex-start' }}
                justifyContent={{ xs: 'center', md: 'flex-start' }}
                sx={{ width: '100%' }}
              >
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    ...MARKETING_CTA_LARGE_LAYOUT_SX,
                    ...MARKETING_CTA_PRIMARY_GLASS_SX,
                  }}
                  href="https://discord.gg/d2EbxGYBbj"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join the community
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    ...MARKETING_CTA_LARGE_LAYOUT_SX,
                    ...MARKETING_CTA_SECONDARY_GLASS_SX,
                  }}
                  href={ACE_SKIN_PACK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download ACE skin pack
                </Button>
              </Stack>

            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={2} sx={{ height: 1, alignItems: { xs: 'center', md: 'stretch' } }}>
              <ServerJoinCard currentTrack={currentTrack} sx={{ ...glassCardMotionSx(1) }} />
            </Stack>
          </Grid>
        </Grid>

        <InfoNotesPanel
          sx={{ mt: { xs: 4, md: 4 }, mb: 0 }}
          notes={[
            {
              icon: 'solar:danger-triangle-bold',
              accent: '#f5c43b',
              lead: 'License & Safety Rating — work in progress',
              body: 'These calculations are still being tuned, so values and thresholds may change as we refine them.',
            },
            {
              icon: 'solar:info-circle-bold',
              accent: '#7dd3fc',
              lead: 'New — trend filter on every stats page',
              body: 'Use the 1h / 24h / 7d / 30d switch to see how Safety Rating, license pace, distance and more have changed over the window you pick.',
            },
          ]}
        />
      </Container>
    </Box>
  );
}

function CurrentTrackLeaderboardSection({
  loading,
  error,
  currentTrack,
  rows,
  pagedRows,
  fastestLap,
  start,
  safePage,
  totalPages,
  driversByGuid,
  licenseMap,
  deltas,
  syncStatus,
  onPageChange,
  onOpenGuide,
}: {
  loading: boolean;
  error: string | null;
  currentTrack: CurrentTrackData | null;
  rows: LeaderboardCarRow[];
  pagedRows: LeaderboardCarRow[];
  fastestLap: number;
  start: number;
  safePage: number;
  totalPages: number;
  driversByGuid: Map<string, RankDriver>;
  licenseMap: Map<string, { license: string; paceScore: number }>;
  deltas: Map<string, DriverDelta>;
  syncStatus: SyncHealth;
  onPageChange: (page: number) => void;
  onOpenGuide: (tab: 'license' | 'safety') => void;
}) {
  if (!currentTrack?.track) return null;

  return (
    <Box component="section" sx={{ ...DATA_PAGE_SHELL_SX }}>
      <PageGridOverlay />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          <Reveal>
          <Stack
            spacing={0.7}
            sx={{
              textAlign: { xs: 'center', md: 'left' },
              alignItems: { xs: 'center', md: 'flex-start' },
            }}
          >
            <Typography variant="overline" sx={sectionKickerSx}>
              Live track leaderboard
            </Typography>
            <Typography component="h2" variant="h4" fontWeight={800}>
              Current track: {getTrackDisplayName(currentTrack.track)}
            </Typography>
            <Typography color="text.secondary">
              Full leaderboard for {CAR} on the currently active server track.
            </Typography>
          </Stack>
          </Reveal>

          <Reveal index={1}>
          <Paper
            sx={{
              ...GLASS_TABLE_WRAPPER_SX,
              ...brandAccentBorderSx(),
              ...glassCardMotionSx(0, { baseDelayMs: 400 }),
            }}
          >
            <TableContainer>
              <Table
                size="small"
                sx={{
                  '& .MuiTableBody-root .MuiTableRow-root:hover': {
                    backgroundColor: 'rgba(255,255,255,0.028)',
                  },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>License</TableCell>
                    <TableCell>Safety Rating</TableCell>
                    <TableCell>Lap Time</TableCell>
                    <TableCell align="right">Gap</TableCell>
                    <TableCell align="right">Laps</TableCell>
                    <TableCell align="right">Total KM</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4, px: 2 }}>
                        <EmptyState
                          title="Loading leaderboard…"
                          description="Pulling current-track lap times. This usually takes a second."
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && error && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4, px: 2 }}>
                        <EmptyState
                          title="Couldn’t load leaderboard data"
                          description={error}
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 4, px: 2 }}>
                        <EmptyState
                          title="No times yet"
                          description="No laps have been recorded on this track. Times will appear automatically after the next sync."
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {!loading && !error && pagedRows.map((entry, index) => {
                    const absolutePos = start + index;
                    const driver =
                      driversByGuid.get(entry.guid) ||
                      ({ guid: entry.guid, name: entry.name, kilometers: 0, collisions: 0 } as RankDriver);
                    const license = getDriverLicense(driver, licenseMap);
                    const sr = getDriverSR(driver);
                    const delta = deltas.get(entry.guid);

                    return (
                      <TableRow
                        key={`${entry.guid}-${entry.laptime}-${index}`}
                        sx={{
                          cursor: 'pointer',
                          ...subtleRowEnterSx(index, { baseDelayMs: 340 }),
                          ...(absolutePos < 3 ? getPodiumRowSx((absolutePos + 1) as 1 | 2 | 3) : {}),
                        }}
                        onClick={() => {
                          window.location.href = getDriverProfileHref(entry.guid);
                        }}
                      >
                        <TableCell>
                          <Chip
                            size="small"
                            label={absolutePos + 1}
                            sx={{
                              minWidth: 38,
                              fontWeight: 700,
                              ...getPodiumChipSx(absolutePos, true),
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Link
                            href={getDriverProfileHref(entry.guid)}
                            onClick={(e) => e.stopPropagation()}
                            underline="hover"
                            color="inherit"
                            sx={{ fontWeight: 700 }}
                          >
                            {entry.name || driver.name || 'Unknown'}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              label={license.license}
                              onClick={(e) => { e.stopPropagation(); onOpenGuide('license'); }}
                              sx={{
                                minWidth: LICENSE_CHIP_WIDTH,
                                fontWeight: 700,
                                justifyContent: 'center',
                                cursor: 'pointer',
                                ...getLicenseBadgeSx(license.license),
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                              {Math.round(license.paceScore).toLocaleString()}
                            </Typography>
                            {delta ? <DeltaChip value={Math.round(delta.deltaPace)} /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Chip
                              size="small"
                              label={sr.tier}
                              onClick={(e) => { e.stopPropagation(); onOpenGuide('safety'); }}
                              sx={{
                                minWidth: SR_CHIP_WIDTH,
                                fontWeight: 700,
                                justifyContent: 'center',
                                cursor: 'pointer',
                                ...getSRBadgeSx(sr.tier),
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                              {sr.sr.toFixed(2)}
                            </Typography>
                            {delta ? <DeltaChip value={delta.deltaSR} decimals={2} kind="sr" /> : null}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {formatLaptime(entry.laptime)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                          {typeof entry.laptime === 'number' ? calculateGap(fastestLap, entry.laptime) : '—'}
                        </TableCell>
                        <TableCell align="right">{(entry.laps || 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(driver.kilometers || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          </Reveal>

          {!loading && !error && totalPages > 1 && (
            <Paper sx={{ ...GLASS_TABLE_PAGINATION_SX, ...glassCardMotionSx(0, { baseDelayMs: 460 }) }}>
              <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                <Button
                  disabled={safePage <= 1}
                  onClick={() => onPageChange(safePage - 1)}
                  variant="contained"
                  color="secondary"
                  size="small"
                  sx={{ ...PAGINATION_NAV_BUTTON_SX }}
                >
                  Prev
                </Button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                  .filter((p) => p === 1 || p === totalPages || (p >= safePage - 1 && p <= safePage + 1))
                  .map((p, idx, arr) => (
                    <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {idx > 0 && p - arr[idx - 1] > 1 && (
                        <Typography sx={{ px: 0.5, color: 'rgba(255,255,255,0.65)' }}>...</Typography>
                      )}
                      <Button
                        onClick={() => onPageChange(p)}
                        size="small"
                        variant={p === safePage ? 'contained' : 'outlined'}
                        color={p === safePage ? 'primary' : 'secondary'}
                        sx={{ ...PAGINATION_PAGE_BUTTON_SX }}
                      >
                        {p}
                      </Button>
                    </Box>
                  ))}
                <Button
                  disabled={safePage >= totalPages}
                  onClick={() => onPageChange(safePage + 1)}
                  variant="contained"
                  color="secondary"
                  size="small"
                  sx={{ ...PAGINATION_NAV_BUTTON_SX }}
                >
                  Next
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

function DriverSearchSection({
  drivers,
  rankData,
  loading,
  error,
  currentTrack,
  syncStatus,
  totalDrivers,
  totalLaps,
  activeTracks,
}: {
  drivers: DriverView[];
  /** Raw rank rows (with wins/points/km) — DriverView drops those fields. */
  rankData: RankDriver[];
  loading: boolean;
  error: string | null;
  currentTrack: CurrentTrackData | null;
  syncStatus: SyncHealth;
  totalDrivers: number;
  totalLaps: number;
  activeTracks: number;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const trimmed = query.trim();
    const qName = trimmed.toLowerCase();
    if (!qName) return [];
    /** Steam64-style IDs are digits only; avoid treating mixed text as a GUID substring. */
    const guidQuery = /^\d+$/.test(trimmed);
    return drivers
      .filter((driver) => {
        const nameHit = driver.name.toLowerCase().includes(qName);
        const guidHit = guidQuery && driver.guid.includes(trimmed);
        return nameHit || guidHit;
      })
      .slice(0, 8);
  }, [drivers, query]);

  return (
    <Box
      id="driver-search"
      component="section"
      sx={{
        position: 'relative',
        py: 4,
        background: 'transparent',
        // Slightly stronger so the seam reads as crisp on both sides — the
        // grid-pattern transition below already adds visual contrast on its own;
        // the top boundary needs the border to do all the work.
        borderTop: '1px solid rgba(226,242,255,0.08)',
        borderBottom: '1px solid rgba(226,242,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={{ xs: 2, md: 4.5 }} alignItems="stretch">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1} sx={{ mb: 2, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="overline" sx={sectionKickerSx}>
                Driver statistics
              </Typography>
              <Typography component="h2" variant="h4" sx={{ fontWeight: 800 }}>
                Driver search
              </Typography>
              <Typography variant="body1" sx={{ maxWidth: 680, color: 'text.secondary' }}>
                Search drivers and open their profile with live Safety Rating and License data.
              </Typography>
              {rankData.length > 0 && (
                <Box sx={{ pt: 0.5 }}>
                  <TrendWindowStats variant="community" rankData={rankData} />
                </Box>
              )}
            </Stack>
            <Paper
              elevation={0}
              sx={{
                ...GLASS_PANEL_SX,
                ...brandAccentBorderSx(),
                ...glassCardMotionSx(0, { baseDelayMs: 280 }),
                mb: { xs: 2, md: 0 },
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack spacing={1.5} sx={{ alignItems: 'stretch', width: '100%' }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', textAlign: { xs: 'center', md: 'left' } }}>
                  Search driver
                </Typography>

                <TextField
                  fullWidth
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  placeholder="Search by driver name or numeric ID…"
                  variant="outlined"
                  size="medium"
                  autoComplete="off"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      color: '#fff',
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
                      ...GLASS_CARD_INNER_SX,
                      width: '100%',
                      mt: 1,
                      maxHeight: 280,
                      overflowY: 'auto',
                    }}
                  >
                    <List dense disablePadding sx={{ width: '100%' }}>
                      {matches.map((driver) => (
                        <ListItemButton
                          key={driver.guid}
                          onClick={() => {
                            window.location.href = getDriverProfileHref(driver.guid);
                          }}
                          sx={{
                            width: '100%',
                            px: 1.75,
                            py: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                          }}
                        >
                          <ListItemText
                            sx={{ width: '100%', m: 0 }}
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ width: '100%' }}>
                                <Link
                                  href={getDriverProfileHref(driver.guid)}
                                  onClick={(e) => e.stopPropagation()}
                                  underline="hover"
                                  color="inherit"
                                  variant="body2"
                                  sx={{ fontWeight: 400 }}
                                >
                                  {driver.name}
                                </Link>
                                {driver.teamRole && teamRoleToDiscordRole(driver.teamRole) && (
                                  <Chip
                                    size="small"
                                    label={teamRoleToDiscordRole(driver.teamRole)}
                                    sx={{
                                      fontWeight: 700,
                                      fontSize: '0.72rem',
                                      ...ROLE_CHIP_SX[teamRoleToDiscordRole(driver.teamRole)!],
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
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                )}
              </Stack>
            </Paper>

            {loading && <Typography color="text.secondary" sx={{ mt: 1 }}>Loading drivers...</Typography>}
            {error && <Typography color="error" sx={{ mt: 1 }}>Failed to load driver data: {error}</Typography>}
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.25} sx={{ height: 1, alignItems: { xs: 'center', md: 'stretch' } }}>
              <RaceIntelligenceCard
                syncStatus={syncStatus}
                totalDrivers={totalDrivers}
                totalLaps={totalLaps}
                activeTracks={activeTracks}
                currentTrack={currentTrack}
                motionSxIndex={1}
              />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default function Page() {
  // Subscribe so track names / images refresh when admin edits the catalog.
  useTrackCatalogVersion();
  const { openGuide } = useLicenseSafetyGuide();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [prevRankData, setPrevRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  // Per-row SR/pace deltas follow the shared trend-window filter.
  const deltas = useWindowedDriverDeltas(rankData, prevRankData);
  const teamRoles = SITE_TEAM_ROLES;
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const [currentTrack, setCurrentTrack] = useState<CurrentTrackData | null>(null);
  const [currentTrackPage, setCurrentTrackPage] = useState(1);
  const staticCurrentTrackRef = useRef<CurrentTrackData | null>(null);

  useEffect(() => {
    if (!isServerStatusDebugEnabled()) return;
    console.info('[server-status] home currentTrack for card', {
      fetchedAt: currentTrack?.fetchedAt,
      track: currentTrack?.track,
      online: currentTrack?.online,
      clients: currentTrack?.info?.clients,
      maxclients: currentTrack?.info?.maxclients,
      cars: currentTrack?.info?.cars,
      session: currentTrack?.info?.session,
      sessiontypes: currentTrack?.info?.sessiontypes,
      durations: currentTrack?.info?.durations,
      timeleft: currentTrack?.info?.timeleft,
    });
  }, [currentTrack]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, meta, prevRank, trackJson] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchJson<Record<string, any>>(DATA_FILES.leaderboard),
          fetchJson<SiteMetadata>(DATA_FILES.metadata),
          fetchPrevRankData(),
          fetchJson<CurrentTrackData>(DATA_FILES.currentTrack).catch(() => null),
        ]);

        if (!mounted) return;
        staticCurrentTrackRef.current = trackJson;
        setRankData(rank);
        setPrevRankData(prevRank);
        setLeaderboardData(leaderboard);
        setMetadata(meta);

        const staticPayload = toCurrentTrackPayload(trackJson);
        if (!canAttemptLiveServerStatusFetch()) {
          setCurrentTrack(applyServerOfflineDebug(staticPayload));
        } else {
          void fetchLiveServerStatusFromSupabase().then((live) => {
            if (!mounted) return;
            setCurrentTrack(pickNewerCurrentTrack(staticPayload, live));
          });
        }
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

  useEffect(() => {
    if (!shouldPollLiveServerStatus()) return undefined;
    let mounted = true;
    const tick = () => {
      void fetchJson<CurrentTrackData>(DATA_FILES.currentTrack)
        .catch(() => null)
        .then((trackJson) => {
          if (!mounted) return;
          staticCurrentTrackRef.current = trackJson;
          void fetchLiveServerStatusFromSupabase().then((live) => {
            if (!mounted) return;
            setCurrentTrack(pickNewerCurrentTrack(toCurrentTrackPayload(staticCurrentTrackRef.current), live));
          });
        });
    };
    // Realtime push updates the card within ~1s of the Edge Function writing a
    // new row; the interval below stays as a backup if the socket drops.
    const unsubscribe = subscribeLiveServerStatus(tick);
    const id = window.setInterval(tick, LIVE_SERVER_STATUS_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
      unsubscribe();
    };
  }, [currentTrack?.fetchedAt]);

  // Realtime: when the sync-kmr-data Edge Function publishes fresh data, quietly
  // refetch rank/leaderboard without flipping the page back into its loading state.
  useEffect(() => {
    let mounted = true;
    const unsubscribe = subscribeKmrSync(() => {
      void Promise.all([
        fetchJson<RankDriver[]>(DATA_FILES.rank),
        fetchJson<Record<string, any>>(DATA_FILES.leaderboard),
        fetchJson<SiteMetadata>(DATA_FILES.metadata),
        fetchPrevRankData(),
      ])
        .then(([rank, leaderboard, meta, prevRank]) => {
          if (!mounted) return;
          setRankData(rank);
          setPrevRankData(prevRank);
          setLeaderboardData(leaderboard);
          setMetadata(meta);
        })
        .catch(() => {
          // Transient fetch failure — the next sync event will retry.
        });
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setCurrentTrackPage(1);
  }, [currentTrack?.track]);

  const driversByGuid = useMemo(() => {
    const map = new Map<string, RankDriver>();
    rankData.forEach((driver) => map.set(driver.guid, driver));
    return map;
  }, [rankData]);

  const leaderboardLicenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);

  const currentTrackRows = useMemo<LeaderboardCarRow[]>(() => {
    const currentTrackId = currentTrack?.track;
    if (!currentTrackId?.trim()) return [];
    const matchedTrackId = leaderboardTrackIdLookupCandidates(currentTrackId).find((id) => leaderboardData?.[id]);
    const data = matchedTrackId ? leaderboardData[matchedTrackId]?.[CAR] : undefined;
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => (a.laptime || 0) - (b.laptime || 0));
  }, [currentTrack?.track, leaderboardData]);

  const currentTrackFastestLap = currentTrackRows[0]?.laptime || 0;
  const currentTrackTotalPages = Math.max(1, Math.ceil(currentTrackRows.length / HOME_CURRENT_TRACK_PER_PAGE));
  const currentTrackSafePage = Math.min(Math.max(1, currentTrackPage), currentTrackTotalPages);
  const currentTrackStart = (currentTrackSafePage - 1) * HOME_CURRENT_TRACK_PER_PAGE;
  const currentTrackPagedRows = currentTrackRows.slice(currentTrackStart, currentTrackStart + HOME_CURRENT_TRACK_PER_PAGE);

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
          favoriteTrack = getTrackDisplayName(trackId);
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
  const syncStatus = getSyncHealth(getEffectiveLastSync(metadata.lastSync, rankData));

  return (
    <>
      <title>{`${CONFIG.appName} | Simracing Community`}</title>
      <meta
        name="description"
        content="AC Elite Assetto Corsa community: KMR-powered stats, leaderboards, safety rating and licence progression. Search drivers and compare lap times."
      />
      <meta property="og:title" content="AC Elite | Simracing Community" />
      <meta
        property="og:description"
        content="AC Elite Assetto Corsa community: KMR-powered stats, leaderboards, safety rating and licence progression. Search drivers and compare lap times."
      />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.home)} />

      <HeroSection currentTrack={currentTrack} />
      <DriverSearchSection
        drivers={drivers}
        rankData={rankData}
        loading={loading}
        error={error}
        currentTrack={currentTrack}
        syncStatus={syncStatus}
        totalDrivers={community.totalDrivers}
        totalLaps={community.totalLaps}
        activeTracks={community.activeTracks}
      />
      <CurrentTrackLeaderboardSection
        loading={loading}
        error={error}
        currentTrack={currentTrack}
        rows={currentTrackRows}
        pagedRows={currentTrackPagedRows}
        fastestLap={currentTrackFastestLap}
        start={currentTrackStart}
        safePage={currentTrackSafePage}
        totalPages={currentTrackTotalPages}
        driversByGuid={driversByGuid}
        licenseMap={leaderboardLicenseMap}
        deltas={deltas}
        syncStatus={syncStatus}
        onPageChange={setCurrentTrackPage}
        onOpenGuide={openGuide}
      />
    </>
  );
}

