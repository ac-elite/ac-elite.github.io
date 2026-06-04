import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { formatLaptime } from 'src/lib/ac-elite-data';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { getResultHref, getDriverProfileHref } from 'src/lib/routes';
import { subtleRowEnterSx, glassCardMotionSx } from 'src/lib/subtle-motion';
import { GLASS_PANEL_SX, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import {
  GLASS_SELECT_SX,
  glassFilterButtonSx,
  GLASS_SELECT_MENU_PROPS,
  GLASS_SELECT_MENU_ITEM_SX,
} from 'src/lib/glass-select';
import { PANEL_OVERLINE_MUTED_SX, FORM_SECTION_KICKER_CAPTION_SX } from 'src/lib/page-shell';
import {
  resolveTrack,
  TYPE_CHIP_SX,
  fetchSessions,
  type TrackOption,
  type SessionType,
  formatSessionDate,
  type SessionSummary,
  type SessionTypeFilter,
  fetchSessionTypeOptions,
  fetchSessionTrackOptions,
} from 'src/lib/results';

import { Reveal } from 'src/components/reveal';
import { EmptyState, ErrorPanel } from 'src/components/data-state';
import { SessionPaginate } from 'src/components/sessions-table/session-paginate';

const SESSIONS_PER_PAGE = 10;

const TYPE_LABEL: Record<SessionTypeFilter, string> = {
  ALL: 'All',
  RACE: 'Race',
  QUALIFY: 'Qualify',
  PRACTICE: 'Practice',
};

/**
 * A driver's own session history — every listed session their guid appears in,
 * sourced from the same Supabase `sessions` table as the Results page (the guid
 * matches the denormalized `search` blob). Mirrors the Results layout: type
 * filter, glass table, pagination.
 */
export function DriverSessionsTable({
  driverGuid,
  driverName,
}: {
  driverGuid: string;
  driverName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [typeOptions, setTypeOptions] = useState<SessionType[]>([]);
  const [trackOptions, setTrackOptions] = useState<TrackOption[]>([]);
  const [type, setType] = useState<SessionTypeFilter>('ALL');
  const [track, setTrack] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Reset to defaults whenever the profile switches drivers.
  useEffect(() => {
    setType('ALL');
    setTrack('ALL');
    setSearchInput('');
    setSearch('');
    setPage(1);
  }, [driverGuid]);

  // Debounce the search box so we don't query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  // The session types + tracks this driver actually has — so we only offer real options.
  useEffect(() => {
    let mounted = true;
    void fetchSessionTypeOptions(driverGuid).then((opts) => mounted && setTypeOptions(opts));
    void fetchSessionTrackOptions(driverGuid).then((opts) => mounted && setTrackOptions(opts));
    return () => {
      mounted = false;
    };
  }, [driverGuid]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchSessions({ type, track, scope: driverGuid, search, page, perPage: SESSIONS_PER_PAGE })
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
  }, [driverGuid, type, track, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / SESSIONS_PER_PAGE));
  const typeTabs: SessionTypeFilter[] = ['ALL', ...typeOptions];

  return (
    <>
      <Reveal>
        <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
          <Stack
            spacing={1.5}
            sx={{ alignItems: { xs: 'center', md: 'stretch' }, textAlign: { xs: 'center', md: 'left' } }}
          >
            <Box>
              <Typography variant="overline" sx={{ ...PANEL_OVERLINE_MUTED_SX }}>
                Sessions
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.3 }}>
                Session history
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                Every listed race, qualify and practice {driverName ? `${driverName} ` : ''}took part
                in — open one for the full classification.
              </Typography>
            </Box>

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
                  placeholder="Track, winner, opponent or date…"
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
          </Stack>
        </Paper>
      </Reveal>

      {error && <ErrorPanel error={error} />}

      {!error && loading && (
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}
        />
      )}

      {!error && !loading && (
        <Reveal>
          <Paper
            sx={{ ...GLASS_TABLE_WRAPPER_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(2) }}
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
                          description="This driver's races and qualifies appear here automatically after they're driven on the server."
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
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatSessionDate(row.session_date)}
                        </TableCell>
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
      )}

      {!error && !loading && (
        <SessionPaginate page={page} totalPages={totalPages} onChange={setPage} motionIndex={2} />
      )}
    </>
  );
}
