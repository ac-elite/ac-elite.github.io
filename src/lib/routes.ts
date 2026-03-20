const APP_BASE_URL = import.meta.env.BASE_URL;

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
