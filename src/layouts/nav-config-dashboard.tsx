import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { ADMIN_SECTIONS } from 'src/centralized/admin-sections';

import { hasAtLeastRole, type AuthProfile } from 'src/lib/auth/auth-context';
import { dashboardIcons } from 'src/components/icons/ac-dashboard-icons';

// ----------------------------------------------------------------------

const navIcon = (name: string) => (
  <Box
    component="span"
    className="nav-glyph"
    sx={
      {
        '--nav-icon-size': '25.5px',
      } as React.CSSProperties
    }
  >
    <Icon icon={name} width={25.5} height={25.5} />
  </Box>
);

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
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
  { title: 'Home', path: APP_ROUTES.home, icon: dashboardIcons.home },
  { title: 'Stats', path: APP_ROUTES.dashboard, icon: dashboardIcons.stats },
  { title: 'Leaderboard', path: APP_ROUTES.leaderboard, icon: dashboardIcons.leaderboard },
  { title: 'Rankings', path: APP_ROUTES.rankings, icon: dashboardIcons.rankings },
  { title: 'Hall of Fame', path: APP_ROUTES.hallOfFame, icon: dashboardIcons.trophy },
  { title: 'Livery Showcase', path: APP_ROUTES.liveryShowcase, icon: dashboardIcons.livery },
  {
    title: 'Setup Store',
    path: APP_ROUTES.setupStore,
    icon: dashboardIcons.setup,
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
    icon: navIcon(section.iconifyName),
    group: index === 0 ? 'Admin' : undefined,
  }));
  return [...baseNavData, ...adminItems];
}
