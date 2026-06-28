import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';

import { GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';

import { RaceLoader, type RaceLoaderVariant } from 'src/components/race-loader';

// ----------------------------------------------------------------------

type LoadingPanelProps = {
  title?: string;
  message?: string;
  variant?: RaceLoaderVariant;
};

function LoadingPanel({
  title = 'Loading data...',
  message = 'Fetching the latest stats from the server.',
  variant = 'timing',
}: LoadingPanelProps) {
  return (
    <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, position: 'relative', overflow: 'hidden' }}>
      <Stack spacing={1.5}>
        <RaceLoader title={title} message={message} variant={variant} />
      </Stack>
    </Paper>
  );
}

export { LoadingPanel };
