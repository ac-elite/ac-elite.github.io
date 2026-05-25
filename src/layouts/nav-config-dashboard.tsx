import Box from '@mui/material/Box';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { ADMIN_SECTIONS } from 'src/centralized/admin-sections';

import { hasAtLeastRole, type AuthProfile } from 'src/lib/auth/auth-context';
import { NAV_ICON_NAMES } from 'src/components/icons/ac-dashboard-icons';

// ----------------------------------------------------------------------

export type NavItem = {
  title: string;
  path: string;
  /** Solar icon base name; the nav appends `-linear` (idle) or `-bold` (active). */
  iconName: string;
  info?: React.ReactNode;
  disabled?: boolean;
  /** Optional grouping label rendered above the item. */
  group?: string;
};

const comingSoonBadge = (
  <Box
    component="span"
    sx={{
      px: 0.75,
      py: 0.25,
      borderRadius: 0.75,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.9)',
      bgcolor: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
    }}
  >
    Soon
  </Box>
);

const baseNavData: NavItem[] = [
  { title: 'Home', path: APP_ROUTES.home, iconName: NAV_ICON_NAMES.home },
  { title: 'Stats', path: APP_ROUTES.dashboard, iconName: NAV_ICON_NAMES.stats },
  { title: 'Leaderboard', path: APP_ROUTES.leaderboard, iconName: NAV_ICON_NAMES.leaderboard },
  { title: 'Rankings', path: APP_ROUTES.rankings, iconName: NAV_ICON_NAMES.rankings },
  { title: 'Hall of Fame', path: APP_ROUTES.hallOfFame, iconName: NAV_ICON_NAMES.trophy },
  { title: 'Livery Showcase', path: APP_ROUTES.liveryShowcase, iconName: NAV_ICON_NAMES.livery },
  {
    title: 'Setup Store',
    path: APP_ROUTES.setupStore,
    iconName: NAV_ICON_NAMES.setup,
    info: comingSoonBadge,
    disabled: true,
  },
];

/** Kept as a default export for any caller that doesn't have auth state. */
export const navData: NavItem[] = baseNavData;

/**
 * Returns the navigation items the signed-in user should see. Mod/admin/owner
 * accounts get the admin sub-pages appended under an "Admin" group; everyone
 * else only sees the public nav.
 */
export function getNavData(profile: AuthProfile | null): NavItem[] {
  if (!hasAtLeastRole(profile, 'moderator')) {
    return baseNavData;
  }
  const adminItems: NavItem[] = ADMIN_SECTIONS.map((section, index) => ({
    title: section.label,
    path: section.path,
    iconName: section.iconifyName,
    group: index === 0 ? 'Admin' : undefined,
  }));
  return [...baseNavData, ...adminItems];
}
