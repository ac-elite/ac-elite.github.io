import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

/**
 * Muted footer link to /admin — not meant to compete with main nav.
 * Always visible; the admin route itself is gated by `AuthGate`.
 */
export function ModTeamAdminLink() {
  const pathname = usePathname();
  if (pathname === APP_ROUTES.admin || pathname.endsWith(APP_ROUTES.admin)) {
    return null;
  }

  return (
    <Box
      sx={{
        px: 1.5,
        pt: 0.25,
        pb: 0.25,
        textAlign: 'center',
      }}
    >
      <Link
        component={RouterLink}
        href={APP_ROUTES.admin}
        underline="hover"
        sx={{
          color: 'rgba(255,255,255,0.22)',
          fontSize: '0.65rem',
          fontWeight: 500,
          letterSpacing: '0.06em',
          lineHeight: 1.4,
          transition: (theme) =>
            theme.transitions.create(['color'], { duration: theme.transitions.duration.shorter }),
          '&:hover': {
            color: 'rgba(255,255,255,0.42)',
            textUnderlineOffset: 2,
          },
        }}
      >
        Admin Panel
      </Link>
    </Box>
  );
}
