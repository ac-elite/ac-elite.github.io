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
        pt: 3,
        px: 2,
        bgcolor: 'rgba(18,28,50,0.72)',
        backgroundImage:
          'linear-gradient(180deg, #17213B 0px, #17213B 150px, rgba(23,33,59,0) 215px),' +
          'linear-gradient(180deg, rgba(25,37,64,0.76) 0%, rgba(18,28,50,0.8) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        top: 0,
        left: 0,
        height: 1,
        overflowX: 'hidden',
        display: 'none',
        position: 'fixed',
        flexDirection: 'column',
        zIndex: 'var(--layout-nav-zIndex)',
        width: 'var(--layout-nav-vertical-width)',
        borderRight: `1px solid ${varAlpha(theme.vars.palette.common.whiteChannel, 0.12)}`,
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.035)',
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
          overflowX: 'hidden',
          overflowY: 'hidden',
          width: 'var(--layout-nav-mobile-width)',
          bgcolor: 'rgba(18,28,50,0.78)',
          backgroundImage:
            'linear-gradient(180deg, rgba(25,37,64,0.82) 0%, rgba(18,28,50,0.88) 100%)',
          backdropFilter: 'blur(30px) saturate(185%)',
          WebkitBackdropFilter: 'blur(30px) saturate(185%)',
          borderRight: '1px solid rgba(255,255,255,0.12)',
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
          mb: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Logo sx={{ width: 96, height: 96 }} />
      </Box>

      <Box sx={{ mb: 2.75 }}>
        <LicenseSafetyGuideButton />
      </Box>

      {slots?.topArea}

      <Scrollbar
        fillContent
        sx={{
          overflowX: 'hidden',
          '& .simplebar-wrapper': {
            overflowX: 'hidden',
          },
          '& .simplebar-mask': {
            overflowX: 'hidden',
          },
          '& .simplebar-offset': {
            right: 0,
            overflowX: 'hidden',
          },
          '& .simplebar-content-wrapper': {
            overflowX: 'hidden !important',
          },
          '& .simplebar-content': {
            overflowX: 'hidden',
          },
          '& .simplebar-track.simplebar-horizontal': {
            display: 'none',
          },
        }}
      >
        <Box
          component="nav"
          sx={[
            {
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
              minWidth: 0,
              width: 1,
              overflowX: 'hidden',
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
              minWidth: 0,
              width: 1,
              m: 0,
              p: 0,
              listStyle: 'none',
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
                <ListItem disableGutters disablePadding sx={{ minWidth: 0, width: 1 }}>
                  <ListItemButton
                    disableGutters
                    {...navButtonProps}
                    sx={[
                      (theme) => ({
                        pl: 1.5,
                        py: 1.05,
                        gap: 1.5,
                        pr: 1.5,
                        minWidth: 0,
                        width: 1,
                        borderRadius: 1.4,
                        typography: 'body2',
                        fontWeight: 'fontWeightMedium',
                        minHeight: 54,
                        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.68),
                        transition:
                          'background 240ms cubic-bezier(0.32,0.72,0,1), color 240ms cubic-bezier(0.32,0.72,0,1), transform 260ms cubic-bezier(0.32,0.72,0,1), box-shadow 240ms cubic-bezier(0.32,0.72,0,1), border-color 240ms cubic-bezier(0.32,0.72,0,1)',
                        '@media (hover: hover)': {
                          '&:hover': {
                            background:
                              'linear-gradient(180deg, rgba(255,255,255,0.095) 0%, rgba(255,255,255,0.035) 100%)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                            color: theme.vars.palette.common.white,
                            transform: 'translateX(2px) scale(1.006)',
                          },
                        },
                        '&:active': { transform: 'scale(0.98)' },
                        '@media (prefers-reduced-motion: reduce)': {
                          transition: 'none',
                          '&:hover': { transform: 'none' },
                          '&:active': { transform: 'none' },
                        },
                        ...(isDisabled && {
                          opacity: 0.6,
                          cursor: 'pointer',
                          '@media (hover: hover)': {
                            '&:hover': {
                              bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.04),
                              color: varAlpha(theme.vars.palette.common.whiteChannel, 0.78),
                              transform: 'none',
                            },
                          },
                        }),
                        ...(isActived && {
                          fontWeight: 'fontWeightSemiBold',
                          color: theme.vars.palette.common.white,
                          background:
                            'linear-gradient(180deg, rgba(120,165,226,0.16) 0%, rgba(58,86,132,0.1) 100%)',
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(15,23,42,0.22), inset 0 0 0 1px ${varAlpha(theme.vars.palette.common.whiteChannel, 0.13)}`,
                          '@media (hover: hover)': {
                            '&:hover': {
                              background:
                                'linear-gradient(180deg, rgba(128,174,236,0.18) 0%, rgba(58,86,132,0.12) 100%)',
                              transform: 'translateX(1px)',
                            },
                          },
                        }),
                      }),
                    ]}
                  >
                    <Box
                      component="span"
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 1.3,
                        color: 'inherit',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        lineHeight: 0,
                        position: 'relative',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.026))',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                        transition:
                          'background 240ms cubic-bezier(0.32,0.72,0,1), border-color 240ms cubic-bezier(0.32,0.72,0,1), box-shadow 240ms cubic-bezier(0.32,0.72,0,1), transform 240ms cubic-bezier(0.32,0.72,0,1)',
                        '& .nav-glyph': {
                          position: 'absolute',
                          inset: 0,
                          display: 'grid',
                          placeItems: 'center',
                          lineHeight: 0,
                          transform: 'translate(var(--nav-icon-x, 0px), var(--nav-icon-y, 0px))',
                          pointerEvents: 'none',
                        },
                        '& svg': {
                          display: 'block',
                          width: 'var(--nav-icon-size, 25.5px)',
                          height: 'var(--nav-icon-size, 25.5px)',
                          flexShrink: 0,
                          margin: 0,
                          overflow: 'visible',
                        },
                        ...(isActived && {
                          background: 'linear-gradient(180deg, rgba(226,242,255,0.12), rgba(120,165,226,0.055))',
                          borderColor: 'rgba(226,242,255,0.2)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
                        }),
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Box
                      component="span"
                      sx={{
                        flexGrow: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
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
