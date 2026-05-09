import { alpha, keyframes } from '@mui/material/styles';

import { GLASS_SYNC_CYCLE_SEC } from 'src/lib/glass';

/** Top strip width for status-colored panels (matches admin quick-stats cards). */
export const STATUS_ACCENT_BORDER_WIDTH = 3;

/**
 * Pulse range tuned so the solid 3px strip stays visibly solid throughout
 * (≥ 85% opacity at all times) while the soft glow gradient underneath still
 * "breathes" perceptibly. Wider ranges (e.g. 0.4 → 0.82) made the strip itself
 * flicker visibly, which read as cheap on the panel borders.
 */
const accentGlow = keyframes`
  0%, 100% {
    opacity: 0.76;
    transform: translateY(0) scaleY(1);
  }
  50% {
    opacity: 1;
    transform: translateY(0.8px) scaleY(1.12);
  }
`;

/**
 * Opacity pulse for split rim — same cadence as {@link GLASS_SYNC_CYCLE_SEC} card rim.
 * Tight dynamic range (0.72 → 0.95) so the rim "breathes" without aggressively
 * brightening — feels deliberate rather than flashing.
 */
const statusSplitRimGlowPulse = keyframes`
  0%, 100% {
    opacity: 0.66;
  }
  50% {
    opacity: 1;
  }
`;

/**
 * Colored top accent + soft pulsing glow for glass panels.
 *
 * The visible strip uses an **inset** `box-shadow` (not `border-top` nor a
 * clipped full-border pseudo) so it follows the panel’s `border-radius` inside
 * the border box and blends into the corners instead of meeting the side
 * borders with a hard cut.
 *
 * `::before` adds a soft downward glow; a horizontal mask tapers it near the
 * top-left/right curves. Pulse uses {@link accentGlow}. Respects
 * `prefers-reduced-motion`.
 *
 * Merge **after** base panel styles (`GLASS_PANEL_SX`, `GLASS_PANEL_COMPACT_SX`,
 * `GLASS_CARD_SX`, …).
 */
export function statusAccentBorderSx(accentColor: string) {
  const strip = `${STATUS_ACCENT_BORDER_WIDTH}px`;
  return {
    position: 'relative' as const,
    boxShadow: [
      '0 12px 30px rgba(0,0,0,0.32)',
      'inset 0 1px 0 rgba(255,255,255,0.08)',
      `inset 0 ${strip} 0 0 ${accentColor}`,
      `0 -1px 0 ${alpha(accentColor, 0.22)}`,
    ].join(', '),
    '&::before': {
      content: '""',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 10,
      borderRadius: 'inherit',
      background: `linear-gradient(180deg, ${alpha(accentColor, 0.28)} 0%, transparent 100%)`,
      WebkitMaskImage:
        'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
      maskImage: 'linear-gradient(90deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
      transformOrigin: 'top center',
      pointerEvents: 'none' as const,
      animation: `${accentGlow} ${GLASS_SYNC_CYCLE_SEC * 0.92}s ease-in-out infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: 0.95,
      },
    },
  };
}

/**
 * Outer rim glow for status panels — pairs with {@link statusAccentBorderSx} so
 * the top accent strip has a matching, deliberate halo around the whole panel
 * rather than the diffuse bloom + clashing brand-blue sides the previous
 * version produced.
 *
 * Built as a layered single-colour ring:
 *   1) Crisp inset hairline — premium edge just inside the panel border.
 *   2) Razor-thin outer hairline — keeps the rim defined, no fogginess.
 *   3) Tight top glow — concentrated around the accent strip (small blur).
 *   4) Subtle ambient halo — adds depth without spilling.
 *
 * Merge **after** `GLASS_PANEL_SX` / `GLASS_PANEL_COMPACT_SX` and **after**
 * {@link statusAccentBorderSx}.
 */
export function statusAccentSplitRimSx(accentColor: string) {
  return {
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      inset: 0,
      borderRadius: 'inherit',
      zIndex: 2,
      pointerEvents: 'none' as const,
      boxShadow: [
        `inset 0 0 0 1px ${alpha(accentColor, 0.22)}`,
        `0 0 0 1px ${alpha(accentColor, 0.18)}`,
        `0 -4px 14px -3px ${alpha(accentColor, 0.42)}`,
        `0 0 22px -8px ${alpha(accentColor, 0.22)}`,
      ].join(', '),
      animation: `${statusSplitRimGlowPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        opacity: 0.88,
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

/**
 * Top-rim accent in a role-specific colour (Owner red, Admin purple, Moderator
 * green, etc.). Mechanically identical to `statusAccentBorderSx` but named so
 * the call-site reads as "role rim, not sync rim". Pair with
 * `statusAccentSplitRimSx(color)` to add the soft outer glow.
 */
export function roleAccentBorderSx(color: string) {
  return statusAccentBorderSx(color);
}
