import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getLeaderboardTrackSearch } from 'src/lib/routes';
import { type TeamRoles, getDiscordRolesForGuid } from 'src/lib/team-roles';
import { liveriesAssetUrl, getTeamLiveryMeta } from 'src/lib/driver-liveries';
import { GLASS_PANEL_SX, GLASS_INNER_PANEL_SX, GLASS_TABLE_WRAPPER_SX } from 'src/lib/glass';
import {
  CAR,
  getDriverSR,
  calculateGap,
  getSRBadgeSx,
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
  LICENSE_CHIP_WIDTH,
  getTrackDisplayName,
  type LeaderboardCarRow,
} from 'src/lib/ac-elite-data';

import { ErrorPanel } from 'src/components/data-state/error-panel';
import { LoadingPanel } from 'src/components/data-state/loading-panel';
import { LiveryEnlargeDialog } from 'src/components/livery/livery-enlarge-dialog';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

type TrackStatRow = {
  trackId: string;
  trackName: string;
  position: number;
  totalDrivers: number;
  lapTime: number;
  gap: string;
  laps: number;
};

export default function Page() {
  const navigate = useNavigate();
  const { driverGuid = '' } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [teamRoles, setTeamRoles] = useState<TeamRoles>({ creator: [], admin: [], moderator: [] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, roles] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
          fetchJson<TeamRoles>('/data/team-roles.json'),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
        setTeamRoles(roles);
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

  const driverRoles = useMemo<DiscordRole[]>(
    () => (driverGuid ? getDiscordRolesForGuid(driverGuid, teamRoles) : []),
    [driverGuid, teamRoles]
  );

  const teamLiveryMeta = useMemo(
    () => (driver ? getTeamLiveryMeta(driver.guid) : undefined),
    [driver]
  );
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
            {loading && <LoadingPanel message="Loading driver profile..." />}

            {!loading && error && <ErrorPanel error={error} />}

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
                <Paper sx={{ ...GLASS_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
                  <Stack spacing={0.5} sx={{ mb: 2, alignItems: { xs: 'center', md: 'flex-start' } }}>
                    <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                      Driver profile
                    </Typography>
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
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {driver.guid}
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper sx={{ ...GLASS_INNER_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          License
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mt: 0.4 }}>
                          <Chip
                            size="small"
                            label={license.license}
                            sx={{
                              minWidth: LICENSE_CHIP_WIDTH,
                              justifyContent: 'center',
                              fontWeight: 700,
                              ...getLicenseBadgeSx(license.license),
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {Math.round(license.paceScore).toLocaleString()}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper sx={{ ...GLASS_INNER_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Safety Rating
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mt: 0.4 }}>
                          <Chip
                            size="small"
                            label={sr.tier}
                            sx={{
                              minWidth: SR_CHIP_WIDTH,
                              justifyContent: 'center',
                              fontWeight: 700,
                              ...getSRBadgeSx(sr.tier),
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {sr.sr.toFixed(2)}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ ...GLASS_INNER_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Total KM
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.4 }}>
                          {formatNumber(Math.round(driver.kilometers || 0))}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ ...GLASS_INNER_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Tracks Driven
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.4 }}>
                          {formatNumber(trackRows.length)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <Paper sx={{ ...GLASS_INNER_PANEL_SX, textAlign: { xs: 'center', md: 'left' } }}>
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

                <Paper sx={GLASS_TABLE_WRAPPER_SX}>
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
                        {trackRows.map((row) => (
                          <TableRow
                            key={`${row.trackId}-${row.position}`}
                            hover
                            onClick={() =>
                              navigate({
                                pathname: '/leaderboard',
                                search: getLeaderboardTrackSearch(row.trackId),
                              })
                            }
                            sx={{ cursor: 'pointer' }}
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

                {teamLiveryMeta ? (
                  <>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_SX,
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
