/**
 * Trend-window control + stat line, shown on every page with KMR stats.
 *
 * State lives in the app-wide `TrendWindowProvider` — picking a window here
 * updates the per-row DeltaChips everywhere and persists across pages/visits.
 *
 * - variant="community" — community-wide change (km / wins / new drivers)
 * - variant="driver"    — one driver's change (km / points / wins)
 */
import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { formatSignedKm } from 'src/lib/delta';
import { type RankDriver } from 'src/lib/ac-elite-data';
import { useTrendWindow } from 'src/lib/trend-window/trend-window-context';
import {
  HISTORY_WINDOWS,
  type HistoryWindowKey,
  computeDriverWindowDelta,
  computeCommunityWindowDelta,
} from 'src/lib/rank-history';

type TrendWindowStatsProps =
  | { variant: 'community'; rankData: RankDriver[]; driver?: undefined }
  | { variant: 'driver'; driver: RankDriver | null; rankData?: undefined };

const STRONG_SX = { fontWeight: 700, color: 'rgba(255,255,255,0.92)' } as const;

function signed(n: number): string {
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

export function TrendWindowStats(props: TrendWindowStatsProps) {
  const { variant } = props;
  const { activeWindow, setActiveWindow, availableWindows, snapshot } = useTrendWindow();

  const windowLabel = HISTORY_WINDOWS.find((w) => w.key === activeWindow)?.label ?? activeWindow;

  let line: React.ReactNode;
  if (variant === 'community') {
    const delta = computeCommunityWindowDelta(props.rankData, snapshot);
    line = delta.hasBaseline ? (
      <>
        vs {windowLabel} ago:{' '}
        <Box component="span" sx={STRONG_SX}>
          {formatSignedKm(delta.deltaKm)} km
        </Box>{' '}
        community-wide
        {delta.deltaWins !== 0 && (
          <>
            {' '}·{' '}
            <Box component="span" sx={STRONG_SX}>
              {signed(delta.deltaWins)}
            </Box>{' '}
            win{Math.abs(delta.deltaWins) === 1 ? '' : 's'}
          </>
        )}
        {delta.newDrivers > 0 && (
          <>
            {' '}·{' '}
            <Box component="span" sx={STRONG_SX}>
              +{delta.newDrivers}
            </Box>{' '}
            new driver{delta.newDrivers === 1 ? '' : 's'}
          </>
        )}
      </>
    ) : (
      'Trend history is still building — check back soon.'
    );
  } else {
    const delta = computeDriverWindowDelta(props.driver, snapshot);
    line = delta.hasBaseline ? (
      <>
        Last {windowLabel}:{' '}
        <Box component="span" sx={STRONG_SX}>
          {formatSignedKm(delta.deltaKm)} km
        </Box>
        {' '}·{' '}
        <Box component="span" sx={STRONG_SX}>
          {signed(delta.deltaPoints)}
        </Box>{' '}
        points{' '}·{' '}
        <Box component="span" sx={STRONG_SX}>
          {signed(delta.deltaWins)}
        </Box>{' '}
        win{Math.abs(delta.deltaWins) === 1 ? '' : 's'}
      </>
    ) : (
      'No trend data for this driver in this window yet.'
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
      useFlexGap
    >
      <ToggleButtonGroup
        size="small"
        exclusive
        value={activeWindow}
        onChange={(_, value) => {
          if (value) setActiveWindow(value as HistoryWindowKey);
        }}
        aria-label="Trend window"
      >
        {HISTORY_WINDOWS.map((w) => (
          <ToggleButton
            key={w.key}
            value={w.key}
            disabled={!availableWindows.has(w.key)}
            sx={{ px: 1.5, py: 0.25, textTransform: 'none', fontWeight: 700 }}
          >
            {w.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.85,
          px: 1.15,
          py: 0.55,
          borderRadius: 1.25,
          bgcolor: 'rgba(15,23,42,0.55)',
          border: '1px solid rgba(148,163,184,0.2)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <Box component="span" sx={{ color: '#7dd3fc', display: 'inline-flex', flexShrink: 0 }}>
          <Icon icon="solar:history-bold" width={15} />
        </Box>
        <Typography variant="body2" sx={{ color: 'rgba(226,232,240,0.82)', lineHeight: 1.4 }}>
          {line}
        </Typography>
      </Box>
    </Stack>
  );
}
