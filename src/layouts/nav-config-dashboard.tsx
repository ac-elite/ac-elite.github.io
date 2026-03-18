import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

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
];
