import { useMemo, useState, useEffect } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';
import { getSiteUrl } from 'src/centralized/site-urls';
import { SITE_TEAM_ROLES } from 'src/site-manual-config';
import {
  GLASS_PANEL_SX,
  GLASS_INNER_ROW_SX,
  getTintedGlassPanelSx,
  getTintedGlassInnerRowSx,
} from 'src/lib/glass';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { subtleEnterUpSx, glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { BRAND_ACCENT, roleAccentBorderSx, brandAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
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

import { Reveal } from 'src/components/reveal';
import { EmptyState, ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { DataPageHeader } from 'src/components/data-page-header/data-page-header';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
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

/** Matches Discord role chip gradients in `ROLE_CHIP_SX` (Creator / Admin / Moderator). */
const TEAM_SPOTLIGHT_ACCENTS: Record<string, string> = {
  Creators: '#ED4245',
  Admins: '#A855F7',
  Moderators: '#22C55E',
};

function CategoryCard({
  title,
  description,
  entries,
  enterIndex = 1,
}: {
  title: string;
  description: string;
  entries: FameEntry[];
  enterIndex?: number;
}) {
  const { openGuide } = useLicenseSafetyGuide();

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_SX,
        ...brandAccentBorderSx(),
        ...glassCardMotionSx(enterIndex),
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
                ...subtleEnterUpSx(index, { baseDelayMs: 320 + enterIndex * 36 }),
                cursor: 'pointer',
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
  enterIndex = 7,
}: {
  title: string;
  guids: string[];
  allDrivers: RankDriver[];
  enterIndex?: number;
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

  const accent = TEAM_SPOTLIGHT_ACCENTS[title] ?? BRAND_ACCENT;

  return (
    <Paper
      sx={[
        GLASS_PANEL_SX,
        roleAccentBorderSx(accent),
        statusAccentSplitRimSx(accent),
        getTintedGlassPanelSx(accent),
        glassCardMotionSx(enterIndex),
        {
          height: '100%',
          textAlign: { xs: 'center', md: 'left' },
        },
      ] as SxProps<Theme>}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.25 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {members.length === 0 && (
          <EmptyState
            title="No members found in current data."
            description="Team roster GUIDs are matched to synced drivers; if someone is missing from rank.json, they will not appear here."
          />
        )}
        {members.map((member, mi) => (
          <Box
            key={`${title}-${member.guid}`}
            onClick={() => {
              window.location.href = getDriverProfileHref(member.guid);
            }}
            sx={[
              GLASS_INNER_ROW_SX,
              getTintedGlassInnerRowSx(accent),
              subtleEnterUpSx(mi, { baseDelayMs: 380 }),
              { cursor: 'pointer' },
            ] as SxProps<Theme>}
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
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  const teamRoles = SITE_TEAM_ROLES;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, meta] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchJson<SiteMetadata>(DATA_FILES.metadata).catch(() => ({})),
        ]);
        if (!mounted) return;
        setDrivers(rank);
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

  const syncHealth = useMemo(
    () => getSyncHealth(getEffectiveLastSync(metadata?.lastSync, drivers)),
    [metadata?.lastSync, drivers]
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
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.hallOfFame)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <DataPageHeader
              title="Hall of Fame"
              description="Standout drivers, iconic stats, and the AC Elite team behind the community."
              syncHealth={syncHealth}
            >
              {drivers.length > 0 && (
                <Box sx={{ pt: 0.5 }}>
                  <TrendWindowStats variant="community" rankData={drivers} />
                </Box>
              )}
            </DataPageHeader>

            {loading && (
              <LoadingPanel title="Loading Hall of Fame…" message="Loading drivers, spotlight stats, and team roster matches.">
                <Grid container spacing={2.5}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Grid key={i} size={{ xs: 12, md: 6 }}>
                      <Skeleton variant="rounded" height={220} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                    </Grid>
                  ))}
                </Grid>
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Grid container spacing={2.5}>
                  {categories.map((category, categoryIndex) => (
                    <Grid key={category.title} size={{ xs: 12, md: 6 }}>
                      <Reveal index={categoryIndex % 2} sx={{ height: 1 }}>
                        <CategoryCard
                          title={category.title}
                          description={category.description}
                          entries={category.entries}
                          enterIndex={1 + categoryIndex}
                        />
                      </Reveal>
                    </Grid>
                  ))}
                </Grid>

                <Stack spacing={2}>
                  <Box sx={softFloatWrapperSx()}>
                    <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(6) }}>
                      <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Team Spotlight
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          The people who keep AC Elite running — by role.
                        </Typography>
                      </Stack>
                    </Box>
                  </Box>
                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Creators" guids={teamRoles.creator} allDrivers={drivers} enterIndex={7} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Admins" guids={teamAdmins} allDrivers={drivers} enterIndex={8} />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TeamRoleColumn title="Moderators" guids={teamModerators} allDrivers={drivers} enterIndex={9} />
                    </Grid>
                  </Grid>
                </Stack>
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
