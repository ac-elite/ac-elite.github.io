import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

import { useAuth } from 'src/lib/auth/auth-context';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

/**
 * Sidebar entry point to the team area. Renders a clear "Sign in" button when
 * no one is signed in; hides itself entirely once a session exists, because
 * the `SessionBar` then sits in the same sidebar slot and already exposes the
 * role + sign-out action.
 */
export function ModTeamAdminLink() {
  const auth = useAuth();
  const pathname = usePathname();

  // Logged in: the SessionBar covers this slot already.
  if (auth.user) return null;

  // Already on the login page — no need to repeat the entry point.
  if (pathname === APP_ROUTES.login) return null;

  return (
    <Box sx={{ px: 1, py: 1 }}>
      <Button
        component={RouterLink}
        href={APP_ROUTES.login}
        variant="outlined"
        fullWidth
        size="small"
        startIcon={<Icon icon="solar:login-3-linear" width={16} />}
        sx={{
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'rgba(226,232,240,0.92)',
          borderColor: 'rgba(148,163,184,0.4)',
          bgcolor: 'rgba(15,23,42,0.45)',
          textTransform: 'none',
          '&:hover': {
            borderColor: 'rgba(191,219,254,0.7)',
            color: '#fff',
            bgcolor: 'rgba(96,165,250,0.12)',
          },
        }}
      >
        Sign in
      </Button>
    </Box>
  );
}
