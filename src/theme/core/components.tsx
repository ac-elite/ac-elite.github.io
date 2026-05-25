import type { Theme, Components } from '@mui/material/styles';

import { varAlpha } from 'minimal-shared/utils';

import SvgIcon from '@mui/material/SvgIcon';

import { GLASS_BOXJE_RIM_SHADOW, GLASS_BOXJE_RIM_SHADOW_HOVER } from 'src/lib/glass';

// ----------------------------------------------------------------------

/** Apple easing — smooth ease-out for fills/shadows, gentle spring for press. */
const EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';
const SPRING = 'cubic-bezier(0.34, 1.4, 0.5, 1)';

/** The nav "boxje" rim (bright top + grounding bottom + full hairline), shared by all glass buttons. */
const glassBoxInset = GLASS_BOXJE_RIM_SHADOW;
const glassBoxInsetHover = GLASS_BOXJE_RIM_SHADOW_HOVER;

const MuiBackdrop: Components<Theme>['MuiBackdrop'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      // Apple blurs whatever sits behind a sheet/dialog.
      backgroundColor: varAlpha(theme.vars.palette.grey['900Channel'], 0.66),
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
    }),
    invisible: {
      background: 'transparent',
      backdropFilter: 'none',
      WebkitBackdropFilter: 'none',
    },
  },
};

