import type { Theme, SxProps, Breakpoint } from '@mui/material/styles';

import { Fragment, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import { useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import Drawer, { drawerClasses } from '@mui/material/Drawer';

import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Logo } from 'src/components/logo';
import { Scrollbar } from 'src/components/scrollbar';
import { LicenseSafetyGuideButton } from 'src/components/license-safety-guide/license-safety-guide';

import type { NavItem } from '../nav-config-dashboard';

// ----------------------------------------------------------------------

export type NavContentProps = {
  data: NavItem[];
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  slots,
  layoutQuery,
}: NavContentProps & { layoutQuery: Breakpoint }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pt: 2.5,
        px: 2.5,
        bgcolor: '#17213B',
        top: 0,
        left: 0,
        height: 1,
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.16)}`,
        [theme.breakpoints.up(layoutQuery)]: {
          display: 'flex',
        },
        ...sx,
      }}
    >
      <NavContent data={data} slots={slots} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: 'unset',
          width: 'var(--layout-nav-mobile-width)',
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, slots, sx }: NavContentProps) {
  const pathname = usePathname();

  return (
    <>
      <Box
        sx={{
          mt: 0.5,
          mb: 3.5,
          px: 0.25,
          py: 0.25,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 1.5,
          bgcolor: '#17213B',
        }}
      >
        <Logo sx={{ width: 100, height: 100 }} />
      </Box>

      <Box sx={{ mb: 2.75 }}>
        <LicenseSafetyGuideButton />
      </Box>

      {slots?.topArea}

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              gap: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {data.map((item) => {
              const isActived = item.path === pathname;
              const isDisabled = Boolean(item.disabled);
              const navButtonProps = { component: RouterLink, href: item.path };

              return (
                <Fragment key={item.title}>
                {item.group && (
                  <Box
                    component="li"
                    sx={{
                      listStyle: 'none',
                      mt: 1.25,
                      mb: 0.25,
                      px: 0.5,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'rgba(191,219,254,0.7)',
                    }}
                  >
                    {item.group}
                  </Box>
                )}
                <ListItem disableGutters disablePadding>
                  <ListItemButton
                    disableGutters
                    {...navButtonProps}
                    sx={[
                      (theme) => ({
                        pl: 2,
                        py: 1.1,
                        gap: 2,
                        pr: 1.5,
                        borderRadius: 1,
                        typography: 'body2',
                        fontWeight: 'fontWeightMedium',
                        minHeight: 48,
                        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.72),
                        transition: theme.transitions.create(['background-color', 'color', 'box-shadow'], {
                          duration: theme.transitions.duration.shorter,
                        }),
                        '&:hover': {
                          bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
                          color: theme.vars.palette.common.white,
                        },
                        ...(isDisabled && {
                          opacity: 0.62,
                          cursor: 'pointer',
                          '&:hover': {
                            bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.06),
                            color: varAlpha(theme.vars.palette.common.whiteChannel, 0.82),
                          },
                        }),
                        ...(isActived && {
                          fontWeight: 'fontWeightSemiBold',
                          color: theme.vars.palette.common.white,
                          bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.16),
                          boxShadow: `inset 0 0 0 1px ${varAlpha(theme.vars.palette.common.whiteChannel, 0.28)}`,
                          '&:hover': {
                            bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.22),
                          },
                        }),
                      }),
                    ]}
                  >
                    <Box component="span" sx={{ width: 24, height: 24, color: 'inherit' }}>
                      {item.icon}
                    </Box>

                    <Box component="span" sx={{ flexGrow: 1 }}>
                      {item.title}
                    </Box>

                    {item.info && item.info}
                  </ListItemButton>
                </ListItem>
                </Fragment>
              );
            })}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}
    </>
  );
}
