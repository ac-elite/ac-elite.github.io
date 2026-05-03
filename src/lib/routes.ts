const APP_BASE_URL = import.meta.env.BASE_URL;

function getAppRootPath(): string {
  return APP_BASE_URL.endsWith('/') ? APP_BASE_URL.slice(0, -1) || '' : APP_BASE_URL;
}

/** Router index; `basename` on the router matches `import.meta.env.BASE_URL`. */
export function getHomeHref(): string {
  return '/';
}

/** Path for files in `public/` (GitHub Pages / Vite base). */
export function getPublicAssetHref(relativePath: string): string {
  const root = getAppRootPath();
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${root}${path}`;
}

export function getDriverProfileHref(guid: string) {
  return `${APP_BASE_URL}driver/${encodeURIComponent(guid)}`;
}

/** `?track=<id>` for the leaderboard page (internal path `/leaderboard`). */
export function getLeaderboardTrackSearch(trackId: string) {
  return `?${new URLSearchParams({ track: trackId }).toString()}`;
}

export function getLeaderboardHref(trackId: string) {
  return `${APP_BASE_URL}leaderboard${getLeaderboardTrackSearch(trackId)}`;
}
