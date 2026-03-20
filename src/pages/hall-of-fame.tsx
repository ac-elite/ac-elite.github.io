import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import {
  CAR,
  getDriverSR,
  formatNumber,
  getSRBadgeSx,
  SR_CHIP_WIDTH,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
} from 'src/lib/ac-elite-data';

import { ErrorPanel } from 'src/components/data-state/error-panel';
import { LoadingPanel } from 'src/components/data-state/loading-panel';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

type TeamRoles = {
  creator: string[];
  admin: string[];
  moderator: string[];
};

type DriverWithStats = RankDriver & {
  wins?: number;
  podiums?: number;
  poles?: number;
  flaps?: number;
};

type FameEntry = {
  guid: string;
  name: string;
  value: string;
  secondary?: string;
  license: string;
  srTier: string;
};

function CategoryCard({
  title,
  description,
  entries,
}: {
  title: string;
  description: string;
  entries: FameEntry[];
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            {description}
          </Typography>
        </Box>

        <Stack spacing={1}>
          {entries.map((entry, index) => (
            <Box
              key={`${entry.guid}-${title}`}
              onClick={() => {
                window.location.href = getDriverProfileHref(entry.guid);
              }}
              sx={{
                borderRadius: 2,
                px: 1.2,
                py: 1,
                border: '1px solid rgba(148,163,184,0.28)',
                bgcolor: 'rgba(12,24,49,0.45)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                '&:hover': {
                  bgcolor: 'rgba(15,30,58,0.58)',
                  borderColor: 'rgba(191,225,255,0.36)',
                },
              }}
            >
              <Stack spacing={0.8}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Chip
                    size="small"
                    label={`#${index + 1}`}
                    sx={{
                      minWidth: 40,
                      fontWeight: 700,
                      bgcolor: 'rgba(255,255,255,0.12)',
                      color: '#fff',
                    }}
                  />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                    {entry.name}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Chip
                      size="small"
                      label={entry.license}
                      sx={{
                        minWidth: LICENSE_CHIP_WIDTH,
                        justifyContent: 'center',
                        fontWeight: 700,
                        ...getLicenseBadgeSx(entry.license),
                      }}
                    />
                    <Chip
                      size="small"
                      label={entry.srTier}
                      sx={{
                        minWidth: SR_CHIP_WIDTH,
                        justifyContent: 'center',
                        fontWeight: 700,
                        ...getSRBadgeSx(entry.srTier),
                      }}
                    />
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                    {entry.value}
                  </Typography>
                  {entry.secondary && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {entry.secondary}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}

function TeamRoleColumn({
  title,
  guids,
  allDrivers,
}: {
  title: string;
  guids: string[];
  allDrivers: DriverWithStats[];
}) {
  const byGuid = useMemo(() => new Map(allDrivers.map((d) => [d.guid, d])), [allDrivers]);
  const licenseMap = useMemo(() => computeLicenseMap(allDrivers), [allDrivers]);

  const members = useMemo(
    () =>
      guids
        .map((guid) => byGuid.get(guid))
        .filter((driver): driver is DriverWithStats => Boolean(driver))
        .map((driver) => {
          const license = getDriverLicense(driver, licenseMap).license;
          const sr = getDriverSR(driver);
          return {
            guid: driver.guid,
            name: driver.name || 'Unknown',
            license,
            srTier: sr.tier,
          };
        }),
    [byGuid, guids, licenseMap]
  );

  return (
    <Paper
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.25 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {members.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No members found in current data.
          </Typography>
        )}
        {members.map((member) => (
          <Box
            key={`${title}-${member.guid}`}
            onClick={() => {
              window.location.href = getDriverProfileHref(member.guid);
            }}
            sx={{
              borderRadius: 2,
              px: 1.2,
              py: 1,
              border: '1px solid rgba(148,163,184,0.28)',
              bgcolor: 'rgba(12,24,49,0.45)',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              '&:hover': {
                bgcolor: 'rgba(15,30,58,0.58)',
                borderColor: 'rgba(191,225,255,0.36)',
              },
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {member.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.6 }}>
              <Chip
                size="small"
                label={member.license}
                sx={{
                  minWidth: LICENSE_CHIP_WIDTH,
                  justifyContent: 'center',
                  fontWeight: 700,
                  ...getLicenseBadgeSx(member.license),
                }}
              />
              <Chip
                size="small"
                label={member.srTier}
                sx={{
                  minWidth: SR_CHIP_WIDTH,
                  justifyContent: 'center',
                  fontWeight: 700,
                  ...getSRBadgeSx(member.srTier),
                }}
              />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoles>({ creator: [], admin: [], moderator: [] });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, roles] = await Promise.all([
          fetchJson<DriverWithStats[]>('/data/rank.json'),
          fetchJson<TeamRoles>('/data/team-roles.json'),
        ]);
        if (!mounted) return;
        setDrivers(rank);
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

  const licenseMap = useMemo(() => computeLicenseMap(drivers), [drivers]);

  const driverView = useMemo(
    () =>
      drivers.map((driver) => {
        const sr = getDriverSR(driver);
        const license = getDriverLicense(driver, licenseMap).license;

        let totalLaps = 0;
        let tracksDriven = 0;
        for (const [, cars] of Object.entries(driver.leaderboard || {})) {
          const carData = cars?.[CAR];
          if (!carData) continue;
          totalLaps += carData.laps || 0;
          if (typeof carData.laptime === 'number') tracksDriven += 1;
        }

        return {
          guid: driver.guid,
          name: driver.name || 'Unknown',
          kilometers: driver.kilometers || 0,
          collisions: driver.collisions || 0,
          infractions: driver.infr || 0,
          wins: driver.wins || 0,
          podiums: driver.podiums || 0,
          poles: driver.poles || 0,
          flaps: driver.flaps || 0,
          laps: totalLaps,
          tracksDriven,
          license,
          srTier: sr.tier,
          srValue: sr.sr,
        };
      }),
    [drivers, licenseMap]
  );

  const categories = useMemo(
    () => [
      {
        title: 'Distance Kings',
        description: 'Most total km driven on AC Elite.',
        entries: [...driverView]
          .sort((a, b) => b.kilometers - a.kilometers)
          .slice(0, 3)
          .map((d) => ({
          guid: d.guid,
          name: d.name,
          value: `${formatNumber(Math.round(d.kilometers))} km`,
          secondary: `${formatNumber(d.laps)} laps`,
          license: d.license,
          srTier: d.srTier,
          })),
      },
      {
        title: 'Clean Air Masters',
        description: 'Highest Safety Rating among active distance drivers.',
        entries: [...driverView]
          .filter((d) => d.kilometers >= 1000)
          .sort((a, b) => b.srValue - a.srValue)
          .slice(0, 3)
          .map((d) => ({
            guid: d.guid,
            name: d.name,
            value: `SR ${d.srValue.toFixed(2)}`,
            secondary: `${formatNumber(Math.round(d.kilometers))} km`,
            license: d.license,
            srTier: d.srTier,
          })),
      },
      {
        title: 'Victory Lane',
        description: 'Most wins in tracked sessions.',
        entries: [...driverView]
          .sort((a, b) => b.wins - a.wins)
          .slice(0, 3)
          .map((d) => ({
          guid: d.guid,
          name: d.name,
          value: `${formatNumber(d.wins)} wins`,
          secondary: `${formatNumber(d.podiums)} podiums`,
          license: d.license,
          srTier: d.srTier,
          })),
      },
      {
        title: 'Podium Club',
        description: 'Most overall podium finishes.',
        entries: [...driverView]
          .sort((a, b) => b.podiums - a.podiums)
          .slice(0, 3)
          .map((d) => ({
          guid: d.guid,
          name: d.name,
          value: `${formatNumber(d.podiums)} podiums`,
          secondary: `${formatNumber(d.wins)} wins`,
          license: d.license,
          srTier: d.srTier,
          })),
      },
      {
        title: 'Qualifying Beasts',
        description: 'Most pole positions.',
        entries: [...driverView]
          .sort((a, b) => b.poles - a.poles)
          .slice(0, 3)
          .map((d) => ({
          guid: d.guid,
          name: d.name,
          value: `${formatNumber(d.poles)} poles`,
          secondary: `${formatNumber(d.flaps)} fastest laps`,
          license: d.license,
          srTier: d.srTier,
          })),
      },
      {
        title: 'Fastest Lap Hunters',
        description: 'Most fastest laps recorded.',
        entries: [...driverView]
          .sort((a, b) => b.flaps - a.flaps)
          .slice(0, 3)
          .map((d) => ({
          guid: d.guid,
          name: d.name,
          value: `${formatNumber(d.flaps)} fastest laps`,
          secondary: `${formatNumber(d.wins)} wins`,
          license: d.license,
          srTier: d.srTier,
          })),
      },
    ],
    [driverView]
  );

  const teamAdmins = useMemo(
    () => teamRoles.admin.filter((guid) => !teamRoles.creator.includes(guid)),
    [teamRoles.admin, teamRoles.creator]
  );
  const teamModerators = useMemo(
    () => teamRoles.moderator.filter((guid) => !teamRoles.creator.includes(guid) && !teamRoles.admin.includes(guid)),
    [teamRoles.moderator, teamRoles.creator, teamRoles.admin]
  );

  return (
    <>
      <title>{`Hall of Fame - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite Hall of Fame with standout drivers and team members." />

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
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={800}>
                Hall of Fame
              </Typography>
              <Typography color="text.secondary">
                Standout drivers, iconic stats, and the AC Elite team behind the community.
              </Typography>
            </Stack>

            {loading && <LoadingPanel message="Loading Hall of Fame data..." />}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Grid container spacing={2.5}>
                  {categories.map((category) => (
                    <Grid key={category.title} size={{ xs: 12, md: 6 }}>
                      <CategoryCard
                        title={category.title}
                        description={category.description}
                        entries={category.entries}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Box sx={{ pt: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                    Team Spotlight
                  </Typography>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Creators" guids={teamRoles.creator} allDrivers={drivers} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Admins" guids={teamAdmins} allDrivers={drivers} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Moderators" guids={teamModerators} allDrivers={drivers} />
                    </Grid>
                  </Grid>
                </Box>
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
