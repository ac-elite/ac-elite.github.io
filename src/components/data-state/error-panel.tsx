import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

type ErrorPanelProps = {
  error: string;
  title?: string;
  onRetry?: () => void;
};

export function ErrorPanel({ error, title = 'Failed to load data', onRetry }: ErrorPanelProps) {
  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={1.2} alignItems="flex-start">
        <Typography color="error" fontWeight={700}>
          {title}
        </Typography>
        <Typography color="text.secondary">{error}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.55 }}>
          This is usually temporary. Try again in a moment, or refresh the page. Stats are synced regularly from the
          game server.
        </Typography>
        {onRetry && (
          <Button variant="outlined" color="primary" size="small" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
