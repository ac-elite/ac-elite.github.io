export const APP_ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  leaderboard: '/leaderboard',
  rankings: '/rankings',
  hallOfFame: '/hall-of-fame',
  setupStore: '/setup-store',
  liveryShowcase: '/livery-showcase',
  admin: '/admin',
  driverPattern: '/driver/:driverGuid',
  driverStatsPattern: '/driver/:id',
} as const;

export function getDriverRoute(driverGuid: string): string {
  return `/driver/${encodeURIComponent(driverGuid)}`;
}