const MuiButton: Components<Theme>['MuiButton'] = {
  defaultProps: {
    disableElevation: true,
    disableRipple: true,
  },
  styleOverrides: {
    root: {
      textTransform: 'none' as const,
      fontWeight: 700,
      // Soft rounded rectangle to match the nav "boxje" — not a full pill.
      borderRadius: 14,
      // Spring on transform (the press/lift), smooth ease on everything else.
      transition: `transform 260ms ${EASE_OUT}, box-shadow 260ms ${EASE_OUT}, border-color 260ms ${EASE_OUT}, background 260ms ${EASE_OUT}, background-color 260ms ${EASE_OUT}, filter 260ms ${EASE_OUT}`,
      '& .MuiButton-startIcon, & .MuiButton-endIcon': {
        color: 'currentColor',
        transition: `transform 240ms ${EASE_OUT}, filter 240ms ${EASE_OUT}, opacity 240ms ${EASE_OUT}`,
      },
      '&:hover .MuiButton-startIcon, &:hover .MuiButton-endIcon': {
        transform: 'translateY(-1px)',
      },
      '&:focus-visible': {
        outline: '2px solid rgba(191,225,255,0.34)',
        outlineOffset: 3,
      },
      // Apple press: the control compresses slightly when tapped.
      '&:active': {
        transform: 'scale(0.97)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:active': { transform: 'none' },
      },
    },
    /** Main CTA — tinted navy glass pill: translucent fill so the backdrop blooms through, nav "boxje" rim. */
    containedPrimary: ({ theme }) => ({
      color: theme.palette.primary.contrastText,
      textShadow: '0 1px 0 rgba(15,23,42,0.35)',
      background:
        'linear-gradient(180deg, rgba(96,150,236,0.52) 0%, rgba(48,98,196,0.48) 100%)',
      backdropFilter: 'blur(22px) saturate(185%)',
      WebkitBackdropFilter: 'blur(22px) saturate(185%)',
      border: '1px solid rgba(219,234,254,0.22)',
      boxShadow: `${glassBoxInset}, 0 1px 2px rgba(0,0,0,0.18), 0 12px 26px -18px rgba(28,72,150,0.7)`,
      '&:hover': {
        background:
          'linear-gradient(180deg, rgba(110,164,245,0.58) 0%, rgba(56,110,212,0.54) 100%)',
        borderColor: 'rgba(226,242,255,0.4)',
        boxShadow: `${glassBoxInsetHover}, 0 2px 4px rgba(0,0,0,0.2), 0 16px 30px -18px rgba(28,72,150,0.82)`,
        transform: 'translateY(-1px)',
      },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
      '&:disabled': {
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.4),
        background: varAlpha(theme.vars.palette.grey['800Channel'], 0.55),
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
        boxShadow: 'none',
        transform: 'none',
      },
    }),
    /** Secondary filled — graphite glass, distinct from the navy primary, same nav "boxje" rim. */
    containedSecondary: ({ theme }) => ({
      color: theme.palette.secondary.contrastText,
      background: 'linear-gradient(180deg, rgba(60,72,98,0.5) 0%, rgba(40,50,72,0.44) 100%)',
      border: '1px solid rgba(226,242,255,0.16)',
      backdropFilter: 'blur(22px) saturate(170%)',
      WebkitBackdropFilter: 'blur(22px) saturate(170%)',
      boxShadow: `${glassBoxInset}, 0 1px 2px rgba(0,0,0,0.2)`,
      '&:hover': {
        background: 'linear-gradient(180deg, rgba(70,84,114,0.56) 0%, rgba(46,58,84,0.5) 100%)',
        borderColor: 'rgba(226,242,255,0.26)',
        boxShadow: `${glassBoxInsetHover}, 0 2px 4px rgba(0,0,0,0.22)`,
        transform: 'translateY(-1px)',
      },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
      '&:disabled': {
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.4),
        background: varAlpha(theme.vars.palette.grey['800Channel'], 0.5),
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
        boxShadow: 'none',
        transform: 'none',
      },
    }),
    /** Light navy glass — mirrors the active nav "boxje" (faint blue bloom + bright rim). */
    outlinedPrimary: ({ theme }) => ({
      color: 'rgba(255,255,255,0.94)',
      borderColor: 'rgba(147,180,236,0.28)',
      background: 'linear-gradient(180deg, rgba(96,150,236,0.16) 0%, rgba(50,86,150,0.08) 100%)',
      backdropFilter: 'blur(20px) saturate(170%)',
      WebkitBackdropFilter: 'blur(20px) saturate(170%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(147,180,236,0.1)',
      '&:hover': {
        borderColor: 'rgba(180,206,247,0.42)',
        background: 'linear-gradient(180deg, rgba(108,162,244,0.22) 0%, rgba(56,96,168,0.12) 100%)',
        transform: 'translateY(-1px)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(15,23,42,0.2), inset 0 0 0 1px rgba(180,206,247,0.18)',
      },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
      '&:disabled': {
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.32),
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.1),
        transform: 'none',
      },
    }),
    /** Neutral white glass — mirrors the nav hover "boxje". */
    outlinedSecondary: ({ theme }) => ({
      color: 'rgba(255,255,255,0.9)',
      borderColor: 'rgba(226,242,255,0.18)',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.028) 100%)',
      backdropFilter: 'blur(20px) saturate(165%)',
      WebkitBackdropFilter: 'blur(20px) saturate(165%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
      '&:hover': {
        borderColor: 'rgba(226,242,255,0.32)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.045) 100%)',
        transform: 'translateY(-1px)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(15,23,42,0.18), inset 0 0 0 1px rgba(226,242,255,0.14)',
      },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
      '&:disabled': {
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.32),
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.1),
        transform: 'none',
      },
    }),
    containedInherit: ({ theme }) => ({
      color: theme.vars.palette.common.white,
      background: 'linear-gradient(180deg, rgba(58,70,96,0.5) 0%, rgba(38,48,70,0.44) 100%)',
      border: '1px solid rgba(226,242,255,0.15)',
      backdropFilter: 'blur(22px) saturate(170%)',
      WebkitBackdropFilter: 'blur(22px) saturate(170%)',
      boxShadow: `${glassBoxInset}, 0 1px 2px rgba(0,0,0,0.2)`,
      '&:hover': {
        color: theme.vars.palette.common.white,
        background: 'linear-gradient(180deg, rgba(68,82,112,0.56) 0%, rgba(44,56,82,0.5) 100%)',
        borderColor: 'rgba(226,242,255,0.24)',
        boxShadow: `${glassBoxInsetHover}, 0 2px 4px rgba(0,0,0,0.22)`,
        transform: 'translateY(-1px)',
      },
      '&:active': { transform: 'translateY(0) scale(0.97)' },
    }),
    sizeLarge: {
      minHeight: 48,
    },
  },
};

