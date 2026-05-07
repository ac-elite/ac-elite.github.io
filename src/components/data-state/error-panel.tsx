import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import { DATA_STATE_HELP_TEXT_SX, ERROR_RETRY_OUTLINED_SX } from 'src/lib/page-shell';

// ----------------------------------------------------------------------

const ERROR_ACCENT = '#fb7185';

type ErrorPanelProps = {
  error: string;
  title?: string;
  onRetry?: () => void;
};

export function ErrorPanel({ error, title = 'Failed to load data', onRetry }: ErrorPanelProps) {
  return (
    <Paper
      sx={{
        ...GLASS_PANEL_COMPACT_SX,
        borderTop: `3px solid ${ERROR_ACCENT}`,
        boxShadow:
          '0 12px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08), 0 -1px 0 rgba(251,113,133,0.28)',
      }}
    >
      <Stack spacing={1.35} alignItems="flex-start">
        <Typography sx={{ color: ERROR_ACCENT, fontWeight: 800, fontSize: '0.95rem', letterSpacing: 0.04 }}>
          {title}
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem' }}>
          {error}
        </Typography>
        <Typography variant="body2" sx={{ ...DATA_STATE_HELP_TEXT_SX }}>
          This is usually temporary. Try again in a moment, or refresh the page. Stats are synced regularly from the
          AC Elite server.
        </Typography>
        {onRetry && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={onRetry}
            sx={{ ...ERROR_RETRY_OUTLINED_SX }}
          >
            Retry
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
