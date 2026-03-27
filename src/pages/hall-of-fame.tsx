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
import { GLASS_PANEL_SX, GLASS_INNER_ROW_SX } from 'src/lib/glass';
import { type TeamRoles, EMPTY_TEAM_ROLES } from 'src/lib/team-roles';
import {
  CAR,
  type CarLap,
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
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

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
  const { openGuide } = useLicenseSafetyGuide();

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_SX,
        height: '100%',
        textAlign: { xs: 'center', md: 'left' },
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
                ...GLASS_INNER_ROW_SX,
              }}
            >
              <Stack spacing={0.8}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'auto minmax(0, 1fr) auto' },
                    alignItems: 'center',
                    gap: 1,
                    justifyItems: { xs: 'center', md: 'stretch' },
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

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: { xs: 'center', md: 'left' } }} noWrap>
                    {entry.name}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      justifyContent: { xs: 'center', md: 'flex-end' },
                    }}
                  >
                    <Chip
                      size="small"
                      label={entry.license}
                      onClick={(e) => { e.stopPropagation(); openGuide('license'); }}
                      sx={{
                        minWidth: LICENSE_CHIP_WIDTH,
                        justifyContent: 'center',
                        fontWeight: 700,
                        cursor: 'pointer',
                        ...getLicenseBadgeSx(entry.license),
                      }}
                    />
                    <Chip
                      size="small"
                      label={entry.srTier}
                      onClick={(e) => { e.stopPropagation(); openGuide('safety'); }}
                      sx={{
                        minWidth: SR_CHIP_WIDTH,
                        justifyContent: 'center',
                        fontWeight: 700,
                        cursor: 'pointer',
                        ...getSRBadgeSx(entry.srTier),
                      }}
                    />
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: { xs: 'center', md: 'space-between' },
                    gap: 1,
                    flexWrap: 'wrap',
                    textAlign: { xs: 'center', md: 'left' },
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
  allDrivers: RankDriver[];
}) {
  const { openGuide } = useLicenseSafetyGuide();
  const byGuid = useMemo(() => new Map(allDrivers.map((d) => [d.guid, d])), [allDrivers]);
  const licenseMap = useMemo(() => computeLicenseMap(allDrivers), [allDrivers]);

  const members = useMemo(
    () =>
      guids
        .map((guid) => byGuid.get(guid))
        .filter((driver): driver is RankDriver => Boolean(driver))
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
        ...GLASS_PANEL_SX,
        height: '100%',
        textAlign: { xs: 'center', md: 'left' },
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
              ...GLASS_INNER_ROW_SX,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, textAlign: { xs: 'center', md: 'left' } }}>
              {member.name}
            </Typography>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'center', md: 'flex-start' }} sx={{ mt: 0.6 }}>
              <Chip
                size="small"
                label={member.license}
                onClick={(e) => { e.stopPropagation(); openGuide('license'); }}
                sx={{
                  minWidth: LICENSE_CHIP_WIDTH,
                  justifyContent: 'center',
                  fontWeight: 700,
                  cursor: 'pointer',
                  ...getLicenseBadgeSx(member.license),
                }}
              />
              <Chip
                size="small"
                label={member.srTier}
                onClick={(e) => { e.stopPropagation(); openGuide('safety'); }}
                sx={{
                  minWidth: SR_CHIP_WIDTH,
                  justifyContent: 'center',
                  fontWeight: 700,
                  cursor: 'pointer',
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
  const [drivers, setDrivers] = useState<RankDriver[]>([]);
  const [teamRoles, setTeamRoles] = useState<TeamRoles>(EMPTY_TEAM_ROLES);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, roles] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
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
          const carData = (cars as Record<string, CarLap> | undefined)?.[CAR];
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
      <meta property="og:title" content="Hall of Fame - AC Elite" />
      <meta property="og:description" content="AC Elite Hall of Fame with standout drivers and team members." />
      <meta property="og:url" content="https://ac-elite.github.io/hall-of-fame" />

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
            <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
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

                <Box sx={{ pt: 1, textAlign: { xs: 'center', md: 'left' } }}>
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
