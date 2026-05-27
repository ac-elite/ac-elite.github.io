import type { Theme } from '@mui/material/styles';

import { createTheme as createMuiTheme } from '@mui/material/styles';

import { shadows } from './core/shadows';
import { palette } from './core/palette';
import { themeConfig } from './theme-config';
import { components } from './core/components';
import { typography } from './core/typography';
import { customShadows } from './core/custom-shadows';

import type { ThemeOptions } from './types';

// ----------------------------------------------------------------------

const FLUID_SPACING_MIN_PX = 6;
const FLUID_SPACING_BASE_PX = 4.6;
const FLUID_SPACING_VW = 0.36;
const FLUID_SPACING_MAX_PX = 8;

function roundSpacingValue(value: number) {
  return Number(value.toFixed(4));
}

function fluidSpacingValue(factor: number) {
  const min = roundSpacingValue(FLUID_SPACING_MIN_PX * factor);
  const base = roundSpacingValue(FLUID_SPACING_BASE_PX * factor);
  const vw = roundSpacingValue(FLUID_SPACING_VW * factor);
  const max = roundSpacingValue(FLUID_SPACING_MAX_PX * factor);
  const clampMin = Math.min(min, max);
  const clampMax = Math.max(min, max);
  const operator = vw < 0 ? '-' : '+';

  return `clamp(${clampMin}px, calc(${base}px ${operator} ${Math.abs(vw)}vw), ${clampMax}px)`;
}

function fluidSpacing(...args: Array<number | string>) {
  const values = args.length ? args : [1];

  return values
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value === 0) return '0px';

      return fluidSpacingValue(value);
    })
    .join(' ');
}

// ----------------------------------------------------------------------

export const baseTheme: ThemeOptions = {
  colorSchemes: {
    light: {
      palette: palette.light,
      shadows: shadows.light,
      customShadows: customShadows.light,
    },
  },
  components,
  typography,
  spacing: fluidSpacing,
  shape: { borderRadius: 10 },
  cssVariables: themeConfig.cssVariables,
};

// ----------------------------------------------------------------------

type CreateThemeProps = {
  themeOverrides?: ThemeOptions;
};

export function createTheme({ themeOverrides = {} }: CreateThemeProps = {}): Theme {
  const theme = createMuiTheme(baseTheme, themeOverrides);

  return theme;
}
