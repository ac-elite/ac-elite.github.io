import { APP_ROUTES } from './app-routes';

/**
 * Single source of truth for the admin sub-pages: powers the sidebar nav
 * (when an admin/mod is signed in) and the route table. The "Admin" group
 * label in the sidebar makes a per-item prefix redundant, so the sidebar uses
 * the same plain `label`.
 */
export type AdminSection = {
  path: string;
  label: string;
  /** Sidebar icon name (under `/assets/icons/navbar/`). */
  navIcon: string;
};

export const ADMIN_SECTIONS: readonly AdminSection[] = [
  { path: APP_ROUTES.admin, label: 'Overview', navIcon: 'ic-stats-racing' },
  { path: `${APP_ROUTES.admin}/server`, label: 'Server', navIcon: 'ic-home-racing' },
  { path: `${APP_ROUTES.admin}/tracks`, label: 'Tracks', navIcon: 'ic-rankings-racing' },
  { path: `${APP_ROUTES.admin}/bans`, label: 'Bans', navIcon: 'ic-leaderboard-racing' },
  { path: `${APP_ROUTES.admin}/debug`, label: 'Debug', navIcon: 'ic-setup-racing' },
] as const;
