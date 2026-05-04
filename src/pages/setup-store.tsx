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
import { SITE_PREVIEW } from 'src/site-manual-config';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_SX, GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { DATA_PAGE_SHELL_SX, ACTION_PRIMARY_SMALL_SX, HERO_FOOTNOTE_CAPTION_SX } from 'src/lib/page-shell';

import { PreviewLock } from 'src/components/preview-lock/preview-lock';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

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

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Box sx={softFloatWrapperSx()}>
              <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                  <Typography variant="h4" fontWeight={800}>
                    Setup Store
                  </Typography>
                  <Typography color="text.secondary">
                    Private preview for mod team feedback — mock listings until the store goes live.
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(147,197,253,0.92)', fontWeight: 700 }}>
                    Preview · mock data
                  </Typography>
                  <Typography variant="caption" sx={{ ...HERO_FOOTNOTE_CAPTION_SX }}>
                    Nothing here is tied to live race data; unlock below to browse placeholder setups and test layout.
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <PreviewLock
              storageKey={SITE_PREVIEW.setupStore.storageKey}
              password={SITE_PREVIEW.setupStore.password}
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
                          sx={{ ...ACTION_PRIMARY_SMALL_SX, px: 2.25, borderRadius: 2.4 }}
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
