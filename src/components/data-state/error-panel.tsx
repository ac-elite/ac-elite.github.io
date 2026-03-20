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
        {onRetry && (
          <Button variant="outlined" color="primary" size="small" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
