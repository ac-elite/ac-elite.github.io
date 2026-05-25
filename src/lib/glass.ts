import { alpha, keyframes, type Theme, type SxProps } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

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
 * Apple "material": heavy blur + saturation so colour behind the glass blooms
 * through (the vibrancy trick). `saturate(180%)` is the key to the premium feel.
 */
export const GLASS_MATERIAL_BACKDROP = 'blur(30px) saturate(190%)';

/**
 * Base glass surface — a floating macOS/visionOS-style window. More translucent
 * so the blurred backdrop blooms through (real vibrancy), with a glassy top-left
 * specular sheen, a crisp light top edge + fine rim, and a big soft float shadow.
 * Calm by default; live elements opt into {@link GLASS_CARD_LIVE_SX}.
 */
export const GLASS_CARD_SX: SxProps<Theme> = {
  position: 'relative',
  borderRadius: GLASS_RADIUS.panel,
  border: '1px solid rgba(226,242,255,0.14)',
  backgroundColor: 'rgba(19,30,54,0.66)',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.004) 42%, rgba(255,255,255,0) 100%),' +
    'radial-gradient(430px 210px at 110px -88px, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 42%, rgba(255,255,255,0) 72%),' +
    'linear-gradient(180deg, rgba(35,49,78,0.34) 0%, rgba(17,28,51,0.54) 100%)',
  backdropFilter: GLASS_MATERIAL_BACKDROP,
  WebkitBackdropFilter: GLASS_MATERIAL_BACKDROP,
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.16), inset 0 0 0 1px rgba(255,255,255,0.028),' +
    // Two soft layers that hug the card footprint and ground it. The old single
    // `0 22px 50px -30px` had so much negative spread it shrank into a detached
    // oval blob under the card instead of reading as a real shadow.
    ' 0 2px 6px -2px rgba(0,0,0,0.3), 0 18px 40px -16px rgba(0,0,0,0.5)',
};

/** Opt-in: base card + the soft live rim pulse. Reserve for live data. */
export const GLASS_CARD_LIVE_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  ...GLASS_LIVE_RIM_SX,
};

export const GLASS_CARD_INNER_SX: SxProps<Theme> = {
  position: 'relative',
  borderRadius: GLASS_RADIUS.innerPanel,
  border: '1px solid rgba(226,242,255,0.1)',
  backgroundColor: 'rgba(19,30,54,0.6)',
  backgroundImage:
    'linear-gradient(180deg, rgba(255,255,255,0.014) 0%, rgba(255,255,255,0.003) 44%, rgba(255,255,255,0) 100%),' +
    'radial-gradient(340px 170px at 86px -72px, rgba(255,255,255,0.028) 0%, rgba(255,255,255,0.008) 44%, rgba(255,255,255,0) 74%),' +
    'linear-gradient(180deg, rgba(35,49,78,0.24), rgba(17,28,51,0.42))',
  backdropFilter: 'blur(18px) saturate(160%)',
  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 26px -24px rgba(0,0,0,0.7)',
};

export const GLASS_CARD_INNER_HOVER_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_SX,
  cursor: 'pointer',
  transition: 'border-color 160ms ease, background 160ms ease',
  '&:hover': {
    borderColor: 'rgba(226,242,255,0.24)',
    backgroundColor: 'rgba(21,32,56,0.64)',
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.004) 44%, rgba(255,255,255,0) 100%),' +
      'radial-gradient(340px 170px at 86px -72px, rgba(255,255,255,0.036) 0%, rgba(255,255,255,0.01) 44%, rgba(255,255,255,0) 74%),' +
      'linear-gradient(180deg, rgba(35,49,78,0.28), rgba(17,28,51,0.46))',
  },
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
  ...GLASS_CARD_INNER_SX,
  p: GLASS_PADDING.innerPanel,
};

export const GLASS_INNER_ROW_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_HOVER_SX,
  px: GLASS_PADDING.innerRowX,
  py: GLASS_PADDING.innerRowY,
};

/** Role/semantic tinted outer glass: same base card, with a quiet colour bloom. */
export function getTintedGlassPanelSx(accent: string): SystemStyleObject<Theme> {
  return {
    borderColor: alpha(accent, 0.24),
    backgroundImage:
      `radial-gradient(520px 240px at 84px -88px, ${alpha(accent, 0.16)} 0%, ${alpha(accent, 0.052)} 43%, rgba(255,255,255,0) 76%),` +
      `linear-gradient(135deg, ${alpha(accent, 0.08)} 0%, ${alpha(accent, 0.032)} 48%, rgba(17,28,51,0.03) 51%, rgba(17,28,51,0) 100%),` +
      'linear-gradient(180deg, rgba(255,255,255,0.018) 0%, rgba(255,255,255,0.004) 42%, rgba(255,255,255,0) 100%),' +
      'linear-gradient(180deg, rgba(35,49,78,0.34) 0%, rgba(17,28,51,0.54) 100%)',
    boxShadow:
      `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px ${alpha(accent, 0.035)},` +
      ' 0 1px 2px rgba(0,0,0,0.22)',
  };
}

/** Role/semantic tinted inner row: use on rows inside a tinted glass card. */
export function getTintedGlassInnerRowSx(accent: string): SystemStyleObject<Theme> {
  return {
    borderColor: alpha(accent, 0.18),
    backgroundImage:
      `radial-gradient(360px 150px at 52px -64px, ${alpha(accent, 0.09)} 0%, ${alpha(accent, 0.03)} 46%, transparent 78%),` +
      'linear-gradient(180deg, rgba(255,255,255,0.014) 0%, rgba(255,255,255,0.003) 44%, rgba(255,255,255,0) 100%),' +
      'linear-gradient(180deg, rgba(35,49,78,0.22), rgba(17,28,51,0.42))',
    boxShadow:
      `inset 0 1px 0 rgba(255,255,255,0.1), inset 3px 0 0 ${alpha(accent, 0.62)}, 0 10px 26px -24px rgba(0,0,0,0.7)`,
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
