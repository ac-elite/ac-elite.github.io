import type { Breakpoint } from '@mui/material/styles';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { Logo } from 'src/components/logo';

import { NavMobile, NavDesktop } from './nav';
import { layoutClasses } from '../core/classes';
import { dashboardLayoutVars } from './css-vars';
import { navData } from '../nav-config-dashboard';
import { MainSection } from '../core/main-section';
import { LayoutSection } from '../core/layout-section';

import type { MainSectionProps } from '../core/main-section';
import type { LayoutSectionProps } from '../core/layout-section';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();
  const [openMobileNav, setOpenMobileNav] = useState(false);

  const renderFooter = () => null;

  const renderMain = () => <MainSection {...slotProps?.main}>{children}</MainSection>;
  const renderMobileHeader = () => (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--layout-header-zIndex)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.25,
        bgcolor: 'rgba(23,33,59,0.9)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
      }}
    >
      <Logo />
      <Button
        onClick={() => setOpenMobileNav(true)}
        size="small"
        sx={{
          minWidth: 0,
          px: 1.5,
          py: 0.75,
          borderRadius: 1.25,
          color: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(255,255,255,0.24)',
          bgcolor: 'rgba(255,255,255,0.05)',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
        }}
      >
        Menu
      </Button>
    </Box>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderMobileHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={
        <>
          <NavDesktop data={navData} layoutQuery={layoutQuery} />
          <NavMobile
            data={navData}
            open={openMobileNav}
            onClose={() => setOpenMobileNav(false)}
            sx={{ bgcolor: '#17213B' }}
          />
        </>
      }
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
