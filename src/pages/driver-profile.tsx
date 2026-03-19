import { useParams } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
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
  guid: string;
  laptime?: number;
  laps?: number;
  name?: string;
};

type TrackStatRow = {
  trackId: string;
  trackName: string;
  position: number;
  totalDrivers: number;
  lapTime: number;
  gap: string;
  laps: number;
};

const APP_BASE_URL = import.meta.env.BASE_URL;

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 48px 48px, 48px 48px, 96px 0; }
`;

function getPositionChipSx(position: number) {
  if (position === 1) {
    return {
      color: '#fef3c7',
      border: '1px solid rgba(245, 158, 11, 0.55)',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.38), rgba(245,158,11,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
    };
  }
  if (position === 2) {
    return {
      color: '#e2e8f0',
      border: '1px solid rgba(148, 163, 184, 0.55)',
      background: 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(148,163,184,0.12))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  if (position === 3) {
    return {
      color: '#ffedd5',
      border: '1px solid rgba(194, 101, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(194,101,31,0.36), rgba(194,101,31,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  return {
    bgcolor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  };
}

export default function Page() {
  const { driverGuid = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});

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

  const driver = useMemo(
    () => rankData.find((item) => item.guid === driverGuid) || null,
    [driverGuid, rankData]
  );

  const licenseMap = useMemo(() => computeLicenseMap(rankData), [rankData]);
  const license = useMemo(() => (driver ? getDriverLicense(driver, licenseMap) : null), [driver, licenseMap]);
  const sr = useMemo(() => (driver ? getDriverSR(driver) : null), [driver]);

  const trackRows = useMemo<TrackStatRow[]>(() => {
    if (!driver) return [];

    const rows: TrackStatRow[] = [];
    for (const [trackId, trackData] of Object.entries(leaderboardData || {})) {
      const carRows = Array.isArray((trackData as Record<string, any>)?.[CAR])
        ? ([...(trackData as Record<string, any>)[CAR]] as LeaderboardRow[]).filter(
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

  return (
    <>
      <title>{`Driver Profile - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite driver profile and per-track leaderboard performance." />

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
          <Stack spacing={3}>
            {loading && (
              <Paper sx={{ p: 3 }}>
                <Typography>Loading driver profile...</Typography>
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

            {!loading && !error && !driver && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight={800}>
                  Driver not found
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                  Could not find a driver with GUID: {driverGuid}
                </Typography>
              </Paper>
            )}

            {!loading && !error && driver && license && sr && (
              <>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
                    backdropFilter: 'blur(14px)',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                      Driver profile
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {driver.name || 'Unknown Driver'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {driver.guid}
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper sx={{ p: 1.25, bgcolor: 'rgba(23,33,59,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Licence
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.4 }}>
                          <Chip size="small" label={license.license} sx={{ fontWeight: 700, ...getLicenseBadgeSx(license.license) }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {Math.round(license.paceScore).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper sx={{ p: 1.25, bgcolor: 'rgba(23,33,59,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Safety Rating
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.4 }}>
                          <Chip size="small" label={sr.tier} sx={{ fontWeight: 700, ...getSRBadgeSx(sr.tier) }} />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {sr.sr.toFixed(2)}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ p: 1.25, bgcolor: 'rgba(23,33,59,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          KM
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.4 }}>
                          {formatNumber(Math.round(driver.kilometers || 0))}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ p: 1.25, bgcolor: 'rgba(23,33,59,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Tracks
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.4 }}>
                          {formatNumber(trackRows.length)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ p: 1.25, bgcolor: 'rgba(23,33,59,0.55)', border: '1px solid rgba(148,163,184,0.35)' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Total Laps
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.4 }}>
                          {formatNumber(totalLaps)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
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
                          <TableCell>Track</TableCell>
                          <TableCell>Position</TableCell>
                          <TableCell>Lap Time</TableCell>
                          <TableCell>Gap</TableCell>
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
                        {trackRows.map((row) => (
                          <TableRow key={`${row.trackId}-${row.position}`} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                            <TableCell sx={{ fontWeight: 700 }}>{row.trackName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={`P${row.position}`}
                                sx={{
                                  minWidth: 44,
                                  fontWeight: 700,
                                  ...getPositionChipSx(row.position),
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
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
