import Box from '@mui/material/Box';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { ADMIN_SECTIONS } from 'src/centralized/admin-sections';
import { SvgColor } from 'src/components/svg-color';

import { hasAtLeastRole, type AuthProfile } from 'src/lib/auth/auth-context';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

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
  { title: 'Home', path: APP_ROUTES.home, icon: icon('ic-home-racing') },
  { title: 'Stats', path: APP_ROUTES.dashboard, icon: icon('ic-stats-racing') },
  { title: 'Leaderboard', path: APP_ROUTES.leaderboard, icon: icon('ic-leaderboard-racing') },
  { title: 'Rankings', path: APP_ROUTES.rankings, icon: icon('ic-rankings-racing') },
  { title: 'Hall of Fame', path: APP_ROUTES.hallOfFame, icon: icon('ic-hof-racing') },
  { title: 'Livery Showcase', path: APP_ROUTES.liveryShowcase, icon: icon('ic-livery-racing') },
  {
    title: 'Setup Store',
    path: APP_ROUTES.setupStore,
    icon: icon('ic-setup-racing'),
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
    icon: icon(section.navIcon),
    group: index === 0 ? 'Admin' : undefined,
  }));
  return [...baseNavData, ...adminItems];
}
