import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

/**
 * Muted footer link to /admin for moderators — not meant to compete with main nav.
 */
export function ModTeamAdminLink() {
  const pathname = usePathname();
  if (pathname === '/admin' || pathname.endsWith('/admin')) {
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
        href="/admin"
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
