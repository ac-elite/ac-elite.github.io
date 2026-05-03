import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import LinearProgress, { linearProgressClasses } from '@mui/material/LinearProgress';

import AdminPage from 'src/pages/admin';
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
export const Page404 = lazy(() => import('src/pages/page-not-found'));

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
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'rankings', element: <RankingsPage /> },
      { path: 'hall-of-fame', element: <HallOfFamePage /> },
      { path: 'driver/:driverGuid', element: <DriverProfilePage /> },
      { path: 'setup-store', element: <SetupStorePage /> },
      { path: 'livery-showcase', element: <LiveryShowcasePage /> },
      { path: 'admin', element: <AdminPage /> },
      { path: 'home', element: <HomePage /> },
    ],
  },
  {
    path: '404',
    element: <Page404 />,
  },
  { path: '*', element: <Page404 /> },
];
