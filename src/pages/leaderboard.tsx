import { useSearchParams } from 'react-router';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { computeDeltas, type DriverDelta, fetchPrevRankData } from 'src/lib/delta';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { subtleRowEnterSx, glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx, statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
import {
  DATA_PAGE_SHELL_SX,
  PAGINATION_NAV_BUTTON_SX,
  PAGINATION_PAGE_BUTTON_SX,
} from 'src/lib/page-shell';
import {
  GLASS_PANEL_SX,
  getPodiumRowSx,
  GLASS_TABLE_WRAPPER_SX,
  GLASS_TABLE_PAGINATION_SX,
} from 'src/lib/glass';
import {
  pickNewerCurrentTrack,
  toCurrentTrackPayload,
  type CurrentTrackPayload,
  canAttemptLiveServerStatusFetch,
  fetchLiveServerStatusFromSupabase,
} from 'src/lib/server-status';
import {
  CAR,
  getDriverSR,
  calculateGap,
  getSRBadgeSx,
  SR_CHIP_WIDTH,
  formatLaptime,
  getPodiumChipSx,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
  getTrackDisplayName,
  normalizeServerTrackId,
  type LeaderboardCarRow,
  leaderboardTrackIdLookupCandidates,
} from 'src/lib/ac-elite-data';

import { DeltaChip } from 'src/components/delta-chip/delta-chip';
import { EmptyState, ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

const LEADERBOARD_PER_PAGE = 20;

type CurrentTrackData = CurrentTrackPayload;

export default function Page() {
  const { openGuide } = useLicenseSafetyGuide();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const [deltas, setDeltas] = useState<Map<string, DriverDelta>>(new Map());
  const [preferredTrack, setPreferredTrack] = useState('');
  const [currentTrack, setCurrentTrack] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, prevRank, trackJson, meta, liveStatus] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchJson<Record<string, any>>(DATA_FILES.leaderboard),
          fetchPrevRankData(),
          fetchJson<CurrentTrackData>(DATA_FILES.currentTrack).catch(() => null),
          fetchJson<SiteMetadata>(DATA_FILES.metadata).catch(() => ({})),
          canAttemptLiveServerStatusFetch()
            ? fetchLiveServerStatusFromSupabase()
            : Promise.resolve(null),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
        setMetadata(meta);
        setDeltas(computeDeltas(rank, prevRank));
        const trackKeys = Object.keys(leaderboard);
        const merged = pickNewerCurrentTrack(toCurrentTrackPayload(trackJson), liveStatus);
        const raw = merged?.track?.trim() ?? '';
        const preferred =
          leaderboardTrackIdLookupCandidates(raw).find((id) => trackKeys.includes(id)) ??
          normalizeServerTrackId(raw);
        setPreferredTrack(preferred);
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

  const tracks = useMemo(
    () =>
      Object.keys(leaderboardData || {}).sort((a, b) =>
        getTrackDisplayName(a).localeCompare(getTrackDisplayName(b))
      ),
    [leaderboardData]
  );

  useEffect(() => {
    if (tracks.length === 0) return;
    const fallbackTrack = preferredTrack && tracks.includes(preferredTrack) ? preferredTrack : tracks[0];

    const param = searchParams.get('track');
    if (param && tracks.includes(param)) {
      setCurrentTrack(param);
      return;
    }

    if (param && !tracks.includes(param)) {
      const next = fallbackTrack;
      setCurrentTrack(next);
      setSearchParams({ track: next }, { replace: true });
      return;
    }

    setCurrentTrack((prev) => (prev && tracks.includes(prev) ? prev : fallbackTrack));
  }, [tracks, preferredTrack, searchParams, setSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [currentTrack]);

  const driversByGuid = useMemo(() => {
    const map = new Map<string, RankDriver>();
    rankData.forEach((driver) => map.set(driver.guid, driver));
    return map;
  }, [rankData]);

  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);

  const rows = useMemo<LeaderboardCarRow[]>(() => {
    const data = leaderboardData?.[currentTrack]?.[CAR];
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => (a.laptime || 0) - (b.laptime || 0));
  }, [currentTrack, leaderboardData]);

  const syncHealth = useMemo(
    () => getSyncHealth(getEffectiveLastSync(metadata?.lastSync, rankData)),
    [metadata?.lastSync, rankData]
  );

  const fastestLap = rows[0]?.laptime || 0;
  const totalPages = Math.max(1, Math.ceil(rows.length / LEADERBOARD_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * LEADERBOARD_PER_PAGE;
  const pagedRows = rows.slice(start, start + LEADERBOARD_PER_PAGE);

  return (
    <>
      <title>{`Leaderboard - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite leaderboard by track. Compare lap times and find the fastest drivers." />
      <meta property="og:title" content="Leaderboard - AC Elite" />
      <meta property="og:description" content="AC Elite leaderboard by track. Compare lap times and find the fastest drivers." />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.leaderboard)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Box sx={softFloatWrapperSx()}>
              <Box sx={{ ...GLASS_PANEL_SX, ...statusAccentBorderSx(syncHealth.color), ...statusAccentSplitRimSx(syncHealth.color), ...glassCardMotionSx(0) }}>
                <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                  <Typography variant="h4" fontWeight={800}>
                    Leaderboard
                  </Typography>
                  <Typography color="text.secondary">
                    Track-based leaderboard for {CAR}. Click a driver to open the full profile.
                  </Typography>
                  <Typography variant="body2" sx={{ color: syncHealth.color, fontWeight: 700 }}>
                    {syncHealth.label} · {syncHealth.ageText}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {loading && (
              <LoadingPanel title="Loading leaderboard…" message="Pulling rank data and per-track lap times.">
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                  <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Stack>
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Paper
                  sx={{
                    ...GLASS_PANEL_SX,
                    ...glassCardMotionSx(1),
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Stack spacing={1.25} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', letterSpacing: 0.3 }}>
                      Track filter
                    </Typography>
                    <FormControl size="small" sx={{ maxWidth: 420, width: '100%' }}>
                      <Select
                        value={currentTrack}
                        onChange={(event) => {
                          const next = event.target.value;
                          setCurrentTrack(next);
                          setSearchParams({ track: next }, { replace: true });
                        }}
                        sx={{
                          borderRadius: 2,
                          color: '#fff',
                          bgcolor: 'rgba(10,22,47,0.88)',
                          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(191,225,255,0.4)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(191,225,255,0.65)',
                          },
                          '&.Mui-focused': {
                            boxShadow: '0 0 0 3px rgba(173, 216, 255, 0.22)',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(191,225,255,0.95)',
                            borderWidth: 2,
                          },
                          '& .MuiSelect-select': {
                            fontWeight: 700,
                          },
                          '& .MuiSvgIcon-root': {
                            color: '#dbeafe',
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              bgcolor: '#132447',
                              color: '#fff',
                              border: '1px solid rgba(191,225,255,0.3)',
                              mt: 0.5,
                            },
                          },
                        }}
                      >
                        {tracks.map((track) => (
                          <MenuItem
                            key={track}
                            value={track}
                            sx={{
                              '&.Mui-selected': {
                                bgcolor: 'rgba(191,225,255,0.18)',
                              },
                              '&.Mui-selected:hover': {
                                bgcolor: 'rgba(191,225,255,0.24)',
                              },
                            }}
                          >
                            {getTrackDisplayName(track)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Paper>

                <Paper
                  sx={{
                    ...GLASS_TABLE_WRAPPER_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(2),
                  }}
                >
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{
                        '& .MuiTableBody-root .MuiTableRow-root:hover': {
                          backgroundColor: 'rgba(255,255,255,0.04)',
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
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ py: 4, px: 2 }}>
                              <EmptyState
                                title="No leaderboard data for this track yet."
                                description="When laps are recorded on this layout, rows will appear here automatically after the next sync."
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {pagedRows.map((entry, index) => {
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
                                ...(absolutePos < 3
                                  ? getPodiumRowSx((absolutePos + 1) as 1 | 2 | 3)
                                  : {}),
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
                                    onClick={(e) => { e.stopPropagation(); openGuide('license'); }}
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
                                    onClick={(e) => { e.stopPropagation(); openGuide('safety'); }}
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
                                {typeof entry.laptime === 'number'
                                  ? calculateGap(fastestLap, entry.laptime)
                                  : '—'}
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

                {totalPages > 1 && (
                  <Paper sx={{ ...GLASS_TABLE_PAGINATION_SX, ...glassCardMotionSx(3) }}>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                      <Button
                        disabled={safePage <= 1}
                        onClick={() => setPage(safePage - 1)}
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
                              onClick={() => setPage(p)}
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
                        onClick={() => setPage(safePage + 1)}
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
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
