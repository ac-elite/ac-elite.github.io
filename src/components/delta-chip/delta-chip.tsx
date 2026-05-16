import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { HISTORY_WINDOWS } from 'src/lib/rank-history';
import { useTrendWindow } from 'src/lib/trend-window/trend-window-context';

type DeltaKind = 'pace' | 'sr';

type DeltaChipProps = {
  value: number;
  /** Number of decimal places (default 0 for pace, use 2 for SR) */
  decimals?: number;
  /** Determines the tooltip explanation */
  kind?: DeltaKind;
  /** Override the default tooltip label */
  label?: string;
};

const EPSILON = 0.001;

const tooltipPace = (window: string) =>
  `Change in pace score over the last ${window}. ` +
  'This can shift even without driving — when other drivers improve their times, your relative position changes.';

const tooltipSr = (window: string) =>
  `Change in Safety Rating over the last ${window}. ` +
  'SR only changes when you drive — it is based on your own collisions and infractions per km.';

export function DeltaChip({ value, decimals = 0, kind = 'pace', label }: DeltaChipProps) {
  const { activeWindow } = useTrendWindow();

  if (Math.abs(value) < EPSILON) return null;

  const windowLabel = HISTORY_WINDOWS.find((w) => w.key === activeWindow)?.label ?? activeWindow;
  const isPositive = value > 0;
  const formatted = `${isPositive ? '+' : ''}${value.toFixed(decimals)}`;
  const tooltip =
    label || `${formatted} · ${kind === 'sr' ? tooltipSr(windowLabel) : tooltipPace(windowLabel)}`;

  return (
    <Tooltip title={tooltip} arrow placement="top">
      <Typography
        component="span"
        variant="caption"
        sx={{
          ml: 0.5,
          px: 0.6,
          py: 0.1,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.68rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'default',
          color: isPositive ? '#4ADE80' : '#FB7185',
          bgcolor: isPositive ? 'rgba(74,222,128,0.12)' : 'rgba(251,113,133,0.12)',
          border: `1px solid ${isPositive ? 'rgba(74,222,128,0.28)' : 'rgba(251,113,133,0.28)'}`,
        }}
      >
        {formatted}
      </Typography>
    </Tooltip>
  );
}
