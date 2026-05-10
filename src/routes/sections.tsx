import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { DashboardLayout } from 'src/layouts/dashboard';

import { LicenseSafetyGuideProvider } from 'src/components/license-safety-guide/license-safety-guide';

// ----------------------------------------------------------------------

export const HomePage = lazy(() => import('src/pages/home'));
export const DashboardPage = lazy(() => import('src/pages/dashboard'));
export const LeaderboardPage = lazy(() => import('src/pages/leaderboard'));
export const RankingsPage = lazy(() => import('src/pages/rankings'));
export const HallOfFamePage = lazy(() => import('src/pages/hall-of-fame'));
export const DriverProfilePage = lazy(() => import('src/pages/driver-profile'));
export const SetupStorePage = lazy(() => import('src/pages/setup-store'));
export const LiveryShowcasePage = lazy(() => import('src/pages/livery-showcase'));
export const LoginPage = lazy(() => import('src/pages/login'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));

const AdminPage = lazy(() => import('src/pages/admin'));
const AdminServerPage = lazy(() => import('src/pages/admin-server'));
const AdminTracksPage = lazy(() => import('src/pages/admin-tracks'));
const AdminBansPage = lazy(() => import('src/pages/admin-bans'));
const AdminDebugPage = lazy(() => import('src/pages/admin-debug'));

const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <LinearProgress
      sx={{
        width: 1,
        maxWidth: 320,
        bgcolor: (theme) => varAlpha(theme.vars.palette.text.primaryChannel, 0.16),
        [`& .${linearProgressClasses.bar}`]: { bgcolor: 'text.primary' },
      }}
    />
  </Box>
);

export const routesSection: RouteObject[] = [
  {
    element: (
      <LicenseSafetyGuideProvider>
        <DashboardLayout>
          <Suspense fallback={renderFallback()}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </LicenseSafetyGuideProvider>
    ),
    children: [
      // Home (AC Elite) is the default route
      { index: true, element: <HomePage /> },
      { path: APP_ROUTES.dashboard.slice(1), element: <DashboardPage /> },
      { path: APP_ROUTES.leaderboard.slice(1), element: <LeaderboardPage /> },
      { path: APP_ROUTES.rankings.slice(1), element: <RankingsPage /> },
      { path: APP_ROUTES.hallOfFame.slice(1), element: <HallOfFamePage /> },
      { path: APP_ROUTES.driverPattern.slice(1), element: <DriverProfilePage /> },
      { path: APP_ROUTES.setupStore.slice(1), element: <SetupStorePage /> },
      { path: APP_ROUTES.liveryShowcase.slice(1), element: <LiveryShowcasePage /> },
      { path: APP_ROUTES.admin.slice(1), element: <AdminPage /> },
      { path: `${APP_ROUTES.admin.slice(1)}/server`, element: <AdminServerPage /> },
      { path: `${APP_ROUTES.admin.slice(1)}/tracks`, element: <AdminTracksPage /> },
      { path: `${APP_ROUTES.admin.slice(1)}/bans`, element: <AdminBansPage /> },
      { path: `${APP_ROUTES.admin.slice(1)}/debug`, element: <AdminDebugPage /> },
      { path: APP_ROUTES.login.slice(1), element: <LoginPage /> },
      { path: 'home', element: <HomePage /> },
    ],
  },
  {
    path: '404',
    element: <Page404 />,
  },
  { path: '*', element: <Page404 /> },
];
