import { alpha, keyframes, type Theme, type SxProps } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/**
 * AC Elite brand surfaces — single source of truth for the navy levels.
 *
 * - `NAV_BASE` (#17213B) is the navbar / sidebar / mobile-header foundation
 *   because it matches the background behind the AC Elite logo.
 * - `ELITE_BLUE` (#101F3D) is the deeper brand surface for the main glass
 *   panels and cards.
 *
 * The `*_RGB` strings feed `rgba(...)` so translucent glass tints stay on-brand
 * instead of drifting to ad-hoc blues.
 */
export const BRAND = {
  navBase: '#17213B',
  navBaseRgb: '23,33,59',
  eliteBlue: '#101F3D',
  eliteBlueRgb: '16,31,61',
  graphite: '#231F20',
} as const;

/**
 * Rim pulse on `::after` above content (`z-index: 2`, `pointer-events: none`) so the glow is
 * actually visible — a full-bleed layer under opaque children was nearly invisible on home/hero.
 */
const glassRimPulse = keyframes`
  0%, 100% {
    opacity: 0.54;
    box-shadow: inset 0 0 0 1px rgba(191, 225, 255, 0.24);
  }
  50% {
    opacity: 0.86;
    box-shadow: inset 0 0 0 1px rgba(224, 242, 254, 0.38);
  }
`;

const glassInnerRimPulse = keyframes`
  0%, 100% {
    opacity: 0.48;
    box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
  }
  50% {
    opacity: 0.78;
    box-shadow: inset 0 0 0 1px rgba(191, 225, 255, 0.3);
  }
`;

/** Amber rim pulse for gold/“note” callouts (same rhythm as {@link GLASS_LIVE_RIM_SX}). */
const glassAmberNoteRimPulse = keyframes`
  0%, 100% {
    opacity: 0.5;
    box-shadow: inset 0 0 0 1px rgba(245, 196, 53, 0.28);
  }
  50% {
    opacity: 0.82;
    box-shadow: inset 0 0 0 1px rgba(250, 220, 130, 0.42);
  }
`;

/** Same period as {@link GLASS_LIVE_RIM_SX} — use for buttons / other synced “glass” motion. */
export const GLASS_SYNC_CYCLE_SEC = 6.4;

/** Inner glass rims — slightly slower than {@link GLASS_SYNC_CYCLE_SEC} for depth. */
export const GLASS_INNER_SYNC_CYCLE_SEC = 7.5;

/**
 * Legacy pulse kept for any opt-in motion, but the shared material highlight below is static by
 * default. Permanent moving glare started to feel cheap on badges and tier panels.
 */
export const buttonGlassReflectPulse = keyframes`
  0%, 100% {
    opacity: 0.4;
    background-position: 10% 42%;
  }
  50% {
    opacity: 0.68;
    background-position: 90% 58%;
  }
`;

/** Soft diamond-facet highlight for chips and tinted panels. */
export const GLASS_SPECULAR_SWEEP_GRADIENT =
  'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.034) 48.5%, rgba(255,255,255,0.012) 49.5%, rgba(8,18,34,0.03) 50.5%, rgba(8,18,34,0.075) 100%), radial-gradient(150% 92% at 16% -26%, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.026) 34%, rgba(255,255,255,0) 68%), linear-gradient(180deg, rgba(255,255,255,0.026) 0%, rgba(255,255,255,0.004) 42%, rgba(255,255,255,0) 72%)';

/**
 * Static specular highlight.
 * Merge onto panels that use `::before`; chips also set overflow/label z-index via {@link GLASS_CHIP_SHEEN_SX}.
 */
export const GLASS_SPECULAR_SWEEP_SX: SxProps<Theme> = {
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 0,
    pointerEvents: 'none',
    backgroundImage: GLASS_SPECULAR_SWEEP_GRADIENT,
    backgroundRepeat: 'no-repeat',
    opacity: 0.48,
    mixBlendMode: 'screen',
  },
};

