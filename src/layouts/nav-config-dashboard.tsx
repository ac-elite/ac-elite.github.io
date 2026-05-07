import Box from '@mui/material/Box';

import { APP_ROUTES } from 'src/centralized/app-routes';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
  disabled?: boolean;
};

const comingSoonBadge = (
  <Box
    component="span"
    sx={{
      px: 0.75,
      py: 0.25,
      borderRadius: 0.75,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.9)',
      bgcolor: 'rgba(255,255,255,0.12)',
      border: '1px solid rgba(255,255,255,0.18)',
    }}
  >
    Soon
  </Box>
);

export const navData = [
  {
    title: 'Home',
    path: APP_ROUTES.home,
    icon: icon('ic-home-racing'),
  },
  {
    title: 'Stats',
    path: APP_ROUTES.dashboard,
    icon: icon('ic-stats-racing'),
  },
  {
    title: 'Leaderboard',
    path: APP_ROUTES.leaderboard,
    icon: icon('ic-leaderboard-racing'),
  },
  {
    title: 'Rankings',
    path: APP_ROUTES.rankings,
    icon: icon('ic-rankings-racing'),
  },
  {
    title: 'Hall of Fame',
    path: APP_ROUTES.hallOfFame,
    icon: icon('ic-hof-racing'),
  },
  {
    title: 'Livery Showcase',
    path: APP_ROUTES.liveryShowcase,
    icon: icon('ic-livery-racing'),
  },
  {
    title: 'Setup Store',
    path: APP_ROUTES.setupStore,
    icon: icon('ic-setup-racing'),
    info: comingSoonBadge,
    disabled: true,
  }
];
