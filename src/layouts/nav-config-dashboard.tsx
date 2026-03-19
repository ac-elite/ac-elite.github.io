import Box from '@mui/material/Box';

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
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Stats',
    path: '/dashboard',
    icon: icon('ic-analytics'),
  },
  {
    title: 'Leaderboard',
    path: '/leaderboard',
    icon: icon('ic-cart'),
  },
  {
    title: 'Rankings',
    path: '/rankings',
    icon: icon('ic-blog'),
  },
  {
    title: 'Hall of Fame',
    path: '/hall-of-fame',
    icon: icon('ic-user'),
  },
  {
    title: 'Setup Store',
    path: '/setup-store',
    icon: icon('ic-lock'),
    info: comingSoonBadge,
    disabled: true,
  },
  {
    title: 'Livery Showcase',
    path: '/livery-showcase',
    icon: icon('ic-disabled'),
    info: comingSoonBadge,
    disabled: true,
  },
];
