import { useState } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { ACTION_CONTAINED_PRIMARY_SMALL_SX } from 'src/lib/page-shell';

export type PreviewLockPersist = 'none' | 'session' | 'local';

type PreviewLockProps = {
  /** Expected password (define a `const` in the page module). If empty, the lock is skipped. */
  password: string;
  /** Namespace for unlock flag in storage (not the password itself). */
  storageKey: string;
  /**
   * Where to remember “unlocked” after a correct password.
   * - `none`: only until refresh (nothing stored).
   * - `session`: this browser tab until it is closed.
   * - `local`: this browser profile until cleared (default).
   */
  persist?: PreviewLockPersist;
  title: string;
  description: string;
  children: React.ReactNode;
};

const UNLOCK_VALUE = '1';

function readUnlocked(storageKey: string, persist: PreviewLockPersist): boolean {
  if (typeof window === 'undefined' || persist === 'none') return false;
  if (persist === 'local') return window.localStorage.getItem(storageKey) === UNLOCK_VALUE;
  return window.sessionStorage.getItem(storageKey) === UNLOCK_VALUE;
}

function writeUnlocked(storageKey: string, persist: PreviewLockPersist): void {
  if (typeof window === 'undefined' || persist === 'none') return;
  if (persist === 'local') {
    window.localStorage.setItem(storageKey, UNLOCK_VALUE);
    window.sessionStorage.removeItem(storageKey);
  } else {
    window.sessionStorage.setItem(storageKey, UNLOCK_VALUE);
    window.localStorage.removeItem(storageKey);
  }
}

/**
 * Lightweight client-side gate for preview pages. The password is compared in the browser,
 * so it still ships in the JS bundle — this is “keep casual visitors out”, not cryptographic
 * security. For stronger protection without a database, use e.g. Cloudflare Access, Netlify
 * password protection, or a private deployment; optionally combine with `persist="none"`.
 *
 * Storage holds only a flag (`'1'`), never the password.
 */
export function PreviewLock({
  password,
  storageKey,
  persist = 'local',
  title,
  description,
  children,
}: PreviewLockProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(() => readUnlocked(storageKey, persist));

  if (!password?.trim()) {
    if (import.meta.env.DEV) {
      console.warn(
        `[PreviewLock] No password for storageKey "${storageKey}"; content is visible. Set a non-empty password const on the page.`
      );
    }
    return <>{children}</>;
  }

  if (unlocked) return <>{children}</>;

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_SX,
        ...brandAccentBorderSx(),
        p: 3,
        textAlign: { xs: 'center', md: 'left' },
      }}
    >
      <Stack spacing={2} sx={{ alignItems: { xs: 'center', md: 'flex-start' } }}>

        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, maxWidth: 700 }}>
            {description}
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          justifyContent={{ xs: 'center', sm: 'flex-start' }}
          sx={{ width: '100%' }}
        >
          <TextField
            type="password"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError('');
            }}
            size="small"
            label="Password"
            autoComplete="off"
            error={Boolean(error)}
            helperText={error || undefined}
            sx={{ minWidth: { xs: '100%', sm: 320 } }}
          />
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => {
              if (value.trim() !== password) {
                setError('Wrong password. Please try again.');
                return;
              }
              writeUnlocked(storageKey, persist);
              setUnlocked(true);
            }}
            sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
          >
            Unlock
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
