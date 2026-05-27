import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { formatLaptime, getPodiumChipSx, getTrackDisplayName } from 'src/lib/ac-elite-data';
import { getResultsIndexHref, getDriverProfileHref } from 'src/lib/routes';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_SX, getPodiumRowSx, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';
import {
  formatGap,
  type LapRow,
  formatTotalTime,
  fetchSessionById,
  type SessionFull,
  type ClassificationRow,
} from 'src/lib/results';

import { ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

const TYPE_LABEL: Record<string, string> = { RACE: 'Race', QUALIFY: 'Qualify', PRACTICE: 'Practice' };

function formatSessionDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSector(ms: number): string {
  if (!ms || ms <= 0) return '—';
  return (ms / 1000).toFixed(3);
}

function HeaderStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/** Gap shown in the classification, depending on session type. */
function classificationGap(
  isRace: boolean,
  leader: ClassificationRow | undefined,
  row: ClassificationRow
): string {
  if (!leader || row.pos === 1) return '—';
  if (isRace) {
    if (row.numLaps < leader.numLaps) {
      const laps = leader.numLaps - row.numLaps;
      return `+${laps} lap${laps === 1 ? '' : 's'}`;
    }
    return formatGap(leader.totalTimeMs, row.totalTimeMs);
  }
  return formatGap(leader.bestLapMs, row.bestLapMs);
}

function DriverLaps({ name, guid, laps, sessionBestMs }: { name: string; guid: string; laps: LapRow[]; sessionBestMs: number | null }) {
  const [open, setOpen] = useState(false);
  const driverBest = useMemo(
    () => laps.reduce((m, l) => (l.lapMs > 0 && (m === null || l.lapMs < m) ? l.lapMs : m), null as number | null),
    [laps]
  );

  return (
    <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <Button
        fullWidth
        onClick={() => setOpen((v) => !v)}
        sx={{
          justifyContent: 'space-between',
          px: 2,
          py: 1.25,
          color: 'text.primary',
          textTransform: 'none',
          fontWeight: 700,
        }}
      >
        <Link
          href={getDriverProfileHref(guid)}
          onClick={(e) => e.stopPropagation()}
          underline="none"
          color="inherit"
          sx={{ fontWeight: 700 }}
        >
          {name || 'Unknown'}
        </Link>
        <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
          {laps.length} lap{laps.length === 1 ? '' : 's'} · best {formatLaptime(driverBest)} {open ? '▲' : '▼'}
        </Typography>
      </Button>
      <Collapse in={open} unmountOnExit>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lap</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="right">S1</TableCell>
                <TableCell align="right">S2</TableCell>
                <TableCell align="right">S3</TableCell>
                <TableCell align="center">Tyre</TableCell>
                <TableCell align="center">Cuts</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {laps.map((l) => {
                const isBest = l.lapMs > 0 && l.lapMs === sessionBestMs;
                return (
                  <TableRow key={l.lap} sx={isBest ? { bgcolor: 'rgba(168,85,247,0.12)' } : undefined}>
                    <TableCell>{l.lap}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: isBest ? 800 : 500 }}>
                      {formatLaptime(l.lapMs)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[0])}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[1])}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[2])}</TableCell>
                    <TableCell align="center">{l.tyre || '—'}</TableCell>
                    <TableCell align="center" sx={{ color: l.cuts > 0 ? '#fca5a5' : 'text.secondary' }}>{l.cuts}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
}