const MuiIconButton: Components<Theme>['MuiIconButton'] = {
  defaultProps: {
    disableRipple: true,
  },
  styleOverrides: {
    root: ({ theme }) => ({
      transition: `transform 240ms ${EASE_OUT}, box-shadow 240ms ${EASE_OUT}, border-color 240ms ${EASE_OUT}, background-color 240ms ${EASE_OUT}, color 240ms ${EASE_OUT}`,
      '& svg': {
        transition: `transform 240ms ${EASE_OUT}`,
      },
      '&:hover': {
        backgroundColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.07),
        transform: 'translateY(-1px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
      },
      '&:hover svg': {
        transform: 'scale(1.04)',
      },
      '&:active': {
        transform: 'scale(0.96)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover, &:active': { transform: 'none' },
      },
    }),
  },
};

const MuiCard: Components<Theme>['MuiCard'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      zIndex: 0,
      position: 'relative',
      boxShadow: theme.vars.customShadows.card,
      borderRadius: theme.shape.borderRadius * 2,
      border: '1px solid rgba(255,255,255,0.08)',
    }),
  },
};

const MuiCardHeader: Components<Theme>['MuiCardHeader'] = {
  defaultProps: {
    titleTypographyProps: { variant: 'h6' },
    subheaderTypographyProps: { variant: 'body2' },
  },
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3, 3, 0),
    }),
  },
};

const MuiOutlinedInput: Components<Theme>['MuiOutlinedInput'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderRadius: 12,
      backgroundColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.035),
      backdropFilter: 'blur(18px) saturate(160%)',
      WebkitBackdropFilter: 'blur(18px) saturate(160%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      transition: `box-shadow 260ms ${EASE_OUT}, background-color 260ms ${EASE_OUT}, transform 260ms ${EASE_OUT}`,
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.28),
        transition: `border-color 260ms ${EASE_OUT}`,
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.5),
      },
      '&:hover': {
        backgroundColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.048),
      },
      '&.Mui-focused': {
        boxShadow: 'inset 0 0 0 1px rgba(147, 197, 253, 0.32)',
        backgroundColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.05),
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#93c5fd',
        borderWidth: 2,
      },
      '&.Mui-error .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.vars.palette.error.main,
      },
      '&.Mui-error.Mui-focused': {
        boxShadow: 'inset 0 0 0 1px rgba(248, 113, 113, 0.32)',
      },
      '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
        borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.14),
      },
    }),
    input: ({ theme }) => ({
      '&::placeholder': {
        opacity: 1,
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.55),
      },
    }),
  },
};

const MuiInputLabel: Components<Theme>['MuiInputLabel'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: varAlpha(theme.vars.palette.common.whiteChannel, 0.72),
      '&.Mui-focused': {
        color: '#bfdbfe',
      },
      '&.Mui-disabled': {
        color: varAlpha(theme.vars.palette.common.whiteChannel, 0.38),
      },
      '&.Mui-error': {
        color: theme.vars.palette.error.main,
      },
    }),
  },
};

const MuiFormHelperText: Components<Theme>['MuiFormHelperText'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: varAlpha(theme.vars.palette.common.whiteChannel, 0.72),
      '&.Mui-error': {
        color: theme.vars.palette.error.main,
      },
    }),
  },
};

const MuiPaper: Components<Theme>['MuiPaper'] = {
  defaultProps: { elevation: 0 },
  styleOverrides: {
    root: { backgroundImage: 'none' },
    outlined: ({ theme }) => ({
      borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
    }),
  },
};

const MuiTableCell: Components<Theme>['MuiTableCell'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.1),
    }),
    head: ({ theme }) => ({
      fontSize: theme.typography.pxToRem(13),
      color: varAlpha(theme.vars.palette.common.whiteChannel, 0.88),
      fontWeight: 800,
      letterSpacing: 0.3,
      backgroundColor: 'rgba(148,163,184,0.12)',
      boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.1)',
      whiteSpace: 'nowrap' as const,
    }),
    body: () => ({
      backgroundColor: 'rgba(18,31,56,0.58)',
    }),
  },
};

const MuiMenuItem: Components<Theme>['MuiMenuItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.body2,
      borderRadius: 9,
      margin: theme.spacing(0, 0.75),
      transition: `background-color 200ms ${EASE_OUT}`,
    }),
  },
};

