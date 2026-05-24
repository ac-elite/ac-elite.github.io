import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

import { getTintedGlassPanelSx, GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
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
        GLASS_PANEL_COMPACT_SX,
        getTintedGlassPanelSx('#93c5fd'),
        {
          color: 'rgba(255,255,255,0.94)',
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          transition: 'border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease',
          '&:hover': {
            borderColor: 'rgba(191,219,254,0.42)',
            backgroundColor: 'rgba(19,30,54,0.72)',
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
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ] as SxProps<Theme>}
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

