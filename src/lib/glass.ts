import type { Theme, SxProps } from '@mui/material/styles';

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

export const GLASS_CARD_SX: SxProps<Theme> = {
  borderRadius: GLASS_RADIUS.panel,
  border: '1px solid rgba(255,255,255,0.22)',
  background: 'linear-gradient(145deg, rgba(31,44,73,0.94), rgba(23,33,59,0.94))',
  backdropFilter: 'blur(14px)',
  boxShadow: '0 12px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
};

export const GLASS_CARD_INNER_SX: SxProps<Theme> = {
  borderRadius: GLASS_RADIUS.innerPanel,
  border: '1px solid rgba(148,163,184,0.28)',
  background: 'linear-gradient(145deg, rgba(31,44,73,0.86), rgba(23,33,59,0.86))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
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
  overflow: 'hidden',
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
