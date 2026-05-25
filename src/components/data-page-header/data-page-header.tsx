import type { SyncHealth } from 'src/lib/sync-utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SX } from 'src/lib/glass';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
import { dataPageHeaderIcons } from 'src/components/icons/ac-dashboard-icons';

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
  const headerIcon = dataPageHeaderIcons[title];

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
          <Stack direction="row" spacing={1.25} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }}>
            {headerIcon ? (
              <Box
                aria-hidden
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1.4,
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                  lineHeight: 0,
                  color: 'rgba(226,242,255,0.96)',
                  background:
                    'radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.13), rgba(255,255,255,0.03) 46%, transparent 72%), rgba(255,255,255,0.045)',
                  border: '1px solid rgba(226,242,255,0.14)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                  '& .nav-glyph': {
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    placeItems: 'center',
                    lineHeight: 0,
                    transform: 'translate(var(--nav-icon-x, 0px), var(--nav-icon-y, 0px))',
                    pointerEvents: 'none',
                  },
                  '& svg': {
                    display: 'block',
                    width: 'var(--nav-icon-size, 25.5px)',
                    height: 'var(--nav-icon-size, 25.5px)',
                    overflow: 'visible',
                  },
                }}
              >
                {headerIcon}
              </Box>
            ) : null}
            <Typography component="h1" variant="h4" fontWeight={800}>
              {title}
            </Typography>
          </Stack>
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
