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
  fontFamily: {
    primary: 'Poppins',
    secondary: 'Poppins',
  },
  /** **************************************
   * Palette
   *************************************** */
  palette: {
    primary: {
      lighter: '#2b3857',
      light: '#1f2c49',
      main: '#17213B', // Elite Blue (official)
      dark: '#121a2f',
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
    info: {
      lighter: '#E4EAF7',
      light: '#95A5C8',
      main: '#5B6F9E',
      dark: '#2F4472',
      darker: '#1B2E55',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#E4EAF7',
      light: '#95A5C8',
      main: '#5B6F9E',
      dark: '#2F4472',
      darker: '#1B2E55',
      contrastText: '#ffffff',
    },
    warning: {
      lighter: '#E4EAF7',
      light: '#95A5C8',
      main: '#5B6F9E',
      dark: '#2F4472',
      darker: '#1B2E55',
      contrastText: '#FFFFFF',
    },
    error: {
      lighter: '#FFE9D5',
      light: '#FFAC82',
      main: '#FF5630',
      dark: '#B71D18',
      darker: '#7A0916',
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
