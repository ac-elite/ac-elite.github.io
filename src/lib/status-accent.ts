import { alpha, keyframes } from '@mui/material/styles';

import { GLASS_SYNC_CYCLE_SEC } from 'src/lib/glass';

/** Top strip width for status-colored panels (matches admin quick-stats cards). */
export const STATUS_ACCENT_BORDER_WIDTH = 3;

const accentGlow = keyframes`
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.82; }
`;

/** Opacity pulse for split rim — same cadence as {@link GLASS_SYNC_CYCLE_SEC} card rim. */
const statusSplitRimGlowPulse = keyframes`
  0%, 100% {
    opacity: 0.56;
  }
  50% {
    opacity: 0.92;
  }
`;

/**
 * Colored top border + matching shadow glow + subtle breathing effect for glass panels.
 * A `::before` pseudo-element creates a soft downward glow from the accent border that
 * gently pulses to convey "live data". Respects `prefers-reduced-motion`.
 *
 * Use with `getSyncHealth().color`, `STATUS_ACCENT.online`, or any hex accent.
 * Merge **after** base panel styles (`GLASS_PANEL_SX`, `GLASS_PANEL_COMPACT_SX`, `GLASS_CARD_SX`, …).
 */
export function statusAccentBorderSx(accentColor: string) {
  return {
    position: 'relative' as const,
    borderTop: `${STATUS_ACCENT_BORDER_WIDTH}px solid ${accentColor}`,
    boxShadow: `0 12px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08), 0 -1px 0 ${alpha(accentColor, 0.22)}`,
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 10,
      borderRadius: 'inherit',
      background: `linear-gradient(180deg, ${alpha(accentColor, 0.22)} 0%, transparent 100%)`,
      pointerEvents: 'none' as const,
      animation: `${accentGlow} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: 0.6,
      },
    },
  };
}

/**
 * Replaces the default uniform blue `::after` rim from glass panels: **top** glow follows
 * `accentColor` (sync / status strip), **left, right, bottom** stay brand blue — merge **after**
 * `...GLASS_PANEL_SX` / `...GLASS_PANEL_COMPACT_SX` and **after** {@link statusAccentBorderSx}.
 */
export function statusAccentSplitRimSx(accentColor: string) {
  const blueSide = 'rgba(147, 197, 253, 0.2)';
  const blueBottom = 'rgba(56, 189, 248, 0.15)';
  return {
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      inset: 0,
      borderRadius: 'inherit',
      zIndex: 2,
      pointerEvents: 'none' as const,
      boxShadow: [
        `0 -7px 30px -10px ${alpha(accentColor, 0.44)}`,
        `0 -3px 18px -6px ${alpha(accentColor, 0.28)}`,
        `-5px 0 24px -8px ${blueSide}`,
        `5px 0 24px -8px ${blueSide}`,
        `0 7px 28px -8px ${blueBottom}`,
        '0 0 0 1px rgba(191, 225, 255, 0.18)',
      ].join(', '),
      animation: `${statusSplitRimGlowPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: 0.78,
      },
    },
  };
}

/** Binary presence (AC Elite server, API reachability, etc.). */
export const STATUS_ACCENT = {
  online: '#22c55e',
  offline: '#64748b',
} as const;

/**
 * Default top accent for **non-status** panels (house style).
 * Use `statusAccentBorderSx(getSyncHealth().color)` only when the strip reflects real sync/freshness.
 */
export const BRAND_ACCENT = '#93c5fd';

export function brandAccentBorderSx() {
  return statusAccentBorderSx(BRAND_ACCENT);
}
