import { keyframes, type Theme, type SxProps } from '@mui/material/styles';

/**
 * Rim pulse on `::after` above content (`z-index: 2`, `pointer-events: none`) so the glow is
 * actually visible — a full-bleed layer under opaque children was nearly invisible on home/hero.
 */
const glassRimGlowPulse = keyframes`
  0%, 100% {
    opacity: 0.54;
    box-shadow:
      0 0 0 1px rgba(191, 225, 255, 0.28),
      0 0 18px rgba(147, 197, 253, 0.15),
      0 0 40px rgba(56, 189, 248, 0.09);
  }
  50% {
    opacity: 0.86;
    box-shadow:
      0 0 0 1px rgba(224, 242, 254, 0.44),
      0 0 26px rgba(147, 197, 253, 0.26),
      0 0 48px rgba(56, 189, 248, 0.14);
  }
`;

const glassInnerRimPulse = keyframes`
  0%, 100% {
    opacity: 0.48;
    box-shadow:
      0 0 0 1px rgba(148, 163, 184, 0.24),
      0 0 14px rgba(147, 197, 253, 0.08);
  }
  50% {
    opacity: 0.78;
    box-shadow:
      0 0 0 1px rgba(191, 225, 255, 0.34),
      0 0 20px rgba(147, 197, 253, 0.14);
  }
`;

/** Amber rim pulse for gold/“note” callouts (same rhythm as {@link GLASS_LIVE_RIM_SX}). */
const glassAmberNoteRimPulse = keyframes`
  0%, 100% {
    opacity: 0.5;
    box-shadow:
      0 0 0 1px rgba(245, 196, 53, 0.3),
      0 0 16px rgba(245, 196, 53, 0.12),
      0 0 34px rgba(245, 158, 11, 0.08);
  }
  50% {
    opacity: 0.82;
    box-shadow:
      0 0 0 1px rgba(250, 220, 130, 0.48),
      0 0 22px rgba(245, 196, 53, 0.19),
      0 0 42px rgba(245, 158, 11, 0.12);
  }
`;

/** Same period as {@link GLASS_LIVE_RIM_SX} — use for buttons / other synced “glass” motion. */
export const GLASS_SYNC_CYCLE_SEC = 6.4;

/** Inner glass rims — slightly slower than {@link GLASS_SYNC_CYCLE_SEC} for depth. */
export const GLASS_INNER_SYNC_CYCLE_SEC = 7.5;

/**
 * Specular sweep + opacity in step with rim glow (`GLASS_SYNC_CYCLE_SEC`, ease-in-out).
 * Use on `MuiButton` via `::before` (soft-light blend).
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

/**
 * Narrow specular band for the animated glass sweep (buttons, chips, medal panels): tight core
 * (~49.4–50.6%) so it stays a glint, with enough alpha that the pulse reads clearly on soft-light.
 */
export const GLASS_SPECULAR_SWEEP_GRADIENT =
  'linear-gradient(115deg, transparent 41%, rgba(255,255,255,0.042) 47%, rgba(255,255,255,0.14) 49.4%, rgba(191,225,255,0.2) 50%, rgba(255,255,255,0.12) 50.6%, rgba(255,255,255,0.042) 52.5%, transparent 58%)';

/**
 * Animated specular highlight (same timing as theme buttons).
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
    backgroundSize: '260% 260%',
    backgroundRepeat: 'no-repeat',
    mixBlendMode: 'soft-light',
    animation: `${buttonGlassReflectPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.46,
      backgroundPosition: '48% 50%',
    },
  },
};

/** License / SR chips — same sheen + period as theme buttons ({@link GLASS_SYNC_CYCLE_SEC}). */
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

export const GLASS_RADIUS = {
  panel: 3,
  innerPanel: 2,
  innerRow: 2,
  pagination: 2.25,
} as const;

export const GLASS_PADDING = {
  panel: 2.5,
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
    animation: `${glassRimGlowPulse} ${GLASS_SYNC_CYCLE_SEC}s ease-in-out infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      opacity: 0.76,
      boxShadow:
        '0 0 0 1px rgba(191, 225, 255, 0.34), 0 0 20px rgba(147, 197, 253, 0.18), 0 0 38px rgba(56, 189, 248, 0.1)',
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
      boxShadow: '0 0 0 1px rgba(191, 225, 255, 0.28), 0 0 16px rgba(147, 197, 253, 0.12)',
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
      boxShadow:
        '0 0 0 1px rgba(245, 196, 53, 0.38), 0 0 18px rgba(245, 196, 53, 0.14), 0 0 32px rgba(245, 158, 11, 0.09)',
    },
  },
};

export const GLASS_CARD_SX: SxProps<Theme> = {
  borderRadius: GLASS_RADIUS.panel,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'linear-gradient(145deg, rgba(31,44,73,0.94), rgba(23,33,59,0.94))',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 12px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
  ...GLASS_LIVE_RIM_SX,
};

export const GLASS_CARD_INNER_SX: SxProps<Theme> = {
  borderRadius: GLASS_RADIUS.innerPanel,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'linear-gradient(145deg, rgba(31,44,73,0.86), rgba(23,33,59,0.86))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
  ...GLASS_INNER_LIVE_RIM_SX,
};

export const GLASS_CARD_INNER_HOVER_SX: SxProps<Theme> = {
  ...GLASS_CARD_INNER_SX,
  cursor: 'pointer',
  transition: 'border-color 160ms ease, background 160ms ease',
  '&:hover': {
    borderColor: 'rgba(191,225,255,0.38)',
    background: 'linear-gradient(145deg, rgba(36,52,83,0.9), rgba(26,39,66,0.9))',
  },
};

export const GLASS_TABLE_WRAPPER_SX: SxProps<Theme> = {
  ...GLASS_CARD_SX,
  /** Let the live rim `::after` outer glow show; clip the table inside `TableContainer` instead. */
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
