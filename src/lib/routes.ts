import { APP_ROUTES } from 'src/centralized/app-routes';

const APP_BASE_URL = import.meta.env.BASE_URL;

function getAppRootPath(): string {
  return APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) || '' : APP_BASE_URL;
}

/** Router index; `basename` on the router matches `import.meta.env.BASE_URL`. */
export function getHomeHref(): string {
  return APP_ROUTES.home;
}

/** Path for files in `public/` (GitHub Pages / Vite base). */
export function getPublicAssetHref(relativePath: string): string {
  const root = getAppRootPath();
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${root}${path}`;
}

export function getDriverProfileHref(guid: string) {
  return `${APP_BASE_URL}${APP_ROUTES.driverPattern.slice(1).replace(':driverGuid', encodeURIComponent(guid))}`;
}

/** `?track=<id>` for the leaderboard page (internal path `/leaderboard`). */
export function getLeaderboardTrackSearch(trackId: string) {
  return `?${new URLSearchParams({ track: trackId }).toString()}`;
}

export function getLeaderboardHref(trackId: string) {
  return `${APP_BASE_URL}${APP_ROUTES.leaderboard.slice(1)}${getLeaderboardTrackSearch(trackId)}`;
}

/** Leaderboard page without `?track=` (same basename as {@link getLeaderboardHref}). */
export function getLeaderboardIndexHref() {
  return `${APP_BASE_URL}${APP_ROUTES.leaderboard.slice(1)}`;
}
