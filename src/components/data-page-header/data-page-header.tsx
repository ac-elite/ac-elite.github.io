import type { SyncHealth } from 'src/lib/sync-utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SX } from 'src/lib/glass';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';

type DataPageHeaderProps = {
  title: string;
  description: React.ReactNode;
  /** Sync freshness — colours the accent and shows the "Live · X ago" line. */
  syncHealth: SyncHealth;
  /** Optional extra content below the sync line (e.g. the trend filter). */
  children?: React.ReactNode;
};

/**
 * Shared header panel for data pages (Stats, Rankings, Leaderboard, Hall of
 * Fame, Livery Showcase). Glass panel + sync-health accent rim + title,
 * description and the freshness line — so every data page opens identically.
 */
export function DataPageHeader({ title, description, syncHealth, children }: DataPageHeaderProps) {
  return (
    <Box sx={softFloatWrapperSx()}>
      <Box
        sx={{
          ...GLASS_PANEL_SX,
          ...statusAccentBorderSx(syncHealth.color),
          ...statusAccentSplitRimSx(syncHealth.color),
          ...glassCardMotionSx(0),
        }}
      >
        <Stack
          spacing={0.75}
          sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}
        >
          <Typography variant="h4" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {description}
          </Typography>
          <Typography variant="body2" sx={{ color: syncHealth.color, fontWeight: 700 }}>
            {syncHealth.label} · {syncHealth.ageText}
          </Typography>
          {children}
        </Stack>
      </Box>
    </Box>
  );
}
