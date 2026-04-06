import type { Breakpoint } from '@mui/material/styles';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

import { Logo } from 'src/components/logo';
import { UpdateBar } from 'src/components/update-bar/update-bar';
import { ModTeamAdminLink } from 'src/components/mod-team-admin-link/mod-team-admin-link';
import { LicenseSafetyGuideButton } from 'src/components/license-safety-guide/license-safety-guide';

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
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'center',
        px: 2,
        py: 1.25,
        bgcolor: '#17213B',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
        [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Logo />
        <Stack direction="row" spacing={1} alignItems="center">
          <LicenseSafetyGuideButton compact />
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setOpenMobileNav(true)}
            size="small"
            sx={{ minWidth: 0, px: 1.5, py: 0.75, borderRadius: 1.25 }}
          >
            Menu
          </Button>
        </Stack>
      </Box>
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
          <NavDesktop
            data={navData}
            layoutQuery={layoutQuery}
            slots={{
              bottomArea: (
                <>
                  <ModTeamAdminLink />
                  <UpdateBar compact sx={{ mx: 1, my: 1 }} />
                </>
              ),
            }}
          />
          <NavMobile
            data={navData}
            open={openMobileNav}
            onClose={() => setOpenMobileNav(false)}
            sx={{ bgcolor: '#17213B' }}
            slots={{
              bottomArea: (
                <>
                  <ModTeamAdminLink />
                  <UpdateBar compact sx={{ mx: 1, my: 1 }} />
                </>
              ),
            }}
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