const MuiToggleButtonGroup: Components<Theme>['MuiToggleButtonGroup'] = {
  styleOverrides: {
    root: {
      padding: 3,
      borderRadius: 12,
      background: 'linear-gradient(180deg, rgba(20,32,56,0.52), rgba(12,22,42,0.46))',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(18px) saturate(165%)',
      WebkitBackdropFilter: 'blur(18px) saturate(165%)',
      // Full boxje rim, not a top-only highlight — otherwise the bottom edge sinks
      // into the dark end of the gradient and reads as a missing border.
      boxShadow: GLASS_BOXJE_RIM_SHADOW,
      gap: 3,
    },
  },
};

const MuiToggleButton: Components<Theme>['MuiToggleButton'] = {
  defaultProps: {
    disableRipple: true,
  },
  styleOverrides: {
    root: {
      border: 0,
      borderRadius: 9,
      color: 'rgba(226,232,240,0.58)',
      transition: `transform 240ms ${EASE_OUT}, background 240ms ${EASE_OUT}, box-shadow 240ms ${EASE_OUT}, color 240ms ${EASE_OUT}`,
      '&.MuiToggleButtonGroup-grouped': {
        borderRadius: 9,
        border: 0,
        margin: 0,
      },
      '&:hover': {
        color: '#fff',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.035) 100%)',
        transform: 'translateY(-1px)',
      },
      '&.Mui-selected': {
        color: '#fff',
        background:
          'linear-gradient(180deg, rgba(96,165,250,0.32) 0%, rgba(59,130,246,0.16) 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(15,23,42,0.2)',
      },
      '&.Mui-selected:hover': {
        background:
          'linear-gradient(180deg, rgba(111,178,255,0.38) 0%, rgba(59,130,246,0.2) 100%)',
      },
      '&.Mui-disabled': {
        color: 'rgba(226,232,240,0.28)',
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': { transform: 'none' },
      },
    },
  },
};

const MuiLink: Components<Theme>['MuiLink'] = {
  defaultProps: { underline: 'hover' },
};

const MuiFormControlLabel: Components<Theme>['MuiFormControlLabel'] = {
  styleOverrides: {
    label: ({ theme }) => ({
      ...theme.typography.body2,
    }),
  },
};

const MuiCheckbox: Components<Theme>['MuiCheckbox'] = {
  defaultProps: {
    size: 'small',
    icon: (
      <SvgIcon>
        <path d="M17.9 2.318A5 5 0 0 1 22.895 7.1l.005.217v10a5 5 0 0 1-4.783 4.995l-.217.005h-10a5 5 0 0 1-4.995-4.783l-.005-.217v-10a5 5 0 0 1 4.783-4.996l.217-.004h10Zm-.5 1.5h-9a4 4 0 0 0-4 4v9a4 4 0 0 0 4 4h9a4 4 0 0 0 4-4v-9a4 4 0 0 0-4-4Z" />
      </SvgIcon>
    ),
    checkedIcon: (
      <SvgIcon>
        <path d="M17 2a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm-1.625 7.255-4.13 4.13-1.75-1.75a.881.881 0 0 0-1.24 0c-.34.34-.34.89 0 1.24l2.38 2.37c.17.17.39.25.61.25.23 0 .45-.08.62-.25l4.75-4.75c.34-.34.34-.89 0-1.24a.881.881 0 0 0-1.24 0Z" />
      </SvgIcon>
    ),
    indeterminateIcon: (
      <SvgIcon>
        <path d="M17,2 C19.7614,2 22,4.23858 22,7 L22,7 L22,17 C22,19.7614 19.7614,22 17,22 L17,22 L7,22 C4.23858,22 2,19.7614 2,17 L2,17 L2,7 C2,4.23858 4.23858,2 7,2 L7,2 Z M15,11 L9,11 C8.44772,11 8,11.4477 8,12 C8,12.5523 8.44772,13 9,13 L15,13 C15.5523,13 16,12.5523 16,12 C16,11.4477 15.5523,11 15,11 Z" />
      </SvgIcon>
    ),
  },
};

