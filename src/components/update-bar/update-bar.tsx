import type { SxProps, Theme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

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
          flexDirection: 'column',
          '& .MuiAlert-icon': {
            color: '#93c5fd',
            mr: 0,
          },
          '& .MuiAlert-message': {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            gap: 0.5,
            fontSize: compact ? '0.8rem' : '0.86rem',
            lineHeight: 1.4,
            width: '100%',
          },
          borderRadius: 1.75,
          px: compact ? 1.25 : 1.5,
          py: compact ? 0.75 : 1,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box component="span" sx={{ fontWeight: 600, maxWidth: 260 }}>
        Found a bug? Share feedback on Discord.
      </Box>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        href="https://discord.gg/d2EbxGYBbj"
        target="_blank"
        rel="noreferrer"
        sx={{
          minHeight: 30,
          mt: 0.5,
          px: 1.25,
          fontWeight: 700,
          textTransform: 'none',
          borderColor: 'rgba(147,197,253,0.55)',
          color: 'rgba(219,234,254,0.98)',
          bgcolor: 'rgba(59,130,246,0.08)',
          '&:hover': {
            borderColor: 'rgba(147,197,253,0.8)',
            bgcolor: 'rgba(59,130,246,0.16)',
          },
        }}
      >
        Join Discord
      </Button>
    </Alert>
  );
}

