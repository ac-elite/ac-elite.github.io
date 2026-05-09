import { useLocation, Navigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { GLASS_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { ACTION_CONTAINED_PRIMARY_SMALL_SX } from 'src/lib/page-shell';

import { useAuth, hasAtLeastRole, type AppRole } from './auth-context';

// ----------------------------------------------------------------------

type AuthGateProps = {
  /** Minimum role required to view the children. Defaults to `moderator`. */
  minRole?: AppRole;
  children: React.ReactNode;
};

/**
 * Client-side gate around protected pages. Redirects to `/login` when the user
 * is not signed in, and shows a clear "not enough permission" message when the
 * user is signed in but their role is below the requested level.
 *
 * Note: this is a UX gate — the *real* permission boundary is the RLS policies
 * on the database. Anything sensitive must also be enforced there.
 */
export function AuthGate({ minRole = 'moderator', children }: AuthGateProps) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.configured) {
    return (
      <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Auth not configured
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
          <code>.env</code>, then restart the dev server.
        </Typography>
      </Paper>
    );
  }

  if (auth.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <LinearProgress sx={{ width: 240 }} />
      </Box>
    );
  }

  if (!auth.user) {
    return <Navigate to={APP_ROUTES.login} replace state={{ from: location.pathname }} />;
  }

  if (auth.error) {
    return (
      <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), p: 3 }}>
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          {auth.error}
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => void auth.signOut()}
            sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
          >
            Sign out
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (!hasAtLeastRole(auth.profile, minRole)) {
    return (
      <Paper sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Not enough permission
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          Your account ({auth.profile?.role ?? 'no role'}) cannot view this page. This
          area requires <strong>{minRole}</strong> or higher. Ask the owner if you think
          this is wrong.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => void auth.signOut()}
            sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
          >
            Sign out
          </Button>
        </Stack>
      </Paper>
    );
  }

  return <>{children}</>;
}
