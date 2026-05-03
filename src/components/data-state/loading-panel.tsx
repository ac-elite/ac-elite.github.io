import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import { DATA_STATE_HELP_TEXT_SX } from 'src/lib/page-shell';

// ----------------------------------------------------------------------

type LoadingPanelProps = {
  title?: string;
  message?: string;
  children?: ReactNode;
};

function LoadingPanel({
  title = 'Loading data…',
  message = 'Fetching the latest stats from the server.',
  children,
}: LoadingPanelProps) {
  return (
    <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, position: 'relative', overflow: 'hidden' }}>
      <LinearProgress
        variant="indeterminate"
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 3,
          borderRadius: 0,
          bgcolor: 'rgba(255,255,255,0.06)',
          '& .MuiLinearProgress-bar': {
            bgcolor: 'rgba(56,189,248,0.75)',
          },
        }}
      />
      <Stack spacing={1.25} sx={{ pt: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: 0.04, color: 'rgba(255,255,255,0.92)' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ ...DATA_STATE_HELP_TEXT_SX }}>
          {message}
        </Typography>
        {children ? <Box sx={{ pt: 0.5 }}>{children}</Box> : null}
      </Stack>
    </Paper>
  );
}

export { LoadingPanel };
