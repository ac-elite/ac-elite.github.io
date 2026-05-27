export const APP_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  leaderboard: '/leaderboard',
  rankings: '/rankings',
  hallOfFame: '/hall-of-fame',
  setupStore: '/setup-store',
  liveryShowcase: '/livery-showcase',
  results: '/results',
  resultPattern: '/results/:sessionId',
  admin: '/admin',
  login: '/login',
  driverPattern: '/driver/:driverGuid',
  driverStatsPattern: '/driver/:id',
} as const;

export function getDriverRoute(driverGuid: string): string {
  return `/driver/${encodeURIComponent(driverGuid)}`;
}

export function getResultRoute(sessionId: number | string): string {
  return `/results/${encodeURIComponent(String(sessionId))}`;
}