export default function Page() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionFull | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchSessionById(sessionId ?? '')
      .then((s) => {
        if (!mounted) return;
        setSession(s);
        if (!s) setError('Session not found.');
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
  }, [sessionId]);

  const isRace = session?.type === 'RACE';
  const classification = session?.detail?.classification ?? [];
  const leader = classification[0];

  const lapsByGuid = useMemo(() => {
    const map = new Map<string, LapRow[]>();
    for (const l of session?.detail?.laps ?? []) {
      const list = map.get(l.guid);
      if (list) list.push(l);
      else map.set(l.guid, [l]);
    }
    return map;
  }, [session]);

  const incidents = session?.detail?.incidents ?? [];
  const title = session
    ? `${session.track_name ? getTrackDisplayName(session.track_name) : 'Session'} — ${TYPE_LABEL[session.type] ?? session.type}`
    : 'Session';

  return (
    <>
      <title>{`${title} - ${CONFIG.appName}`}</title>

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Link href={getResultsIndexHref()} underline="none" sx={{ fontWeight: 700, color: 'text.secondary' }}>
              ← All results
            </Link>

            {loading && (
              <LoadingPanel title="Loading session…" message="Fetching classification, laps and incidents.">
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && session && (
              <>
                <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                      <Typography component="h1" variant="h4" fontWeight={800}>
                        {session.track_name ? getTrackDisplayName(session.track_name) : 'Session'}
                      </Typography>
                      <Chip size="small" label={TYPE_LABEL[session.type] ?? session.type} sx={{ fontWeight: 700 }} />
                    </Stack>
                    {session.event_name ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {session.event_name}
                      </Typography>
                    ) : null}
                    <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                      <HeaderStat label="Date" value={formatSessionDate(session.session_date) || '—'} />
                      <HeaderStat label="Drivers" value={session.num_drivers} />
                      {isRace ? <HeaderStat label="Laps" value={session.num_laps} /> : null}
                      <HeaderStat
                        label="Fastest lap"
                        value={
                          session.best_lap_ms
                            ? `${formatLaptime(session.best_lap_ms)}${session.best_lap_name ? ` · ${session.best_lap_name}` : ''}`
                            : '—'
                        }
                      />
                    </Stack>
                  </Stack>
                </Paper>

                {/* Classification */}
                <Paper sx={{ ...GLASS_TABLE_WRAPPER_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Driver</TableCell>
                          <TableCell>Car</TableCell>
                          <TableCell align="right">Best lap</TableCell>
                          {isRace ? <TableCell align="right">Total time</TableCell> : null}
                          <TableCell align="right">Gap</TableCell>
                          <TableCell align="right">Laps</TableCell>
                          <TableCell align="right">Grid</TableCell>
                          <TableCell align="right">Pen.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classification.map((row) => (
                          <TableRow
                            key={`${row.guid}-${row.pos}`}
                            sx={{ ...(row.pos >= 1 && row.pos <= 3 ? getPodiumRowSx(row.pos as 1 | 2 | 3) : {}) }}
                          >
                            <TableCell>
                              <Chip size="small" label={row.pos} sx={{ minWidth: 38, fontWeight: 700, ...getPodiumChipSx(row.pos) }} />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>
                              <Link
                                href={getDriverProfileHref(row.guid)}
                                underline="none"
                                color="inherit"
                                sx={{ fontWeight: 700 }}
                              >
                                {row.name || 'Unknown'}
                              </Link>
                              {row.disqualified ? (
                                <Chip size="small" label="DSQ" sx={{ ml: 1, height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(239,68,68,0.18)', color: '#fca5a5' }} />
                              ) : null}
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{row.skin || row.carModel || '—'}</TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatLaptime(row.bestLapMs)}</TableCell>
                            {isRace ? (
                              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatTotalTime(row.totalTimeMs)}</TableCell>
                            ) : null}
                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                              {classificationGap(isRace, leader, row)}
                            </TableCell>
                            <TableCell align="right">{row.numLaps}</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary' }}>{row.gridPosition || '—'}</TableCell>
                            <TableCell align="right" sx={{ color: row.penaltyTimeMs || row.lapPenalty ? '#fca5a5' : 'text.secondary' }}>
                              {row.lapPenalty ? `${row.lapPenalty} lap` : row.penaltyTimeMs ? `+${(row.penaltyTimeMs / 1000).toFixed(0)}s` : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* Laps per driver */}
                <Paper sx={{ ...GLASS_PANEL_SX, ...glassCardMotionSx(2), p: 0, overflow: 'hidden' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, px: 2, pt: 2, pb: 1 }}>
                    Laps
                  </Typography>
                  {classification.map((row) => {
                    const driverLaps = lapsByGuid.get(row.guid) ?? [];
                    if (driverLaps.length === 0) return null;
                    return (
                      <DriverLaps
                        key={row.guid}
                        guid={row.guid}
                        name={row.name}
                        laps={driverLaps}
                        sessionBestMs={session.best_lap_ms}
                      />
                    );
                  })}
                </Paper>

                {/* Incidents */}
                {incidents.length > 0 && (
                  <Paper sx={{ ...GLASS_TABLE_WRAPPER_SX, ...glassCardMotionSx(3) }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, px: 2, pt: 2, pb: 1 }}>
                      Incidents ({incidents.length})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Driver</TableCell>
                            <TableCell>Other</TableCell>
                            <TableCell align="right">Impact (km/h)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {incidents.map((inc, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={inc.type === 'CAR' ? 'Car' : 'Environment'}
                                  sx={{
                                    fontWeight: 700,
                                    bgcolor: inc.type === 'CAR' ? 'rgba(239,68,68,0.14)' : 'rgba(148,163,184,0.14)',
                                    color: inc.type === 'CAR' ? '#fca5a5' : '#cbd5e1',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {inc.guid ? (
                                  <Link href={getDriverProfileHref(inc.guid)} underline="none" color="inherit" sx={{ fontWeight: 600 }}>
                                    {inc.name || 'Unknown'}
                                  </Link>
                                ) : (
                                  inc.name || 'Unknown'
                                )}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>
                                {inc.type === 'CAR' && inc.otherGuid ? (
                                  <Link href={getDriverProfileHref(inc.otherGuid)} underline="none" color="inherit">
                                    {inc.otherName || 'Unknown'}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{inc.impactSpeed.toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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
