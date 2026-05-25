/**
 * Shared accent helpers.
 *
 * The current visual direction keeps cards consistent: live/status state is
 * communicated by text and badges, not by coloured card rims or glow.
 */

/** Kept for older call-sites that import the token. No visual strip is drawn. */
export const STATUS_ACCENT_BORDER_WIDTH = 0;

/** Binary presence (AC Elite server, API reachability, etc.). */
export const STATUS_ACCENT = {
  online: '#22c55e',
  offline: '#64748b',
} as const;

/** Brand accent used by charts and small semantic details, not card borders. */
export const BRAND_ACCENT = '#93c5fd';

export function statusAccentBorderSx(accentColor: string) {
  void accentColor;
  return {
    position: 'relative' as const,
  };
}

export function statusAccentSplitRimSx(accentColor: string) {
  void accentColor;
  return {};
}

export function brandAccentBorderSx() {
  return {
    position: 'relative' as const,
  };
}

export function roleAccentBorderSx(color: string) {
  void color;
  return {
    position: 'relative' as const,
  };
}
