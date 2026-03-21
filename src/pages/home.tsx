import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import ListItemButton from '@mui/material/ListItemButton';
import { useTheme, keyframes } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { GLASS_CARD_SX, GLASS_PANEL_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import {
  getSyncHealth,
  type SyncHealth,
  type SiteMetadata,
  getEffectiveLastSync,
} from 'src/lib/sync-utils';
import {
  getTeamRole,
  type TeamRole,
  type TeamRoles,
  EMPTY_TEAM_ROLES,
  teamRoleToDiscordRole,
} from 'src/lib/team-roles';
import {
  CAR,
  getSRTier,
  formatNumber,
  getSRBadgeSx,
  ROLE_CHIP_SX,
  safetyRating,
  type RankDriver,
  computeLicenseMap,
  getLicenseBadgeSx,
  getTrackDisplayName,
} from 'src/lib/ac-elite-data';

import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

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

const APP_BASE_URL = import.meta.env.BASE_URL;

/** Hero CTA: subtle “breathing” glass glow (matches grid energy, stays on-brand). */
const heroPrimaryPulse = keyframes`
  0%, 100% {
    box-shadow: 0 2px 10px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.16);
    border-color: rgba(255,255,255,0.22);
  }
  50% {
    box-shadow: 0 2px 12px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.24);
    border-color: rgba(255,255,255,0.3);
  }
`;

/** Soft highlight on “leaderboard.” — white-forward, not loud accent color. */
const heroWordShimmer = keyframes`
  0%, 100% {
    text-shadow: 0 0 18px rgba(255,255,255,0.12), 0 0 36px rgba(23,33,59,0.45);
    opacity: 0.96;
  }
  50% {
    text-shadow: 0 0 26px rgba(255,255,255,0.2), 0 0 48px rgba(255,255,255,0.05);
    opacity: 1;
  }
`;

const heroKeywordPulse = keyframes`
  0%, 100% {
    color: rgba(255,255,255,0.97);
    text-shadow: 0 0 18px rgba(255,255,255,0.14), 0 0 34px rgba(147,197,253,0.12);
  }
  50% {
    color: #ffffff;
    text-shadow: 0 0 24px rgba(255,255,255,0.22), 0 0 44px rgba(191,219,254,0.18);
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

function HeroSection({
  totalDrivers,
  totalLaps,
  activeTracks,
  syncStatus,
}: {
  totalDrivers: number;
  totalLaps: number;
  activeTracks: number;
  syncStatus: SyncHealth;
}) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        pt: { xs: 8, md: 12 },
        pb: { xs: 6, md: 6 },
        background:
          'radial-gradient(circle at 0% 0%, rgba(23,33,59,0.28) 0, transparent 55%),' +
          'radial-gradient(circle at 100% 100%, rgba(35,31,32,0.2) 0, transparent 55%),' +
          'linear-gradient(180deg, #17213B 0%, #1f2c49 55%, #17213B 100%)',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <PageGridOverlay opacity={0.42} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={3} alignItems={{ xs: 'center', md: 'flex-start' }}>
              <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography
                  variant="overline"
                  sx={sectionKickerSx}
                >
                  AC Elite Simracing
                </Typography>

                <Typography
                  variant={isMdUp ? 'h2' : 'h3'}
                  sx={{
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textShadow: '0 0 16px rgba(0,0,0,0.72), 0 0 36px rgba(15,23,42,0.92)',
                  }}
                >
                  Track your{' '}
                  <Box
                    component="span"
                    sx={{
                      color: 'rgba(255,255,255,0.97)',
                      fontWeight: 900,
                      animation: `${heroKeywordPulse} 5.2s ease-in-out infinite`,
                      ...reducedMotionNone,
                    }}
                  >
                    stats
                  </Box>
                  .
                  <br />
                  Dominate the{' '}
                  <Box
                    component="span"
                    sx={{
                      color: 'rgba(255,255,255,0.98)',
                      fontWeight: 900,
                      animation: `${heroKeywordPulse} 5.2s ease-in-out 1.2s infinite, ${heroWordShimmer} 5.5s ease-in-out 1.2s infinite`,
                      textShadow: '0 0 28px rgba(255,255,255,0.16)',
                      ...reducedMotionNone,
                    }}
                  >
                    leaderboard.
                  </Box>
                </Typography>

                <Typography variant="body1" sx={{ maxWidth: 540, color: 'text.secondary' }}>
                Live drivers, live stats, real-time progress from AC Elite.
                </Typography>
              </Stack>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                flexWrap="wrap"
                alignItems={{ xs: 'center', sm: 'center' }}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
                sx={{ width: '100%' }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    px: 3.5,
                    borderRadius: 3,
                    minHeight: { xs: 46, sm: 48 },
                    width: { xs: '100%', sm: 'auto' },
                    maxWidth: { xs: 320, sm: 'none' },
                    animation: `${heroPrimaryPulse} 4.5s ease-in-out infinite`,
                    ...reducedMotionNone,
                  }}
                  href="https://discord.gg/d2EbxGYBbj"
                  target="_blank"
                  rel="noreferrer"
                >
                  Join the community
                </Button>

              </Stack>

            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                ...GLASS_PANEL_SX,
                textAlign: { xs: 'center', md: 'left' },
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={sectionKickerSx}
                  >
                    Race Intelligence
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.4 }}>
                    One view. All key data.
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Live KMR-powered insights for driver search, safety rating, and license progression.
                  </Typography>
                </Box>

                <Box
                  sx={{
                    ...GLASS_INNER_PANEL_SX,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        bgcolor: syncStatus.color,
                        boxShadow: `0 0 0 3px ${syncStatus.color}22`,
                      }}
                    />
                    <Typography sx={{ fontWeight: 800, color: syncStatus.color }}>
                      {syncStatus.label}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      • Data sync {syncStatus.ageText}
                    </Typography>
                  </Stack>
                </Box>

                <Grid container spacing={1}>
                  {[
                    { label: 'Total drivers', value: formatNumber(totalDrivers) },
                    { label: 'Logged laps', value: formatNumber(totalLaps) },
                    { label: 'Active tracks', value: formatNumber(activeTracks) },
                    { label: 'Driver search', value: 'Steam64 + name' },
                  ].map((item) => (
                    <Grid key={item.label} size={{ xs: 6 }}>
                      <Box
                        sx={{
                          ...GLASS_INNER_PANEL_SX,
                          minHeight: 78,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: { xs: 'center', md: 'flex-start' },
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.68)' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25, mt: 0.2 }}>
                          {item.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            mt: { xs: 4, md: 4 },
            mb: 0,
            borderRadius: 2.5,
            px: { xs: 2, md: 2.5 },
            py: { xs: 1.5, md: 1.75 },
            border: '1px solid rgba(245,196,53,0.45)',
            background:
              'linear-gradient(135deg, rgba(245,196,53,0.2) 0%, rgba(245,196,53,0.08) 42%, rgba(31,44,73,0.34) 100%), rgba(15,23,42,0.48)',
            backdropFilter: 'blur(12px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
          }}
        >
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', textAlign: { xs: 'center', md: 'left' } }}>
            <Box component="span" sx={{ fontWeight: 800, color: '#f6d365' }}>
              Note:
            </Box>{' '}
            License and Safety Rating calculations are currently work in progress. Values and thresholds may change
            while we continue tuning.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}

function DriverSearchSection({
  drivers,
  loading,
  error,
}: {
  drivers: DriverView[];
  loading: boolean;
  error: string | null;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return drivers
      .filter((driver) => driver.name.toLowerCase().includes(q) || driver.guid.includes(q))
      .slice(0, 8);
  }, [drivers, query]);

  return (
    <Box
      id="driver-search"
      component="section"
      sx={{
        position: 'relative',
        py: 4,
        background: 'linear-gradient(180deg, rgba(31,44,73,0.98) 0%, rgba(23,33,59,0.98) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3} sx={{ mb: 3, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
          <Stack spacing={1} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
            <Typography variant="overline" sx={sectionKickerSx}>
              Driver statistics
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Search drivers and view their profile
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 680, color: 'text.secondary' }}>
              This search uses live AC Elite data with real-time Safety Rating and License calculations.
            </Typography>
          </Stack>
        </Stack>

        <Paper
          elevation={0}
          sx={{
            ...GLASS_PANEL_SX,
            mb: { xs: 2, md: 4 },
            textAlign: { xs: 'center', md: 'left' },
          }}
        >
          <Grid container spacing={2} alignItems="stretch">
            <Grid size={{ xs: 12, md: 9 }}>
              <Stack spacing={1.5} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Search driver
                </Typography>

                <TextField
                  fullWidth
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                  }}
                  placeholder="Driver name or Steam64 ID..."
                  variant="outlined"
                  size="medium"
                  autoComplete="off"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'rgba(13,27,56,0.72)',
                      color: '#fff',
                      backdropFilter: 'blur(10px)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.26)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.42)',
                      },
                      '&.Mui-focused': {
                        boxShadow: '0 0 0 3px rgba(147, 197, 253, 0.28)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(191,225,255,0.92)',
                        borderWidth: 2,
                      },
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
                      ...GLASS_CARD_SX,
                      mt: 1,
                      borderRadius: 2,
                      maxHeight: 280,
                      overflowY: 'auto',
                      boxShadow: '0 8px 26px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                  >
                    <List dense disablePadding>
                      {matches.map((driver) => (
                        <ListItemButton
                          key={driver.guid}
                          onClick={() => {
                            window.location.href = getDriverProfileHref(driver.guid);
                          }}
                          sx={{
                            px: 1.75,
                            py: 1,
                            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                                <Typography variant="body2">{driver.name}</Typography>
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
                            secondary={
                              <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {driver.guid}
                              </Typography>
                            }
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                )}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <Stack spacing={1.25} sx={{ height: 1, alignItems: { xs: 'center', md: 'stretch' } }}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ minHeight: 50, borderRadius: 2 }}
                  href={`${APP_BASE_URL}dashboard`}
                >
                  Open full stats page
                </Button>

                <Box
                  sx={{
                    ...GLASS_INNER_PANEL_SX,
                  }}
                >
                  <Stack spacing={0.35}>
                    <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                      Drivers loaded
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {loading ? '...' : formatNumber(drivers.length)}
                    </Typography>
                  </Stack>
                </Box>

                {loading && <Typography color="text.secondary">Loading drivers...</Typography>}
                {error && <Typography color="error">Failed to load driver data: {error}</Typography>}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}

function DashboardSection({ drivers }: { drivers: DriverView[] }) {
  const topSr = useMemo(
    () =>
      drivers
        .filter((driver) => driver.kilometers >= 500)
        .sort((a, b) => b.safety - a.safety)[0],
    [drivers]
  );
  const topPace = useMemo(
    () => [...drivers].sort((a, b) => b.paceScore - a.paceScore)[0],
    [drivers]
  );
  const mostActive = useMemo(
    () => [...drivers].sort((a, b) => b.kilometers - a.kilometers)[0],
    [drivers]
  );

  return (
    <Box
      id="dashboard"
      component="section"
      sx={{
        position: 'relative',
        py: 4,
        background: 'radial-gradient(circle at 50% 0%, rgba(23,33,59,0.18) 0, transparent 60%), #17213B',
        overflow: 'hidden',
      }}
    >
      <PageGridOverlay opacity={0.2} />

      <Container maxWidth="lg">
        <Stack spacing={3} sx={{ mb: { xs: 2, md: 4 }, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
          <Typography variant="overline" sx={sectionKickerSx}>
            Community highlights
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Real-time summary from live data
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 640, color: 'text.secondary' }}>
            Live community highlights based on current AC Elite performance data.
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {[
            {
              title: 'Top Safety Driver',
              value: topSr ? `${topSr.name} (${topSr.safetyTier} | ${topSr.safety.toFixed(2)})` : 'No data',
              detail: topSr ? `Total KM: ${formatNumber(Math.round(topSr.kilometers))}` : 'Waiting for data',
            },
            {
              title: 'Highest Pace Score',
              value: topPace ? `${topPace.name} (${topPace.license})` : 'No data',
              detail: topPace ? `Score: ${formatNumber(Math.round(topPace.paceScore))}` : 'Waiting for data',
            },
            {
              title: 'Most Active Driver',
              value: mostActive ? mostActive.name : 'No data',
              detail: mostActive ? `${formatNumber(Math.round(mostActive.kilometers))} km driven` : 'Waiting for data',
            },
          ].map((card) => (
            <Grid key={card.title} size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  ...GLASS_PANEL_SX,
                  textAlign: { xs: 'center', md: 'left' },
                }}
              >
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {card.title}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {card.detail}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoles>(EMPTY_TEAM_ROLES);
  const [metadata, setMetadata] = useState<SiteMetadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, roles, meta] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<TeamRoles>('/data/team-roles.json'),
          fetchJson<SiteMetadata>('/data/metadata.json'),
        ]);

        if (!mounted) return;
        setRankData(rank);
        setTeamRoles(roles);
        setMetadata(meta);
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
        content="AC Elite | Simracing community. Track your stats, search drivers, and compete on leaderboards."
      />
      <meta property="og:title" content="AC Elite | Simracing Community" />
      <meta property="og:description" content="Track your stats, search drivers, and compete on leaderboards." />
      <meta property="og:url" content="https://ac-elite.github.io/" />

      <HeroSection
        totalDrivers={community.totalDrivers}
        totalLaps={community.totalLaps}
        activeTracks={community.activeTracks}
        syncStatus={syncStatus}
      />
      <DriverSearchSection
        drivers={drivers}
        loading={loading}
        error={error}
      />
      <DashboardSection drivers={drivers} />
    </>
  );
}