/** License / SR chips — static material highlight with label content above it. */
export const GLASS_CHIP_SHEEN_SX: SxProps<Theme> = {
  position: 'relative',
  overflow: 'hidden',
  isolation: 'isolate',
  ...GLASS_SPECULAR_SWEEP_SX,
  '& .MuiChip-label, & .MuiChip-icon': {
    position: 'relative',
    zIndex: 1,
  },
};

// Multipliers against theme.shape.borderRadius (10px): panel ≈ 22px, inner ≈ 16px.
export const GLASS_RADIUS = {
  panel: 2.2,
  innerPanel: 1.6,
  innerRow: 1.4,
  pagination: 1.8,
} as const;

export const GLASS_PADDING = {
  panel: 2.5,
  panelSpacious: 2.75,
  panelCompact: 2,
  panelTight: 1.5,
  innerPanel: 1.5,
  innerRowX: 1.2,
  innerRowY: 1,
} as const;

/** Live rim overlay — merge onto any custom glass `Box`/`Paper` that does not spread {@link GLASS_CARD_SX}. */
export const GLASS_LIVE_RIM_SX: SxProps<Theme> = {
  position: 'relative',
  isolation: 'isolate',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 2,
    pointerEvents: 'none',
    animation: `${glassRimPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.76,
      boxShadow: 'inset 0 0 0 1px rgba(191, 225, 255, 0.34)',
    },
  },
};

/** Softer inner-card rim — same role as {@link GLASS_LIVE_RIM_SX} for inner panels. */
export const GLASS_INNER_LIVE_RIM_SX: SxProps<Theme> = {
  position: 'relative',
  isolation: 'isolate',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 2,
    pointerEvents: 'none',
    animation: `${glassInnerRimPulse} ${GLASS_INNER_SYNC_CYCLE_SEC}s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.68,
      boxShadow: 'inset 0 0 0 1px rgba(191, 225, 255, 0.28)',
    },
  },
};

