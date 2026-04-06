import { alpha, keyframes } from '@mui/material/styles';

/** Top strip width for status-colored panels (matches admin quick-stats cards). */
export const STATUS_ACCENT_BORDER_WIDTH = 3;

const accentGlow = keyframes`
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.75; }
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
      background: `linear-gradient(180deg, ${alpha(accentColor, 0.18)} 0%, transparent 100%)`,
      pointerEvents: 'none' as const,
      animation: `${accentGlow} 4s ease-in-out infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: 0.6,
      },
    },
  };
}

/** Binary presence (game server, API reachability, etc.). */
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
