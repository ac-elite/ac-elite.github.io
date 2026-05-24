import type { CSSObject, Breakpoint, TypographyVariantsOptions } from '@mui/material/styles';

import { pxToRem } from 'minimal-shared/utils';

import { createTheme as getTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */
export type FontStyleExtend = {
  fontWeightSemiBold: CSSObject['fontWeight'];
  fontSecondaryFamily: CSSObject['fontFamily'];
};

export type ResponsiveFontSizesInput = Partial<Record<Breakpoint, number>>;
export type ResponsiveFontSizesResult = Record<string, { fontSize: string }>;

const defaultMuiTheme = getTheme();

function responsiveFontSizes(obj: ResponsiveFontSizesInput): ResponsiveFontSizesResult {
  const breakpoints: Breakpoint[] = defaultMuiTheme.breakpoints.keys;

  return breakpoints.reduce((acc, breakpoint) => {
    const value = obj[breakpoint];

    if (value !== undefined && value >= 0) {
      acc[defaultMuiTheme.breakpoints.up(breakpoint)] = {
        fontSize: pxToRem(value),
      };
    }

    return acc;
  }, {} as ResponsiveFontSizesResult);
}

// ----------------------------------------------------------------------

/**
 * San Francisco first. Apple devices render genuine SF Pro via -apple-system /
 * BlinkMacSystemFont. Everyone else (incl. Windows / Android) falls back to
 * Inter — the closest free SF substitute — then platform UI fonts. We do NOT
 * self-host SF Pro: Apple's licence forbids redistributing it as a web font,
 * so the system-font route is the only legitimate way to get real SF on-device.
 */
const SF_TEXT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter Variable", "Inter", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SF_DISPLAY_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter Variable", "Inter", system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/** SF Mono on Apple; platform monospace elsewhere. For laptimes / numeric data. */
export const MONO_FONT_STACK =
  'ui-monospace, "SF Mono", "SFMono-Regular", Menlo, "Cascadia Code", "Roboto Mono", Consolas, "Liberation Mono", monospace';

const primaryFont = SF_TEXT_STACK;
const secondaryFont = SF_DISPLAY_STACK;

/**
 * Apple-style type scale: large display sizes carry tight negative tracking
 * (SF Pro Display behaviour), body text breathes a little more, and small
 * eyebrow/overline labels are widely tracked. One family (DM Sans Variable)
 * for everything — the variable weight axis (100–1000) gives SF-like range.
 */
export const typography: TypographyVariantsOptions = {
  fontFamily: primaryFont,
  fontSecondaryFamily: secondaryFont,
  fontWeightLight: '300',
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  fontWeightSemiBold: '600',
  fontWeightBold: '700',
  // Fluid display sizes: clamp() scales smoothly with the viewport between a
  // safe mobile minimum and desktop maximum — accessible (honours zoom via the
  // rem term) where raw `vw` would not.
  h1: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.06,
    fontSize: 'clamp(2.25rem, 1.30rem + 3.6vw, 4rem)',
    letterSpacing: '-0.026em',
  },
  h2: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.12,
    fontSize: 'clamp(1.85rem, 1.25rem + 2.6vw, 3rem)',
    letterSpacing: '-0.023em',
  },
  h3: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: 'clamp(1.4rem, 1.05rem + 1.5vw, 2rem)',
    letterSpacing: '-0.019em',
  },
  h4: {
    fontWeight: 700,
    lineHeight: 1.3,
    fontSize: 'clamp(1.2rem, 1.04rem + 0.7vw, 1.5rem)',
    letterSpacing: '-0.015em',
  },
  h5: {
    fontWeight: 600,
    lineHeight: 1.4,
    fontSize: pxToRem(18),
    letterSpacing: '-0.012em',
    ...responsiveFontSizes({ sm: 19 }),
  },
  h6: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: pxToRem(17),
    letterSpacing: '-0.01em',
    ...responsiveFontSizes({ sm: 18 }),
  },
  subtitle1: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
    letterSpacing: '-0.008em',
  },
  subtitle2: {
    fontWeight: 600,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
    letterSpacing: '-0.006em',
  },
  body1: {
    lineHeight: 1.55,
    fontSize: pxToRem(16),
    letterSpacing: '-0.003em',
  },
  body2: {
    lineHeight: 1.57,
    fontSize: pxToRem(14),
    letterSpacing: 0,
  },
  caption: {
    lineHeight: 1.5,
    fontSize: pxToRem(12),
    letterSpacing: 0,
  },
  overline: {
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(12),
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  button: {
    fontWeight: 600,
    lineHeight: 24 / 14,
    fontSize: pxToRem(14),
    letterSpacing: '-0.006em',
    textTransform: 'unset',
  },
};
