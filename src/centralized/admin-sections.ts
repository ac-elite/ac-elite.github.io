import { APP_ROUTES } from './app-routes';

/**
 * Single source of truth for the admin sub-pages: powers the sidebar nav
 * (when an admin/mod is signed in) and the route table.
 */
export type AdminSection = {
  path: string;
  label: string;
  /**
   * Iconify icon name (Solar set) used in the sidebar. Iconify is already a
   * dependency, and the sidebar racing-SVG set doesn't have anything that
   * matches "server lobby" or "banned user" — so admin uses Iconify directly.
   */
  iconifyName: string;
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: APP_ROUTES.admin, label: 'Overview', iconifyName: 'solar:widget-2-bold-duotone' },
  { path: `${APP_ROUTES.admin}/server`, label: 'Server', iconifyName: 'solar:server-square-bold-duotone' },
  { path: `${APP_ROUTES.admin}/tracks`, label: 'Tracks', iconifyName: 'solar:map-point-wave-bold-duotone' },
  { path: `${APP_ROUTES.admin}/bans`, label: 'Bans', iconifyName: 'solar:user-block-bold-duotone' },
  { path: `${APP_ROUTES.admin}/debug`, label: 'Debug', iconifyName: 'solar:bug-bold-duotone' },
] as const;
