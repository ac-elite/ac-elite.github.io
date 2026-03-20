import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

export type UpdateBarProps = {
  sx?: SxProps<Theme>;
  compact?: boolean;
};

export function UpdateBar({ sx, compact = false }: UpdateBarProps) {
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={[
        {
          borderColor: 'rgba(147,197,253,0.46)',
          color: 'rgba(255,255,255,0.9)',
          bgcolor: 'rgba(13,27,56,0.56)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          '& .MuiAlert-icon': {
            color: '#93c5fd',
            alignSelf: 'center',
            mt: 0,
            mb: 0,
          },
          '& .MuiAlert-message': {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'left',
            gap: 0.65,
            fontSize: compact ? '0.84rem' : '0.9rem',
            lineHeight: 1.4,
          },
          borderRadius: 1.75,
          px: compact ? 1.25 : 1.5,
          py: compact ? 0.75 : 1,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box component="span" sx={{ fontWeight: 600 }}>
        Found a bug or have feedback? Report it to the AC Elite team so we can improve the site faster.
      </Box>
    </Alert>
  );
}

