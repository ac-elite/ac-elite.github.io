import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { CAR } from 'src/lib/ac-elite-data';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_SX, GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';

import { PreviewLock } from 'src/components/preview-lock/preview-lock';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

/** Preview gate (client-side only; edit here to rotate). */
const SETUP_STORE_PREVIEW_PASSWORD = 'acelite-setup-store';

const mockSetups = [
  {
    name: 'Aggressive Qualy',
    car: CAR,
    track: 'Imola',
    author: 'Grimlord',
    type: 'Qualy',
    description: 'Fast one-lap setup with sharp front end and late-brake balance.',
  },
  {
    name: 'Race Long Stint',
    car: CAR,
    track: 'Spa',
    author: 'DIEnamic',
    type: 'Race',
    description: 'Stable race setup tuned for consistency and tyre life over long runs.',
  },
  {
    name: 'Wet Safety Base',
    car: CAR,
    track: 'Silverstone',
    author: 'CarterReza',
    type: 'Race',
    description: 'Safe baseline for wet sessions with predictable traction on exits.',
  },
  {
    name: 'Balanced Sprint',
    car: CAR,
    track: 'Barcelona',
    author: 'olaelekzion810',
    type: 'Race',
    description: 'All-round setup for short races with strong mid-corner stability.',
  },
  {
    name: 'Low Drag Rocket',
    car: CAR,
    track: 'Monza',
    author: 'Oliver Bell',
    type: 'Qualy',
    description: 'Low-drag top-speed setup built for fast straights and late braking.',
  },
] as const;

export default function Page() {
  return (
    <>
      <title>{`Setup Store - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="AC Elite setup store: community Assetto Corsa car setups (preview). Browse qualy, race and wet baselines."
      />
      <meta property="og:title" content={`Setup Store - ${CONFIG.appName}`} />
      <meta
        property="og:description"
        content="AC Elite setup store: community Assetto Corsa car setups (preview). Browse qualy, race and wet baselines."
      />
      <meta property="og:url" content="https://ac-elite.github.io/setup-store" />

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
            <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
              <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="h4" fontWeight={800}>
                  Setup Store
                </Typography>
                <Typography color="text.secondary">
                  Private preview for mod team feedback — mock listings until the store goes live.
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.52)', maxWidth: 640, lineHeight: 1.55 }}>
                  Nothing here is tied to live race data; unlock below to browse placeholder setups and test layout.
                </Typography>
              </Stack>
            </Box>

            <PreviewLock
              storageKey="acelite-preview-setup-store"
              password={SETUP_STORE_PREVIEW_PASSWORD}
              title="Setup Store Preview Locked"
              description="This section is in preview state with mock data."
            >
              <Grid container spacing={2}>
                {mockSetups.map((setup, i) => (
                  <Grid key={`${setup.name}-${setup.track}`} size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_COMPACT_SX,
                        ...brandAccentBorderSx(),
                        ...glassCardMotionSx(1 + i),
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <Stack spacing={1} sx={{ height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {setup.name}
                        </Typography>
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack spacing={1}>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {setup.track} - {setup.car}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#dbeafe' }}>
                              {setup.description}
                            </Typography>
                            <Chip size="small" label={setup.type} sx={{ width: 'fit-content', fontWeight: 700 }} />
                            <Typography variant="body2" sx={{ color: '#dbeafe' }}>
                              By {setup.author}
                            </Typography>
                          </Stack>
                        </Box>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          fullWidth
                          sx={{ px: 2.25, borderRadius: 2.4 }}
                        >
                          Buy
                        </Button>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </PreviewLock>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
