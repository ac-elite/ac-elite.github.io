import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { AuthGate } from 'src/lib/auth/auth-gate';
import { GLASS_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';

import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

// ----------------------------------------------------------------------

export type AdminPageShellProps = {
  /** Tab title (rendered as the page heading and document title). */
  title: string;
  /** Short helper text shown under the heading. */
  description?: string;
  /** Used in the <title>; falls back to `title`. */
  documentTitle?: string;
  children: React.ReactNode;
};

/**
 * Shared chrome for every admin sub-page: brand background, header card with
 * the per-page heading, and an `AuthGate` so each page enforces the same role
 * check. Sidebar already provides the cross-section navigation and the
 * "signed in as" indicator.
 */
export function AdminPageShell({ title, description, documentTitle, children }: AdminPageShellProps) {
  const docTitle = documentTitle ?? title;

  return (
    <>
      <title>{`${docTitle} - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite team page — admin tools." />
      <meta name="robots" content="noindex, nofollow" />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Box sx={softFloatWrapperSx()}>
              <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                <Stack
                  spacing={0.75}
                  sx={{
                    textAlign: { xs: 'center', md: 'left' },
                    alignItems: { xs: 'center', md: 'flex-start' },
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'rgba(191,219,254,0.85)', fontWeight: 800, letterSpacing: '0.16em' }}>
                    Admin Panel
                  </Typography>
                  <Typography component="h1" variant="h4" fontWeight={800}>
                    {title}
                  </Typography>
                  {description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {description}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Box>

            <AuthGate minRole="moderator">
              <Stack spacing={3}>{children}</Stack>
            </AuthGate>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
