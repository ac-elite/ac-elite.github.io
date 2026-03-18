import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import { keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import {
  CAR,
  getDriverSR,
  calculateGap,
  getSRBadgeSx,
  formatLaptime,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  getTrackDisplayName,
} from 'src/lib/ac-elite-data';

type LeaderboardRow = {
  laptime: number;
  name?: string;
  laps?: number;
  guid: string;
};

const LEADERBOARD_PER_PAGE = 20;
const APP_BASE_URL = import.meta.env.BASE_URL;

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 48px 48px, 48px 48px, 96px 0; }
`;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [currentTrack, setCurrentTrack] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
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
    if (!currentTrack && tracks.length > 0) setCurrentTrack(tracks[0]);
  }, [currentTrack, tracks]);

  useEffect(() => {
    setPage(1);
  }, [currentTrack]);

  const driversByGuid = useMemo(() => {
    const map = new Map<string, RankDriver>();
    rankData.forEach((driver) => map.set(driver.guid, driver));
    return map;
  }, [rankData]);

  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);

  const rows = useMemo<LeaderboardRow[]>(() => {
    const data = leaderboardData?.[currentTrack]?.[CAR];
    if (!Array.isArray(data)) return [];
    return [...data].sort((a, b) => (a.laptime || 0) - (b.laptime || 0));
  }, [currentTrack, leaderboardData]);

  const fastestLap = rows[0]?.laptime || 0;
  const totalPages = Math.max(1, Math.ceil(rows.length / LEADERBOARD_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * LEADERBOARD_PER_PAGE;
  const pagedRows = rows.slice(start, start + LEADERBOARD_PER_PAGE);

  return (
    <>
      <title>{`Leaderboard - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite leaderboard by track." />

      <Box
        sx={{
          position: 'relative',
          py: 4,
          background:
            'radial-gradient(circle at 20% 0%, rgba(23,33,59,0.24) 0, transparent 50%),' +
            'linear-gradient(180deg, #17213B 0%, #1f2c49 100%)',
          overflow: 'hidden',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.22,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),' +
              'repeating-linear-gradient(45deg, transparent, transparent 88px, rgba(147,197,253,0.15) 88px, rgba(147,197,253,0.15) 90px)',
            backgroundSize: '48px 48px, 48px 48px, 100% 100%',
            animation: `${gridMove} 22s linear infinite`,
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={2.5}>
            <Stack spacing={0.75}>
              <Typography variant="h4" fontWeight={800}>
                Leaderboard
              </Typography>
              <Typography color="text.secondary">Best lap times per track ({CAR}).</Typography>
            </Stack>

            {loading && (
              <Paper sx={{ p: 3 }}>
                <Typography>Loading leaderboard data...</Typography>
              </Paper>
            )}

            {!loading && error && (
              <Paper sx={{ p: 3 }}>
                <Typography color="error" fontWeight={700}>
                  Failed to load data
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              </Paper>
            )}

            {!loading && !error && (
              <>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
                    backdropFilter: 'blur(14px)',
                  }}
                >
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {tracks.map((track) => (
                      <Button
                        key={track}
                        size="small"
                        variant={track === currentTrack ? 'contained' : 'outlined'}
                        onClick={() => setCurrentTrack(track)}
                        sx={{
                          borderRadius: 2,
                          ...(track === currentTrack
                            ? {
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.22)',
                                background:
                                  'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                              }
                            : {
                                color: 'rgba(255,255,255,0.9)',
                                borderColor: 'rgba(255,255,255,0.3)',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                              }),
                        }}
                      >
                        {getTrackDisplayName(track)}
                      </Button>
                    ))}
                  </Stack>
                </Paper>

                <Paper
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
                    backdropFilter: 'blur(14px)',
                    overflow: 'hidden',
                  }}
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Driver</TableCell>
                          <TableCell>Licence</TableCell>
                          <TableCell>SR</TableCell>
                          <TableCell>Lap Time</TableCell>
                          <TableCell align="right">Gap</TableCell>
                          <TableCell align="right">Laps</TableCell>
                          <TableCell align="right">KM</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                              No leaderboard data for this track yet.
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

                          return (
                            <TableRow
                              key={`${entry.guid}-${entry.laptime}-${index}`}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                                ...(absolutePos === 0 && { bgcolor: 'rgba(251,191,36,0.08)' }),
                                ...(absolutePos === 1 && { bgcolor: 'rgba(148,163,184,0.07)' }),
                                ...(absolutePos === 2 && { bgcolor: 'rgba(245,158,11,0.08)' }),
                              }}
                              onClick={() => {
                                window.location.href = `${APP_BASE_URL}?driver=${encodeURIComponent(entry.guid)}#driver-search`;
                              }}
                            >
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={absolutePos + 1}
                                  sx={{
                                    minWidth: 38,
                                    fontWeight: 700,
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{entry.name || driver.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${license.license} | ${Math.round(license.paceScore).toLocaleString()}`}
                                  sx={{ fontWeight: 700, ...getLicenseBadgeSx(license.license) }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${sr.tier} | ${sr.sr.toFixed(2)}`}
                                  sx={{ fontWeight: 700, ...getSRBadgeSx(sr.tier) }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                {formatLaptime(entry.laptime)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                {calculateGap(fastestLap, entry.laptime)}
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
                  <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                    <Button
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      variant="outlined"
                      size="small"
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
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
                            sx={
                              p === safePage
                                ? {
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,0.22)',
                                    background:
                                      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                                  }
                                : {
                                    color: 'rgba(255,255,255,0.9)',
                                    borderColor: 'rgba(255,255,255,0.3)',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                  }
                            }
                          >
                            {p}
                          </Button>
                        </Box>
                      ))}
                    <Button
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                      variant="outlined"
                      size="small"
                      sx={{
                        color: 'rgba(255,255,255,0.9)',
                        borderColor: 'rgba(255,255,255,0.3)',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      Next
                    </Button>
                  </Stack>
                )}
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