const MuiRadio: Components<Theme>['MuiRadio'] = {
  defaultProps: {
    size: 'small',
    icon: (
      <SvgIcon>
        <path
          d="M12 2C13.9778 2 15.9112 2.58649 17.5557 3.6853C19.2002 4.78412 20.4819 6.3459 21.2388 8.17317C21.9957 10.0004 22.1937 12.0111 21.8079 13.9509C21.422 15.8907 20.4696 17.6725 19.0711 19.0711C17.6725 20.4696 15.8907 21.422 13.9509 21.8079C12.0111 22.1937 10.0004 21.9957 8.17317 21.2388C6.3459 20.4819 4.78412 19.2002 3.6853 17.5557C2.58649 15.9112 2 13.9778 2 12C2 6.477 6.477 2 12 2ZM12 3.5C9.74566 3.5 7.58365 4.39553 5.98959 5.98959C4.39553 7.58365 3.5 9.74566 3.5 12C3.5 14.2543 4.39553 16.4163 5.98959 18.0104C7.58365 19.6045 9.74566 20.5 12 20.5C14.2543 20.5 16.4163 19.6045 18.0104 18.0104C19.6045 16.4163 20.5 14.2543 20.5 12C20.5 9.74566 19.6045 7.58365 18.0104 5.98959C16.4163 4.39553 14.2543 3.5 12 3.5Z"
          fill="currentColor"
        />
      </SvgIcon>
    ),
    checkedIcon: (
      <SvgIcon>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 8C10.9391 8 9.92172 8.42143 9.17157 9.17157C8.42143 9.92172 8 10.9391 8 12C8 13.0609 8.42143 14.0783 9.17157 14.8284C9.92172 15.5786 10.9391 16 12 16C13.0609 16 14.0783 15.5786 14.8284 14.8284C15.5786 14.0783 16 13.0609 16 12C16 10.9391 15.5786 9.92172 14.8284 9.17157C14.0783 8.42143 13.0609 8 12 8Z"
          fill="currentColor"
        />
      </SvgIcon>
    ),
  },
};

const MuiChip: Components<Theme>['MuiChip'] = {
  styleOverrides: {
    root: {
      borderRadius: 9,
      fontWeight: 600,
      transition: `transform 240ms ${SPRING}, background-color 240ms ${EASE_OUT}`,
    },
    label: {
      letterSpacing: 0,
    },
  },
};

/** Apple-style dark glass tooltip — blurred, rounded, soft shadow. */
const MuiTooltip: Components<Theme>['MuiTooltip'] = {
  styleOverrides: {
    tooltip: ({ theme }) => ({
      ...theme.typography.caption,
      fontWeight: 600,
      borderRadius: 10,
      padding: theme.spacing(0.75, 1.25),
      backgroundColor: 'rgba(16,24,44,0.86)',
      backdropFilter: 'blur(12px) saturate(160%)',
      WebkitBackdropFilter: 'blur(12px) saturate(160%)',
      border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 8px 26px -8px rgba(0,0,0,0.6)',
    }),
    arrow: {
      color: 'rgba(16,24,44,0.86)',
    },
  },
};

/** Menu / select dropdown surface — vibrancy glass, rounded, layered shadow. */
const MuiMenu: Components<Theme>['MuiMenu'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(24,35,61,0.82)',
      backgroundImage: 'none',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: theme.vars.customShadows.dropdown,
    }),
  },
};

const MuiPopover: Components<Theme>['MuiPopover'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(24,35,61,0.82)',
      backgroundImage: 'none',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: theme.vars.customShadows.dropdown,
    }),
  },
};

const MuiDialog: Components<Theme>['MuiDialog'] = {
  styleOverrides: {
    paper: ({ theme }) => ({
      borderRadius: 20,
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundImage: 'none',
      boxShadow: theme.vars.customShadows.dialog,
    }),
  },
};

// ----------------------------------------------------------------------

export const components = {
  MuiCard,
  MuiChip,
  MuiLink,
  MuiMenu,
  MuiPaper,
  MuiRadio,
  MuiButton,
  MuiDialog,
  MuiTooltip,
  MuiPopover,
  MuiBackdrop,
  MuiIconButton,
  MuiMenuItem,
  MuiCheckbox,
  MuiToggleButton,
  MuiToggleButtonGroup,
  MuiTableCell,
  MuiCardHeader,
  MuiOutlinedInput,
  MuiInputLabel,
  MuiFormHelperText,
  MuiFormControlLabel,
};
