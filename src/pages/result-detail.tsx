import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
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
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getResultsIndexHref, getDriverProfileHref } from 'src/lib/routes';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import { GLASS_PANEL_SX, getPodiumRowSx, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';
import {
  getDriverSR,
  getSRBadgeSx,
  formatLaptime,
  SR_CHIP_WIDTH,
  type RankDriver,
  getPodiumChipSx,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
} from 'src/lib/ac-elite-data';
import {
  formatGap,
  type LapRow,
  resolveTrack,
  formatTotalTime,
  fetchSessionById,
  type SessionFull,
  type ClassificationRow,
} from 'src/lib/results';

import { ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

const TYPE_LABEL: Record<string, string> = { RACE: 'Race', QUALIFY: 'Qualify', PRACTICE: 'Practice' };

// Solid, high-contrast chips — they sit on the dark hero image, so a tint + light
// text reads as an empty pill. Dark text on a bright fill is clearly legible.
const TYPE_CHIP_SX: Record<string, object> = {
  RACE: { bgcolor: '#22c55e', color: '#04210f' },
  QUALIFY: { bgcolor: '#f59e0b', color: '#2a1800' },
  PRACTICE: { bgcolor: '#cbd5e1', color: '#0b1220' },
};

function formatSessionDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // Fixed en-GB locale so the date reads the same for everyone (was browser-locale).
  return d.toLocaleString('en-GB', {
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

function DriverLaps({
  name,
  laps,
  sessionBestMs,
}: {
  name: string;
  laps: LapRow[];
  sessionBestMs: number | null;
}) {
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
        sx={{ justifyContent: 'space-between', px: 2, py: 1.25, color: 'text.primary', textTransform: 'none', fontWeight: 700 }}
      >
        <Typography component="span" sx={{ fontWeight: 700 }}>
          {name || 'Unknown'}
        </Typography>
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
                <TableCell align="right">Δ</TableCell>
                <TableCell align="right">S1</TableCell>
                <TableCell align="right">S2</TableCell>
                <TableCell align="right">S3</TableCell>
                <TableCell align="center">Tyre</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {laps.map((l, i) => {
                const isBest = l.lapMs > 0 && l.lapMs === sessionBestMs;
                const prev = i > 0 ? laps[i - 1] : null;
                const gapMs = prev && prev.lapMs > 0 && l.lapMs > 0 ? l.lapMs - prev.lapMs : null;
                return (
                  <TableRow key={l.lap} sx={isBest ? { bgcolor: 'rgba(168,85,247,0.12)' } : undefined}>
                    <TableCell>{l.lap}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: isBest ? 800 : 500 }}>
                      {formatLaptime(l.lapMs)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: 'tabular-nums', color: gapMs == null ? 'text.secondary' : gapMs <= 0 ? '#86efac' : '#fca5a5' }}
                    >
                      {gapMs == null ? '—' : `${gapMs > 0 ? '+' : ''}${(gapMs / 1000).toFixed(3)}`}
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[0])}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[1])}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatSector(l.sectors[2])}</TableCell>
                    <TableCell align="center">{l.tyre || '—'}</TableCell>
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
  useTrackCatalogVersion(); // re-render once the live track catalog (names + hero images) loads
  const { sessionId } = useParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionFull | null>(null);

  // Live rank data → per-driver License + Safety Rating chips.
  const [licenseMap, setLicenseMap] = useState<ReturnType<typeof computeLicenseMap> | null>(null);
  const [rankByGuid, setRankByGuid] = useState<Map<string, RankDriver>>(new Map());

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

  useEffect(() => {
    let mounted = true;
    fetchJson<RankDriver[]>(DATA_FILES.rank)
      .then((rank) => {
        if (!mounted) return;
        setLicenseMap(computeLicenseMap(rank));
        setRankByGuid(new Map(rank.map((d) => [d.guid, d])));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const driverBadges = (guid: string): { license: string; srTier: string } | null => {
    const d = rankByGuid.get(guid);
    if (!d || !licenseMap) return null;
    return { license: getDriverLicense(d, licenseMap).license, srTier: getDriverSR(d).tier };
  };

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
  // Per-driver incident involvement (as instigator or other party).
  const incidentCountByGuid = useMemo(() => {
    const m = new Map<string, number>();
    for (const inc of session?.detail?.incidents ?? []) {
      if (inc.guid) m.set(inc.guid, (m.get(inc.guid) ?? 0) + 1);
      if (inc.otherGuid) m.set(inc.otherGuid, (m.get(inc.otherGuid) ?? 0) + 1);
    }
    return m;
  }, [session]);

  const track = session
    ? resolveTrack(session.track_name, session.track_config)
    : { label: 'Session', hero: null, offset: 0 };
  const trackName = track.label !== '—' ? track.label : 'Session';
  const heroSrc = track.hero;
  const heroOffsetY = track.offset;
  const title = session ? `${trackName} — ${TYPE_LABEL[session.type] ?? session.type}` : 'Session';

  return (
    <>
      <title>{`${title} - ${CONFIG.appName}`}</title>

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            {loading && (
              <LoadingPanel title="Loading session…" message="Fetching classification, laps and incidents.">
                <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && session && (
              <>
                {/* Hero header */}
                <Paper sx={{ ...GLASS_PANEL_SX, p: 0, overflow: 'hidden', ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                  <Box sx={{ position: 'relative' }}>
                    {heroSrc ? (
                      <Box
                        component="img"
                        src={heroSrc}
                        alt=""
                        sx={{
                          width: '100%',
                          height: { xs: 150, sm: 200 },
                          objectFit: 'cover',
                          objectPosition: heroOffsetY === 0 ? 'center' : `center calc(50% + ${heroOffsetY}px)`,
                          display: 'block',
                        }}
                      />
                    ) : (
                      <Box
                        aria-hidden
                        sx={{
                          width: '100%',
                          height: { xs: 150, sm: 200 },
                          background:
                            'radial-gradient(circle at 85% 10%, rgba(147,197,253,0.14), transparent 45%), linear-gradient(180deg, rgba(16,20,32,0.92), rgba(10,14,24,0.95))',
                        }}
                      />
                    )}
                    {/* darkening overlay for legibility */}
                    <Box
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(180deg, rgba(6,10,20,0.15) 0%, rgba(7,12,24,0.45) 50%, rgba(8,14,28,0.9) 100%)',
                      }}
                    />
                    {/* back button — top-left, inside the card */}
                    <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          window.location.href = getResultsIndexHref();
                        }}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 700,
                          color: 'rgba(255,255,255,0.92)',
                          bgcolor: 'rgba(8,14,28,0.5)',
                          border: '1px solid rgba(255,255,255,0.18)',
                          backdropFilter: 'blur(8px)',
                          px: 1.25,
                          '&:hover': { bgcolor: 'rgba(8,14,28,0.7)' },
                        }}
                      >
                        ← All results
                      </Button>
                    </Box>
                    {/* title block — bottom-left */}
                    <Box sx={{ position: 'absolute', left: 16, right: 16, bottom: 12 }}>
                      <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
                        <Typography component="h1" variant="h4" fontWeight={800} sx={{ color: '#fff', lineHeight: 1.1 }}>
                          {trackName}
                        </Typography>
                        <Chip size="small" label={TYPE_LABEL[session.type] ?? session.type} sx={{ fontWeight: 800, ...(TYPE_CHIP_SX[session.type] ?? {}) }} />
                      </Stack>
                      {session.event_name ? (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mt: 0.5 }}>
                          {session.event_name}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                  {/* stats strip */}
                  <Stack
                    direction="row"
                    spacing={4}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ px: 2.5, py: 2, bgcolor: 'rgba(255,255,255,0.03)' }}
                  >
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
                </Paper>

                {/* Classification */}
                <Paper sx={{ ...GLASS_TABLE_WRAPPER_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{ '& .MuiTableBody-root .MuiTableRow-root:hover': { backgroundColor: 'rgba(255,255,255,0.028)' } }}
                    >
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
                          <TableCell align="right">Inc.</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classification.map((row) => {
                          const badges = driverBadges(row.guid);
                          const incCount = incidentCountByGuid.get(row.guid) ?? 0;
                          return (
                            <TableRow
                              key={`${row.guid}-${row.pos}`}
                              onClick={() => {
                                window.location.href = getDriverProfileHref(row.guid);
                              }}
                              sx={{
                                cursor: 'pointer',
                                ...(row.pos >= 1 && row.pos <= 3 ? getPodiumRowSx(row.pos as 1 | 2 | 3) : {}),
                              }}
                            >
                              <TableCell>
                                <Chip size="small" label={row.pos} sx={{ minWidth: 38, fontWeight: 700, ...getPodiumChipSx(row.pos) }} />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                  <Typography component="span" sx={{ fontWeight: 700 }}>
                                    {row.name || 'Unknown'}
                                  </Typography>
                                  {badges ? (
                                    <Chip
                                      size="small"
                                      label={badges.license}
                                      sx={{ minWidth: LICENSE_CHIP_WIDTH, fontWeight: 700, justifyContent: 'center', ...getLicenseBadgeSx(badges.license) }}
                                    />
                                  ) : null}
                                  {badges ? (
                                    <Chip
                                      size="small"
                                      label={badges.srTier}
                                      sx={{ minWidth: SR_CHIP_WIDTH, fontWeight: 700, justifyContent: 'center', ...getSRBadgeSx(badges.srTier) }}
                                    />
                                  ) : null}
                                  {row.disqualified ? (
                                    <Chip
                                      size="small"
                                      label="DSQ"
                                      sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}
                                    />
                                  ) : null}
                                </Stack>
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
                              <TableCell align="right" sx={{ fontWeight: incCount > 0 ? 700 : 400, color: incCount > 0 ? '#fca5a5' : 'text.secondary' }}>
                                {incCount || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
                    return <DriverLaps key={row.guid} name={row.name} laps={driverLaps} sessionBestMs={session.best_lap_ms} />;
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
                              <TableCell sx={{ fontWeight: 600 }}>{inc.name || 'Unknown'}</TableCell>
                              <TableCell sx={{ color: 'text.secondary' }}>
                                {inc.type === 'CAR' ? inc.otherName || 'Unknown' : '—'}
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
