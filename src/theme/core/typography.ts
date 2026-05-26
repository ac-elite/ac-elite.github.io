import type { CSSObject, TypographyVariantsOptions } from '@mui/material/styles';

import { pxToRem } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */
export type FontStyleExtend = {
  fontWeightSemiBold: CSSObject['fontWeight'];
  fontSecondaryFamily: CSSObject['fontFamily'];
};

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
    fontSize: 'clamp(2rem, 1.15rem + 4.2vw, 3.5rem)',
    letterSpacing: 0,
  },
  h2: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.12,
    fontSize: 'clamp(1.6rem, 1rem + 3.2vw, 2.75rem)',
    letterSpacing: 0,
  },
  h3: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.2,
    fontSize: 'clamp(1.35rem, 0.95rem + 2vw, 2rem)',
    letterSpacing: 0,
  },
  h4: {
    fontWeight: 700,
    lineHeight: 1.3,
    fontSize: 'clamp(1.15rem, 0.9rem + 1.25vw, 1.5rem)',
    letterSpacing: 0,
  },
  h5: {
    fontWeight: 600,
    lineHeight: 1.4,
    // Grow-only: never below the 18px mobile size, eases up on large screens.
    fontSize: 'clamp(1.125rem, 1.05rem + 0.32vw, 1.3rem)',
    letterSpacing: 0,
  },
  h6: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: 'clamp(1.0625rem, 1rem + 0.28vw, 1.2rem)',
    letterSpacing: 0,
  },
  subtitle1: {
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
    letterSpacing: 0,
  },
  subtitle2: {
    fontWeight: 600,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
    letterSpacing: 0,
  },
  body1: {
    lineHeight: 1.55,
    fontSize: pxToRem(16),
    letterSpacing: 0,
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
    letterSpacing: 0,
    textTransform: 'unset',
  },
};
