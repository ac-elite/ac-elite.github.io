import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GLASS_CARD_INNER_HOVER_SX } from 'src/lib/glass';
import { DATA_STATE_HELP_TEXT_SX } from 'src/lib/page-shell';

// ----------------------------------------------------------------------

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** Compact empty block for tables and data panels (glass inner). */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        ...GLASS_CARD_INNER_HOVER_SX,
        cursor: 'default',
        px: 2,
        py: 1.75,
      }}
    >
      <Stack spacing={0.75} alignItems="flex-start">
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 'clamp(0.8rem, 0.72rem + 0.34vw, 0.875rem)',
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            variant="body2"
            sx={{ ...DATA_STATE_HELP_TEXT_SX, color: 'rgba(255,255,255,0.58)' }}
          >
            {description}
          </Typography>
        ) : null}
        {action}
      </Stack>
    </Box>
  );
}
