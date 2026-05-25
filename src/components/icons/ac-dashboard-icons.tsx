import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';

/**
 * Solar icon base names per nav item. The nav renders the `-linear` (outline)
 * variant for inactive items and the `-bold` (filled) variant for the active one —
 * the iOS / SF Symbols behaviour that fits Liquid Glass. The whole site already
 * uses the Solar set, so this also unifies the nav with everything else.
 */
export const NAV_ICON_NAMES = {
  home: 'solar:home-angle',
  stats: 'solar:chart-2',
  leaderboard: 'solar:ranking',
  rankings: 'solar:medal-ribbons-star',
  trophy: 'solar:cup-star',
  livery: 'solar:palette-round',
  setup: 'solar:tuning-2',
} as const;

const DEFAULT_NAV_ICON_SIZE = 25.5;

/**
 * Render a nav glyph: the `.nav-glyph` wrapper (sized via the `--nav-icon-size`
 * var the nav/header boxje reads) wrapping the Solar icon. `active` swaps the
 * outline variant for the filled one.
 */
export function renderNavIcon(name: string, active = false, size = DEFAULT_NAV_ICON_SIZE) {
  return (
    <Box
      component="span"
      className="nav-glyph"
      sx={{ '--nav-icon-size': `${size}px` } as React.CSSProperties}
    >
      <Icon icon={`${name}-${active ? 'bold' : 'linear'}`} width={size} height={size} />
    </Box>
  );
}

/** Page-header icons (Stats, Rankings, …) — always the filled variant, in a boxje. */
export const dataPageHeaderIcons: Record<string, React.ReactNode> = {
  Stats: renderNavIcon(NAV_ICON_NAMES.stats, true),
  Rankings: renderNavIcon(NAV_ICON_NAMES.rankings, true),
  Leaderboard: renderNavIcon(NAV_ICON_NAMES.leaderboard, true),
  'Hall of Fame': renderNavIcon(NAV_ICON_NAMES.trophy, true),
  'Livery Showcase': renderNavIcon(NAV_ICON_NAMES.livery, true),
};
