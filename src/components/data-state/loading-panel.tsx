import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export function LoadingPanel({ message }: { message: string }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography>{message}</Typography>
    </Paper>
  );
}
