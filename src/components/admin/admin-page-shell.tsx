import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';
import { AuthGate } from 'src/lib/auth/auth-gate';
import { GLASS_PANEL_SX } from 'src/lib/glass';
import { ADMIN_SECTIONS } from 'src/centralized/admin-sections';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { DATA_PAGE_SHELL_SX } from 'src/lib/page-shell';

import { renderNavIcon } from 'src/components/icons/ac-dashboard-icons';
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
  /** Match the sidebar icon for this section so the hero mirrors the data pages. */
  const iconName = ADMIN_SECTIONS.find((section) => section.label === title)?.iconifyName;

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
                  <Stack
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    justifyContent={{ xs: 'center', md: 'flex-start' }}
                  >
                    {iconName && (
                      <Box
                        aria-hidden
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius: 1.4,
                          position: 'relative',
                          display: 'grid',
                          placeItems: 'center',
                          lineHeight: 0,
                          color: 'rgba(226,242,255,0.96)',
                          background:
                            'radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 46%, transparent 72%), rgba(255,255,255,0.045)',
                          border: '1px solid rgba(226,242,255,0.14)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                          '& .nav-glyph': {
                            position: 'absolute',
                            inset: 0,
                            display: 'grid',
                            placeItems: 'center',
                            lineHeight: 0,
                            transform: 'translate(var(--nav-icon-x, 0px), var(--nav-icon-y, 0px))',
                            pointerEvents: 'none',
                          },
                          '& svg': {
                            display: 'block',
                            width: 'var(--nav-icon-size, 25.5px)',
                            height: 'var(--nav-icon-size, 25.5px)',
                            overflow: 'visible',
                          },
                        }}
                      >
                        {renderNavIcon(iconName, true)}
                      </Box>
                    )}
                    <Typography component="h1" variant="h4" fontWeight={800}>
                      {title}
                    </Typography>
                  </Stack>
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
