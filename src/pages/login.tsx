import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { CONFIG } from 'src/config-global';
import { useAuth } from 'src/lib/auth/auth-context';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { GLASS_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { DATA_PAGE_SHELL_SX, ACTION_CONTAINED_PRIMARY_SMALL_SX } from 'src/lib/page-shell';

import { Logo } from 'src/components/logo';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

// ----------------------------------------------------------------------

type LocationState = { from?: string } | null;

/**
 * Internal "domain" for our fake-email login. Supabase Auth requires an email-shaped
 * value, but the team should only have to type their username (`owner` / `admin` /
 * `moderator`) — we append this domain in code before talking to Supabase.
 *
 * The domain is never used to send mail. Accounts in Supabase use it as a label.
 * If you change it, update the SQL setup in `docs/admin-auth-setup.md` to match.
 */
const USERNAME_EMAIL_DOMAIN = 'ac-elite.local';

function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_EMAIL_DOMAIN}`;
}

export default function Page() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as LocationState)?.from ?? APP_ROUTES.admin;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Bounce straight to where they were heading.
  useEffect(() => {
    if (!auth.loading && auth.user && auth.profile) {
      navigate(redirectTo, { replace: true });
    }
  }, [auth.loading, auth.user, auth.profile, redirectTo, navigate]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await auth.signIn(usernameToEmail(username), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.');
      return;
    }
    navigate(redirectTo, { replace: true });
  };

  return (
    <>
      <title>{`Sign in - ${CONFIG.appName}`}</title>
      <meta name="robots" content="noindex, nofollow" />

      <Box sx={{ ...DATA_PAGE_SHELL_SX, minHeight: '100vh', display: 'flex', alignItems: 'center', py: 6 }}>
        <PageGridOverlay />

        {/* Soft brand-coloured glow behind the card. Adds depth without competing with the form. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: 360, sm: 540 },
            height: { xs: 360, sm: 540 },
            borderRadius: '50%',
            background:
              'radial-gradient(circle at center, rgba(96,165,250,0.22) 0%, rgba(96,165,250,0) 70%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={2.5} alignItems="center">
            {/* Branded header above the card */}
            <Box sx={{ ...softFloatWrapperSx(), textAlign: 'center' }}>
              <Stack spacing={1.25} alignItems="center">
                <Logo sx={{ width: 64, height: 64 }} />
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'rgba(191,219,254,0.85)',
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      lineHeight: 1.2,
                      display: 'block',
                    }}
                  >
                    AC Elite · Team area
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Welcome back
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, maxWidth: 320 }}>
                    Sign in with your Owner, Admin, or Moderator account to manage tracks,
                    images, and the leaderboard tooling.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Paper
              component="form"
              onSubmit={onSubmit}
              sx={{
                ...GLASS_PANEL_SX,
                ...brandAccentBorderSx(),
                ...glassCardMotionSx(0),
                p: 3,
                width: '100%',
              }}
            >
              <Stack spacing={2}>
                {!auth.configured && (
                  <Alert severity="error" variant="outlined" icon={<Icon icon="solar:danger-triangle-bold" />}>
                    Authentication is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
                    <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> and restart the dev server.
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" variant="outlined" icon={<Icon icon="solar:close-circle-bold" />}>
                    {error}
                  </Alert>
                )}

                <TextField
                  label="Username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="owner / admin / moderator"
                  required
                  fullWidth
                  disabled={!auth.configured || submitting}
                  inputProps={{ autoCapitalize: 'none', spellCheck: false }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon icon="solar:user-bold" width={18} style={{ color: '#bfdbfe' }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                  disabled={!auth.configured || submitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon icon="solar:lock-password-bold" width={18} style={{ color: '#bfdbfe' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box
                          component="button"
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          sx={{
                            border: 0,
                            background: 'transparent',
                            color: 'rgba(148,163,184,0.85)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            p: 0.5,
                            borderRadius: 0.75,
                            '&:hover': { color: '#bfdbfe', bgcolor: 'rgba(148,163,184,0.12)' },
                          }}
                        >
                          <Icon icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'} width={18} />
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={!auth.configured || submitting || !username || !password}
                  startIcon={
                    !submitting ? <Icon icon="solar:login-3-bold" width={20} /> : null
                  }
                  sx={{
                    ...ACTION_CONTAINED_PRIMARY_SMALL_SX,
                    minHeight: 44,
                    fontSize: '0.95rem',
                  }}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>

                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ pt: 0.5 }}
                >
                  <Icon icon="solar:shield-check-bold" width={14} style={{ color: 'rgba(148,163,184,0.7)' }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Restricted area · session is private to this browser
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
