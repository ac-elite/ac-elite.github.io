import { varAlpha } from 'minimal-shared/utils';

import { info, error, common, primary, success, warning, secondary } from './palette';

import type { ThemeColorScheme } from '../types';

// ----------------------------------------------------------------------

/**
 * TypeScript (type definition and extension)
 * @to {@link file://./../extend-theme-types.d.ts}
 */

export interface CustomShadows {
  z1?: string;
  z4?: string;
  z8?: string;
  z12?: string;
  z16?: string;
  z20?: string;
  z24?: string;
  primary?: string;
  secondary?: string;
  info?: string;
  success?: string;
  warning?: string;
  error?: string;
  card?: string;
  dialog?: string;
  dropdown?: string;
}

// ----------------------------------------------------------------------

export function createShadowColor(colorChannel: string): string {
  return `0 8px 16px 0 ${varAlpha(colorChannel, 0.24)}`;
}

function createCustomShadows(colorChannel: string): CustomShadows {
  return {
    z1: `0 1px 2px 0 ${varAlpha(colorChannel, 0.16)}`,
    z4: `0 4px 8px 0 ${varAlpha(colorChannel, 0.16)}`,
    z8: `0 8px 16px 0 ${varAlpha(colorChannel, 0.16)}`,
    z12: `0 12px 24px -4px ${varAlpha(colorChannel, 0.16)}`,
    z16: `0 16px 32px -4px ${varAlpha(colorChannel, 0.16)}`,
    z20: `0 20px 40px -4px ${varAlpha(colorChannel, 0.16)}`,
    z24: `0 24px 48px 0 ${varAlpha(colorChannel, 0.16)}`,
    /********/
    dialog: `0 2px 8px -2px ${varAlpha(common.blackChannel, 0.32)}, -40px 40px 80px -8px ${varAlpha(common.blackChannel, 0.5)}`,
    // Soft, layered Apple-style elevation: a tight contact shadow + a wide
    // ambient one. Reads as real depth on the dark navy surface.
    card: `0 1px 2px 0 ${varAlpha(colorChannel, 0.32)}, 0 10px 28px -8px ${varAlpha(colorChannel, 0.46)}`,
    dropdown: `0 1px 2px 0 ${varAlpha(colorChannel, 0.3)}, 0 16px 40px -8px ${varAlpha(colorChannel, 0.5)}`,
    /********/
    primary: createShadowColor(primary.mainChannel),
    secondary: createShadowColor(secondary.mainChannel),
    info: createShadowColor(info.mainChannel),
    success: createShadowColor(success.mainChannel),
    warning: createShadowColor(warning.mainChannel),
    error: createShadowColor(error.mainChannel),
  };
}

export const customShadows: Partial<Record<ThemeColorScheme, CustomShadows>> = {
  light: createCustomShadows(common.blackChannel),
};