/** Amber “note” callout rim — matches gold borders on home disclaimer. */
export const GLASS_NOTE_AMBER_RIM_SX: SxProps<Theme> = {
  position: 'relative',
  isolation: 'isolate',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    zIndex: 2,
    pointerEvents: 'none',
    animation: `${glassAmberNoteRimPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.68,
      boxShadow: 'inset 0 0 0 1px rgba(245, 196, 53, 0.38)',
    },
  },
};

/**
 * The nav "boxje" rim — bright specular top edge + grounding dark bottom + full
 * hairline, built only from inset shadows. The shared signature for buttons, the
 * trend toggle, server-card stat tiles, and any small frosted control.
 */
export const GLASS_BOXJE_RIM_SHADOW =
  'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(15,23,42,0.22), inset 0 0 0 1px rgba(226,242,255,0.12)';
export const GLASS_BOXJE_RIM_SHADOW_HOVER =
  'inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(15,23,42,0.24), inset 0 0 0 1px rgba(226,242,255,0.2)';

/**
 * Navbar / sidebar / mobile-header foundation. Built on {@link BRAND.navBase}
 * (#17213B) because it matches the background behind the AC Elite logo, kept
 * highly opaque so the logo always sits on strong, even contrast. A faint
 * top-light sheen + vibrancy blur give it the same glass family as the panels
 * without competing with them. Each surface adds its own border edge
 * (right for the rail, bottom for the mobile header).
 */
export const APP_NAV_SURFACE_SX: SystemStyleObject<Theme> = {
  // Translucent floor so the blurred page shows through lower down (real glass).
  backgroundColor: `rgba(${BRAND.navBaseRgb},0.5)`,
  backgroundImage:
    // Topmost layer: a solid, opaque #17213B block behind the logo that fades out
    // below it — so the logo's own #17213B background square blends seamlessly into
    // the nav instead of reading as a visible rectangle.
    `linear-gradient(180deg, ${BRAND.navBase} 0, ${BRAND.navBase} 128px, rgba(${BRAND.navBaseRgb},0) 220px),` +
    // Faint top-light sheen (below the logo block).
    `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.012) 220px, rgba(255,255,255,0) 380px),` +
    // Body: grounded near the top, fading to translucent glass toward the bottom.
    `linear-gradient(180deg, rgba(${BRAND.navBaseRgb},0.86) 0%, rgba(${BRAND.navBaseRgb},0.86) 150px, rgba(${BRAND.navBaseRgb},0.5) 100%)`,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
};

/** Sidebar nav item — resting state is transparent (sits on the nav surface). */
export const GLASS_SIDEBAR_ITEM_HOVER_BG =
  `linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%), rgba(${BRAND.navBaseRgb},0.72)`;

/**
 * Active sidebar item — frosted glass with a quiet brand tint rather than a
 * bright blue "selected button". Frosted white film over the #17213B base + a
 * full hairline rim, so it reads as a lit pane of the same material.
 */
export const GLASS_SIDEBAR_ITEM_ACTIVE_SX: SystemStyleObject<Theme> = {
  background: `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.035) 100%), rgba(${BRAND.navBaseRgb},0.86)`,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.22), inset 0 0 0 1px rgba(255,255,255,0.13)',
};

/**
 * Apple "material": heavy blur + saturation so colour behind the glass blooms
 * through (the vibrancy trick). High saturation is the key to the premium feel.
 */
export const GLASS_MATERIAL_BACKDROP = 'blur(28px) saturate(180%)';

/**
 * Base glass surface — Card 1. It always sits on the dark brand foundation
 * (#17213B), independent of whether it contains child cards. The material still
 * gets its glass feel from the specular top edge, rim, blur and shadow, while
 * nested cards use lighter films on top instead of changing this base layer.
 */
export const GLASS_CARD_SX: SxProps<Theme> = {
  position: 'relative',
  borderRadius: GLASS_RADIUS.panel,
  // Lighter hairline — the depth comes from light + shadow, not a heavy border.
  border: `1px solid rgba(226,242,255,0.11)`,
  backgroundColor: BRAND.navBase,
  // Even top-down specular sheen only (the lit top edge of the glass).
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.014) 44%, rgba(255,255,255,0) 100%)',
  backdropFilter: GLASS_MATERIAL_BACKDROP,
  WebkitBackdropFilter: GLASS_MATERIAL_BACKDROP,
  boxShadow:
    // Bright thin specular top edge + grounding dark bottom (glass thickness)…
    'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.18),' +
    // …then two soft layers that hug the footprint as the primary container depth.
    ' 0 2px 6px -2px rgba(0,0,0,0.3), 0 18px 44px -16px rgba(0,0,0,0.5)',
};

/** Opt-in: base card + the soft live rim pulse. Reserve for live data. */
export const GLASS_CARD_LIVE_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  ...GLASS_LIVE_RIM_SX,
};

/**
 * Inner glass tile — a *secondary* surface that sits inside {@link GLASS_CARD_SX}.
 * It is a lighter translucent film over the dark level-1 surface. Quieter on
 * purpose: weaker border, a subtle inner highlight, and
 * no outer drop shadow. It also drops `backdrop-filter` — the parent panel is
 * already a blurred surface, so a second nested blur only costs paint with no
 * visible gain. The deeper the nesting, the quieter the styling.
 */
export const GLASS_CARD_INNER_SX: SxProps<Theme> = {
  position: 'relative',
  borderRadius: GLASS_RADIUS.innerPanel,
  border: '1px solid rgba(226,242,255,0.12)',
  backgroundColor: 'rgba(255,255,255,0.012)',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.026) 0%, rgba(255,255,255,0.003) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.1)',
};

export const GLASS_CARD_INNER_HOVER_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_SX,
  cursor: 'pointer',
  transition:
    'translate 220ms cubic-bezier(0.32, 0.72, 0, 1), border-color 220ms cubic-bezier(0.32, 0.72, 0, 1), background-color 220ms cubic-bezier(0.32, 0.72, 0, 1), filter 220ms cubic-bezier(0.32, 0.72, 0, 1)',
  willChange: 'translate',
  '@media (hover: hover)': {
    '&:hover': {
      translate: '0 -2px',
      borderColor: 'rgba(226,242,255,0.18)',
      backgroundColor: 'rgba(255,255,255,0.032)',
      filter: 'brightness(1.018) saturate(1.04)',
    },
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': {
      translate: 'none',
      filter: 'none',
    },
  },
};

export const GLASS_DIALOG_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  overflow: 'hidden',
};

export const GLASS_TABLE_CONTAINER_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_SX,
  overflow: 'auto',
};

export const GLASS_INLINE_CODE_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_SX,
  display: 'inline-block',
  px: 0.75,
  py: 0.25,
  borderRadius: 0.75,
  fontFamily: 'ui-monospace, monospace',
  color: '#fff',
};

export const GLASS_TABLE_WRAPPER_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  /** Clip the table inside `TableContainer` while preserving the outer card geometry. */
  overflow: 'visible',
  '& > .MuiTableContainer-root': {
    borderRadius: 'inherit',
    overflow: 'auto',
  },
};

export const GLASS_TABLE_PAGINATION_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  p: 1,
  borderRadius: GLASS_RADIUS.pagination,
};

export const GLASS_PANEL_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  p: GLASS_PADDING.panel,
};

export const GLASS_PANEL_SPACIOUS_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  p: GLASS_PADDING.panelSpacious,
};

export const GLASS_PANEL_COMPACT_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  p: GLASS_PADDING.panelCompact,
};

export const GLASS_PANEL_TIGHT_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  p: GLASS_PADDING.panelTight,
};

export const GLASS_INNER_PANEL_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_HOVER_SX,
  p: GLASS_PADDING.innerPanel,
  cursor: 'default',
};

export const GLASS_INNER_ROW_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_HOVER_SX,
  px: GLASS_PADDING.innerRowX,
  py: GLASS_PADDING.innerRowY,
};

/**
 * Role/semantic tinted outer glass — same Elite Blue base card with an even,
 * quiet accent wash (no diagonal facet, no corner bloom). Drives the info /
 * warning banners so they read as the same material, just colour-shifted.
 */
export function getTintedGlassPanelSx(accent: string): SystemStyleObject<Theme> {
  return {
    borderColor: alpha(accent, 0.22),
    backgroundImage:
      `linear-gradient(180deg, ${alpha(accent, 0.1)} 0%, ${alpha(accent, 0.035)} 100%),` +
      'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.012) 44%, rgba(255,255,255,0) 100%)',
    boxShadow:
      `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px ${alpha(accent, 0.05)},` +
      ' 0 2px 6px -2px rgba(0,0,0,0.3), 0 18px 44px -16px rgba(0,0,0,0.5)',
  };
}

/**
 * Role/semantic tinted inner row — a tinted variant of the light inner-tile
 * film, with a left accent bar. Quiet like {@link GLASS_CARD_INNER_SX}: no
 * outer drop shadow, just the accent edge + a subtle inner highlight.
 */
export function getTintedGlassInnerRowSx(accent: string): SystemStyleObject<Theme> {
  return {
    borderColor: alpha(accent, 0.18),
    backgroundColor: alpha(accent, 0.05),
    backgroundImage:
      `linear-gradient(180deg, ${alpha(accent, 0.08)} 0%, ${alpha(accent, 0.025)} 100%),` +
      'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), inset 3px 0 0 ${alpha(accent, 0.62)}`,
  };
}

/** Podium table row highlight (1 = gold, 2 = silver, 3 = bronze). */
export function getPodiumRowSx(place: 1 | 2 | 3): SxProps<Theme> {
  if (place === 1) {
    return {
      background:
        'linear-gradient(90deg, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.08) 60%, rgba(245,158,11,0.04) 100%)',
      borderLeft: '2px solid rgba(245, 158, 11, 0.7)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    };
  }
  if (place === 2) {
    return {
      background:
        'linear-gradient(90deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.08) 60%, rgba(148,163,184,0.03) 100%)',
      borderLeft: '2px solid rgba(148, 163, 184, 0.75)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
    };
  }
  return {
    background:
      'linear-gradient(90deg, rgba(194,101,31,0.22) 0%, rgba(194,101,31,0.08) 60%, rgba(194,101,31,0.03) 100%)',
    borderLeft: '2px solid rgba(194, 101, 31, 0.75)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
  };
}
