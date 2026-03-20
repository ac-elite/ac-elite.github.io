import { useState } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SX } from 'src/lib/glass';

type PreviewLockProps = {
  storageKey: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

// Preview-only lock for internal sharing (client-side).
const PREVIEW_PASSWORD = 'acelite-mod-team';

export function PreviewLock({ storageKey, title, description, children }: PreviewLockProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(storageKey) === PREVIEW_PASSWORD;
  });

  if (unlocked) return <>{children}</>;

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_SX,
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
          spacing={1.2}
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
            label="Preview password"
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
              if (value.trim() !== PREVIEW_PASSWORD) {
                setError('Wrong password. Please try again.');
                return;
              }
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(storageKey, PREVIEW_PASSWORD);
              }
              setUnlocked(true);
            }}
            sx={{ minHeight: 40 }}
          >
            Unlock preview
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
