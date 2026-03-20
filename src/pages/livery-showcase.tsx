import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { GLASS_PANEL_TIGHT_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';

import { PreviewLock } from 'src/components/preview-lock/preview-lock';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

const mockGeneralLiveries = [
  { name: 'General Midnight Blue', image: '/assets/illustrations/f1-livery-placeholder.svg' },
  { name: 'General Carbon Storm', image: '/assets/illustrations/f1-livery-placeholder.svg' },
  { name: 'General Silver Arrow', image: '/assets/illustrations/f1-livery-placeholder.svg' },
  { name: 'General Sunset Orange', image: '/assets/illustrations/f1-livery-placeholder.svg' },
] as const;

const mockModTeamLiveries = [
  { name: 'Creator Signature', owner: 'DIEnamic', image: '/assets/illustrations/f1-livery-placeholder.svg' },
  { name: 'Admin Tactical Blue', owner: 'Grimlord', image: '/assets/illustrations/f1-livery-placeholder.svg' },
  { name: 'Moderator Velocity', owner: 'CarterReza', image: '/assets/illustrations/f1-livery-placeholder.svg' },
] as const;

export default function Page() {
  return (
    <>
      <title>{`Livery Showcase - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite livery showcase preview." />

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
                Livery Showcase
              </Typography>
              <Typography color="text.secondary">
                Library preview with two livery groups: General and Mod Team.
              </Typography>
            </Stack>

            <PreviewLock
              storageKey="acelite-preview-livery-showcase"
              title="Livery Showcase Preview Locked"
              description="This page is currently a private mock preview"
            >
              <Stack spacing={3}>
                <Stack spacing={1.2}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    General liveries
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Default liveries randomly assigned to drivers who join with livery pack installed.
                  </Typography>
                  <Grid container spacing={2}>
                    {mockGeneralLiveries.map((livery) => (
                      <Grid key={livery.name} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          sx={{
                            ...GLASS_PANEL_TIGHT_SX,
                          }}
                        >
                          <Stack spacing={1}>
                            <Box
                              sx={{
                                ...GLASS_INNER_PANEL_SX,
                                width: '100%',
                                height: 170,
                                p: 0.6,
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  opacity: 0.26,
                                  backgroundImage:
                                    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                                  backgroundSize: '24px 24px, 24px 24px',
                                  pointerEvents: 'none',
                                },
                              }}
                            >
                              <Box
                                component="img"
                                src={livery.image}
                                alt={livery.name}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  position: 'relative',
                                  zIndex: 1,
                                }}
                              />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {livery.name}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>

                <Stack spacing={1.2}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Mod Team liveries
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Personal liveries made specifically for admins, moderators, and creators.
                  </Typography>
                  <Grid container spacing={2}>
                    {mockModTeamLiveries.map((livery) => (
                      <Grid key={`${livery.name}-${livery.owner}`} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          sx={{
                            ...GLASS_PANEL_TIGHT_SX,
                          }}
                        >
                          <Stack spacing={1}>
                            <Box
                              sx={{
                                ...GLASS_INNER_PANEL_SX,
                                width: '100%',
                                height: 170,
                                p: 0.6,
                                position: 'relative',
                                overflow: 'hidden',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  inset: 0,
                                  opacity: 0.26,
                                  backgroundImage:
                                    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                                  backgroundSize: '24px 24px, 24px 24px',
                                  pointerEvents: 'none',
                                },
                              }}
                            >
                              <Box
                                component="img"
                                src={livery.image}
                                alt={livery.name}
                                sx={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'contain',
                                  position: 'relative',
                                  zIndex: 1,
                                }}
                              />
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {livery.name}
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              For: {livery.owner}
                            </Typography>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Stack>
            </PreviewLock>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
