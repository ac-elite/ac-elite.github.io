import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { OUTLINED_INFO_STRIP_SX } from 'src/lib/page-shell';

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
          borderColor: 'rgba(147,197,253,0.52)',
          color: 'rgba(255,255,255,0.94)',
          bgcolor: 'rgba(13,27,56,0.62)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
          '&:hover': {
            borderColor: 'rgba(147,197,253,0.72)',
            bgcolor: 'rgba(13,27,56,0.72)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(147,197,253,0.12), 0 8px 28px rgba(0,0,0,0.22)',
          },
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
            fontSize: compact ? '0.8125rem' : '0.875rem',
            fontWeight: 500,
            letterSpacing: 0.01,
            lineHeight: 1.45,
            width: '100%',
          },
          borderRadius: 2,
          px: compact ? 1.35 : 1.65,
          py: compact ? 0.85 : 1.1,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 18px rgba(0,0,0,0.12)',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box component="span" sx={{ fontWeight: 700, maxWidth: 280 }}>
        Found a bug? Share feedback on Discord.
      </Box>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        href="https://discord.gg/d2EbxGYBbj"
        target="_blank"
        rel="noreferrer"
        sx={{ ...OUTLINED_INFO_STRIP_SX }}
      >
        Join Discord
      </Button>
    </Alert>
  );
}

