import { APP_ROUTES } from './app-routes';

/**
 * Single source of truth for the admin sub-pages: powers the sidebar nav
 * (when an admin/mod is signed in) and the route table.
 */
export type AdminSection = {
  path: string;
  label: string;
  /**
   * Solar icon base name (no variant suffix). The sidebar appends `-linear` when
   * idle and `-bold` when active, matching the public nav items.
   */
  iconifyName: string;
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: APP_ROUTES.admin, label: 'Overview', iconifyName: 'solar:widget-2' },
  { path: `${APP_ROUTES.admin}/server`, label: 'Server', iconifyName: 'solar:server-square' },
  { path: `${APP_ROUTES.admin}/rating-playground`, label: 'Rating Playground', iconifyName: 'solar:tuning-square' },
  { path: `${APP_ROUTES.admin}/tracks`, label: 'Tracks', iconifyName: 'solar:map-point-wave' },
  { path: `${APP_ROUTES.admin}/bans`, label: 'Bans', iconifyName: 'solar:user-block' },
  { path: `${APP_ROUTES.admin}/debug`, label: 'Debug', iconifyName: 'solar:bug' },
] as const;
