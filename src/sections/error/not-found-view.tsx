import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { GLASS_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { getHomeHref, getPublicAssetHref } from 'src/lib/routes';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { PAGE_SURFACE_SX, NOT_FOUND_SUPPORTING_TEXT_SX, LINK_PRIMARY_CONTAINED_LARGE_SX } from 'src/lib/page-shell';

import { Logo } from 'src/components/logo';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

// ----------------------------------------------------------------------

export function NotFoundView() {
  return (
    <Box
      sx={{
        ...PAGE_SURFACE_SX,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        py: { xs: 8, md: 10 },
      }}
    >
      <PageGridOverlay />

      <Logo sx={{ position: 'fixed', top: 20, left: 20, zIndex: 2 }} />

      <Container
        maxWidth="md"
        sx={{
          position: 'relative',
          zIndex: 1,
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={3} alignItems="center" sx={{ width: 1, textAlign: 'center' }}>
          <Box sx={{ ...softFloatWrapperSx(), width: 1, maxWidth: 560 }}>
            <Box
              sx={{
                ...GLASS_PANEL_SX,
                ...brandAccentBorderSx(),
                ...glassCardMotionSx(0),
              }}
            >
              <Stack spacing={1} alignItems="center">
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 0.02 }}>
                  Wrong chicane
                </Typography>
                <Typography variant="body2" sx={{ ...NOT_FOUND_SUPPORTING_TEXT_SX }}>
                  Off track — this URL is not on our circuit. Check the address for typos, or head back to the pits and pick a page from the nav.
                </Typography>
              </Stack>
            </Box>
          </Box>

          <Box
            component="img"
            src={getPublicAssetHref('/assets/illustrations/illustration-404.svg')}
            alt=""
            sx={{
              width: { xs: 260, sm: 320 },
              height: 'auto',
              my: { xs: 2, sm: 3 },
            }}
          />

          <Button
            component={RouterLink}
            href={getHomeHref()}
            size="large"
            variant="contained"
            color="primary"
            sx={{ ...LINK_PRIMARY_CONTAINED_LARGE_SX }}
          >
            Back to home
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
