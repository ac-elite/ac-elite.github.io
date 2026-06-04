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
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { formatLaptime } from 'src/lib/ac-elite-data';
import { getResultHref, getDriverProfileHref } from 'src/lib/routes';
import { getSyncHealth } from 'src/lib/sync-utils';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import { subtleRowEnterSx, glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_SX, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import {
  GLASS_SELECT_SX,
  GLASS_SELECT_MENU_PROPS,
  GLASS_SELECT_MENU_ITEM_SX,
  glassFilterButtonSx,
} from 'src/lib/glass-select';
import { DATA_PAGE_SHELL_SX, FORM_SECTION_KICKER_CAPTION_SX } from 'src/lib/page-shell';
import {
  resolveTrack,
  TYPE_CHIP_SX,
  fetchSessions,
  type SessionType,
  type TrackOption,
  formatSessionDate,
  type SessionSummary,
  fetchResultsSyncedAt,
  type SessionTypeFilter,
  fetchSessionTypeOptions,
  fetchSessionTrackOptions,
} from 'src/lib/results';

import { Reveal } from 'src/components/reveal';
import { EmptyState, ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { DataPageHeader } from 'src/components/data-page-header/data-page-header';
import { SessionPaginate } from 'src/components/sessions-table/session-paginate';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

const RESULTS_PER_PAGE = 20;

const TYPE_LABEL: Record<SessionTypeFilter, string> = {
  ALL: 'All',
  RACE: 'Race',
  QUALIFY: 'Qualify',
  PRACTICE: 'Practice',
};

export default function Page() {
  useTrackCatalogVersion(); // re-render once the live track catalog (readable names) loads
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [trackOptions, setTrackOptions] = useState<TrackOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<SessionType[]>([]);

  const [type, setType] = useState<SessionTypeFilter>('ALL');
  const [track, setTrack] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // Filter options + freshness are fetched once.
  useEffect(() => {
    let mounted = true;
    void fetchResultsSyncedAt().then((at) => mounted && setSyncedAt(at));
    void fetchSessionTrackOptions().then((opts) => mounted && setTrackOptions(opts));
    void fetchSessionTypeOptions().then((opts) => mounted && setTypeOptions(opts));
    return () => {
      mounted = false;
    };
  }, []);

  // Only offer "All" + the session types that actually exist.
  const typeTabs: SessionTypeFilter[] = ['ALL', ...typeOptions];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchSessions({ type, track, search, page, perPage: RESULTS_PER_PAGE })
      .then((res) => {
        if (!mounted) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [type, track, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE));
  const syncHealth = useMemo(() => getSyncHealth(syncedAt ?? undefined), [syncedAt]);

  return (
    <>
      <title>{`Results - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite session results: review every race, qualify and practice session." />
      <meta property="og:title" content="Results - AC Elite" />
      <meta property="og:description" content="AC Elite session results: review every race, qualify and practice session." />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.results)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <DataPageHeader
              title="Results"
              description="Every session driven on the AC Elite server — open any race, qualify or practice to see the full classification, laps and incidents."
              syncHealth={syncHealth}
            />

            <Paper
              sx={{
                ...GLASS_PANEL_SX,
                ...brandAccentBorderSx(),
                ...glassCardMotionSx(1),
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ sm: 'flex-end' }}
                sx={{ textAlign: 'left' }}
              >
                <Stack spacing={1.25} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                  <Typography variant="caption" sx={{ ...FORM_SECTION_KICKER_CAPTION_SX }}>
                    Sessions
                  </Typography>
                  <Stack
                    direction="row"
                    gap={1}
                    flexWrap="wrap"
                    justifyContent={{ xs: 'center', sm: 'flex-start' }}
                  >
                    {typeTabs.map((key) => (
                      <Button
                        key={key}
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setType(key);
                          setPage(1);
                        }}
                        sx={glassFilterButtonSx(type === key)}
                      >
                        {TYPE_LABEL[key]}
                      </Button>
                    ))}
                  </Stack>
                </Stack>

                {trackOptions.length > 0 && (
                  <Stack spacing={1.25} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Typography variant="caption" sx={{ ...FORM_SECTION_KICKER_CAPTION_SX }}>
                      Track
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: { sm: 240 }, width: '100%' }}>
                      <Select
                        value={track}
                        onChange={(event) => {
                          setTrack(event.target.value);
                          setPage(1);
                        }}
                        sx={GLASS_SELECT_SX}
                        MenuProps={GLASS_SELECT_MENU_PROPS}
                      >
                        <MenuItem value="ALL" sx={GLASS_SELECT_MENU_ITEM_SX}>
                          All tracks
                        </MenuItem>
                        {trackOptions.map((t) => (
                          <MenuItem key={t.trackName} value={t.trackName} sx={GLASS_SELECT_MENU_ITEM_SX}>
                            {resolveTrack(t.trackName, t.trackConfig).label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                )}

                <Stack spacing={1.25} sx={{ flex: 1, width: '100%', maxWidth: 480 }}>
                  <Typography variant="caption" sx={{ ...FORM_SECTION_KICKER_CAPTION_SX }}>
                    Search
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Driver, track, winner or date…"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: 'text.primary',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      },
                      '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 },
                    }}
                  />
                </Stack>
              </Stack>
            </Paper>

            {loading && (
              <LoadingPanel title="Loading results…" message="Fetching sessions from the server.">
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                  <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Stack>
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Reveal>
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
                            backgroundColor: 'rgba(255,255,255,0.028)',
                          },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Track</TableCell>
                            <TableCell align="right">Drivers</TableCell>
                            <TableCell align="right">Incidents</TableCell>
                            <TableCell>Winner / Pole</TableCell>
                            <TableCell align="right">Fastest lap</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} sx={{ py: 4, px: 2 }}>
                                <EmptyState
                                  title="No sessions yet."
                                  description="Sessions appear here automatically after they're driven on the server. Try another filter."
                                />
                              </TableCell>
                            </TableRow>
                          )}

                          {rows.map((row, idx) => (
                            <TableRow
                              key={row.id}
                              onClick={() => {
                                window.location.href = getResultHref(row.id);
                              }}
                              sx={{ cursor: 'pointer', ...subtleRowEnterSx(idx, { baseDelayMs: 340 }) }}
                            >
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSessionDate(row.session_date)}</TableCell>
                              <TableCell>
                                <Chip size="small" label={row.type} sx={TYPE_CHIP_SX[row.type] ?? {}} />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                {resolveTrack(row.track_name, row.track_config).label}
                              </TableCell>
                              <TableCell align="right">{row.num_drivers}</TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontVariantNumeric: 'tabular-nums',
                                  fontWeight: (row.num_incidents ?? 0) > 0 ? 700 : 400,
                                  color: (row.num_incidents ?? 0) > 0 ? '#fca5a5' : 'text.secondary',
                                }}
                              >
                                {row.num_incidents ?? 0}
                              </TableCell>
                              <TableCell>
                                {row.winner_guid ? (
                                  <Link
                                    href={getDriverProfileHref(row.winner_guid)}
                                    onClick={(e) => e.stopPropagation()}
                                    underline="none"
                                    color="inherit"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {row.winner_name || 'Unknown'}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatLaptime(row.best_lap_ms)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Reveal>

                <SessionPaginate page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
