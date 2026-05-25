import type { CommonColors } from '@mui/material/styles';

import type { ThemeCssVariables } from './types';
import type { PaletteColorNoChannels } from './core/palette';

// ----------------------------------------------------------------------

type ThemeConfig = {
  classesPrefix: string;
  cssVariables: ThemeCssVariables;
  fontFamily: Record<'primary' | 'secondary', string>;
  palette: Record<
    'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error',
    PaletteColorNoChannels
  > & {
    common: Pick<CommonColors, 'black' | 'white'>;
    grey: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
      string
    >;
  };
};

export const themeConfig: ThemeConfig = {
  /** **************************************
   * Base
   *************************************** */
  classesPrefix: 'minimal',
  /** **************************************
   * Typography
   *************************************** */
  // Reference only — the real San Francisco-first stacks live in
  // theme/core/typography.ts (Apple devices get genuine SF via -apple-system).
  fontFamily: {
    primary: 'SF Pro Text',
    secondary: 'SF Pro Display',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: '#2b3857',
      light: '#1f2c49',
      // Elite Blue — the deep brand surface color (cards, panels, brand identity).
      // The navbar/sidebar base is the slightly lighter #17213B (matches the logo
      // background) and lives in the shared nav-surface token in src/lib/glass.ts.
      main: '#101F3D',
      dark: '#0c1830',
      darker: '#0a1020',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#3b3436',
      light: '#302a2b',
      main: '#231f20', // Dark Graphite
      dark: '#161314',
      darker: '#090708',
      contrastText: '#FFFFFF',
    },
    // Semantic colors. Kept in the brand-blue family for `info`, with real
    // green / amber / red for success / warning / error so live data reads
    // instantly. Values match the status hex used across the app
    // (#22c55e / #f59e0b / #ef4444) so the whole site speaks one color language.
    info: {
      lighter: '#DCEAFE',
      light: '#7DB1FB',
      main: '#3B82F6', // brand-adjacent azure (accent blue, not a new hue)
      dark: '#1D4ED8',
      darker: '#172F73',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#DBF7E5',
      light: '#6EE7A1',
      main: '#22C55E', // live / online green
      dark: '#15803D',
      darker: '#0C4A24',
      contrastText: '#06140B',
    },
    warning: {
      lighter: '#FEF0CD',
      light: '#FBC65A',
      main: '#F59E0B', // delayed / caution amber
      dark: '#B45309',
      darker: '#713F12',
      contrastText: '#241803',
    },
    error: {
      lighter: '#FCE0E0',
      light: '#F8908F',
      main: '#EF4444', // stale / danger red
      dark: '#B91C1C',
      darker: '#7F1416',
      contrastText: '#FFFFFF',
    },
    grey: {
      '50': '#FCFDFD',
      '100': '#F9FAFB',
      '200': '#F4F6F8',
      '300': '#DFE3E8',
      '400': '#C4CDD5',
      '500': '#919EAB',
      '600': '#637381',
      '700': '#454F5B',
      '800': '#1C252E',
      '900': '#141A21',
    },
    common: { black: '#000000', white: '#FFFFFF' },
  },
  /** **************************************
   * Css variables
   *************************************** */
  cssVariables: {
    cssVarPrefix: '',
    colorSchemeSelector: 'data-color-scheme',
  },
};
