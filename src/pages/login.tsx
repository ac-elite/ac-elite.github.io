import { useRef, useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate, useLocation } from 'react-router-dom';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';

import { CONFIG } from 'src/config-global';
import {
  useAuth,
  getSteamLoginUrl,
  hasSteamOpenIdParams,
  readSteamOpenIdParams,
} from 'src/lib/auth/auth-context';
import { APP_ROUTES, getDriverRoute } from 'src/centralized/app-routes';
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
  const [steamBusy, setSteamBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in? Bounce straight to where they were heading. Drivers have
  // no admin area, so send them to their own driver page instead.
  useEffect(() => {
    if (!auth.loading && auth.user && auth.profile) {
      const target =
        auth.profile.role === 'driver' && auth.profile.steamId
          ? getDriverRoute(auth.profile.steamId)
          : redirectTo;
      navigate(target, { replace: true });
    }
  }, [auth.loading, auth.user, auth.profile, redirectTo, navigate]);

  // Returning from Steam? The redirect lands here with `openid.*` params —
  // verify them server-side and establish a session. On success the effect
  // above handles the redirect once the profile arrives.
  //
  // The ref guard makes this run exactly once: a Steam assertion is single-use,
  // and React StrictMode invokes mount effects twice in dev — without the guard
  // the second run re-sends the (now spent) assertion and Steam rejects it.
  const steamHandledRef = useRef(false);
  useEffect(() => {
    if (!auth.configured) return;
    if (!hasSteamOpenIdParams(window.location.search)) return;
    if (steamHandledRef.current) return;
    steamHandledRef.current = true;
    setSteamBusy(true);
    setError(null);
    void (async () => {
      let result;
      try {
        result = await auth.completeSteamLogin(readSteamOpenIdParams(window.location.search));
      } catch (err) {
        result = {
          ok: false,
          error: err instanceof Error ? err.message : 'Steam sign-in failed.',
        };
      }
      setSteamBusy(false);
      if (!result.ok) {
        setError(result.error ?? 'Steam sign-in failed.');
        // Strip the consumed assertion so a refresh doesn't retry it.
        navigate(APP_ROUTES.login, { replace: true });
      }
    })();
    // Run once on mount — the openid params are read straight off the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <Box
        sx={{
          ...DATA_PAGE_SHELL_SX,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 6,
        }}
      >
        <PageGridOverlay opacity={0.3} />

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
                    AC Elite · Sign in
                  </Typography>
                  <Typography component="h1" variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                    Welcome back
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mt: 0.75, maxWidth: 320 }}
                  >
                    Sign in with your account to continue, or use Steam to sign in as a driver.
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
                  <Alert
                    severity="error"
                    variant="outlined"
                    icon={<Icon icon="solar:danger-triangle-bold" />}
                  >
                    Authentication is not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
                    <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> and restart the
                    dev server.
                  </Alert>
                )}

                {error && (
                  <Alert
                    severity="error"
                    variant="outlined"
                    icon={<Icon icon="solar:close-circle-bold" />}
                  >
                    {error}
                  </Alert>
                )}

                <TextField
                  label="Username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
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
                  placeholder="Password"
                  required
                  fullWidth
                  disabled={!auth.configured || submitting}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Icon
                          icon="solar:lock-password-bold"
                          width={18}
                          style={{ color: '#bfdbfe' }}
                        />
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
                          <Icon
                            icon={showPassword ? 'solar:eye-closed-linear' : 'solar:eye-linear'}
                            width={18}
                          />
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
                  startIcon={!submitting ? <Icon icon="solar:login-3-bold" width={20} /> : null}
                  sx={{
                    ...ACTION_CONTAINED_PRIMARY_SMALL_SX,
                    minHeight: 'clamp(38px, 10vw, 44px)',
                    fontSize: 'clamp(0.85rem, 0.76rem + 0.4vw, 0.95rem)',
                  }}
                >
                  {submitting ? 'Signing in…' : 'Sign in'}
                </Button>

                <Divider sx={{ '&::before, &::after': { borderColor: 'rgba(148,163,184,0.22)' } }}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', px: 1, fontWeight: 700, letterSpacing: '0.06em' }}
                  >
                    OR
                  </Typography>
                </Divider>

                <Button
                  type="button"
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    window.location.href = getSteamLoginUrl();
                  }}
                  disabled={!auth.configured || steamBusy}
                  startIcon={<Icon icon="mdi:steam" width={22} />}
                  sx={{
                    minHeight: 'clamp(38px, 10vw, 44px)',
                    fontSize: 'clamp(0.85rem, 0.76rem + 0.4vw, 0.95rem)',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    borderColor: 'rgba(148,163,184,0.4)',
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    '&:hover': {
                      borderColor: 'rgba(191,219,254,0.7)',
                      background: 'rgba(191,219,254,0.08)',
                    },
                  }}
                >
                  {steamBusy ? 'Completing Steam sign-in…' : 'Sign in with Steam'}
                </Button>

                <Stack
                  direction="row"
                  spacing={0.75}
                  alignItems="center"
                  justifyContent="center"
                  sx={{ pt: 0.5 }}
                >
                  <Icon
                    icon="solar:shield-check-bold"
                    width={14}
                    style={{ color: 'rgba(148,163,184,0.7)' }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Your session stays private to this browser
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
