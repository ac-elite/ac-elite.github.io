import type { Theme, SxProps } from '@mui/material/styles';

/** Background paint shared by data pages, setup store, admin shell, 404, and home sections that sit on the grid. */
export const PAGE_BACKGROUND_GRADIENT =
  'linear-gradient(180deg, #17213B 0%, #192540 48%, #17213B 100%)';

/** Base surface under {@link PageGridOverlay}: positioning + canvas + clip (no vertical padding — override `py` as needed). */
export const PAGE_SURFACE_SX: SxProps<Theme> = {
  position: 'relative',
  background: PAGE_BACKGROUND_GRADIENT,
  overflow: 'hidden',
};

/** Standard data/tool page: surface + default vertical rhythm. */
export const DATA_PAGE_SHELL_SX: SxProps<Theme> = {
  ...PAGE_SURFACE_SX,
  py: 4,
};

/** Muted hero footnote under the sync line (data pages, preview heroes). */
export const HERO_FOOTNOTE_CAPTION_SX: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.52)',
  maxWidth: 640,
  lineHeight: 1.55,
};

/** Prev / Next on glass pagination bars (Leaderboard, Rankings, Home). */
export const PAGINATION_NAV_BUTTON_SX: SxProps<Theme> = {
  minWidth: 78,
  fontWeight: 800,
};

/** Number buttons in the same pagination row (selected page uses contained primary). */
export const PAGINATION_PAGE_BUTTON_SX: SxProps<Theme> = {
  fontWeight: 700,
};

/** Secondary explainer under titles in loading / error panels. */
export const DATA_STATE_HELP_TEXT_SX: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.62)',
  maxWidth: 520,
  lineHeight: 1.55,
};

/** 404 / error-adjacent supporting paragraph (slightly tighter than default help text). */
export const NOT_FOUND_SUPPORTING_TEXT_SX: SxProps<Theme> = {
  ...DATA_STATE_HELP_TEXT_SX,
  color: 'rgba(255,255,255,0.58)',
  maxWidth: 480,
};

/** Softer caption under a hero (e.g. driver profile explainer). */
export const HERO_TERTIARY_CAPTION_SX: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.45)',
};

/** Overline / small kicker on dark panels (rankings filters, team blocks). */
export const PANEL_OVERLINE_MUTED_SX: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.55)',
  lineHeight: 1.4,
};

/** Large marketing CTAs (home hero row). Merge `animation` in the page when needed. */
export const MARKETING_CTA_LARGE_LAYOUT_SX: SxProps<Theme> = {
  px: 3.5,
  borderRadius: 1.4,
  minHeight: { xs: 46, sm: 48 },
  width: { xs: '100%', sm: 'auto' },
  maxWidth: { xs: 320, sm: 'none' },
  fontWeight: 800,
};

/**
 * Premium glass-styled primary CTA. Layered linear gradient (no flat MUI fill),
 * inner top sheen, quiet depth shadow, refined border. Pair with
 * `MARKETING_CTA_LARGE_LAYOUT_SX` for the home hero buttons.
 */
export const MARKETING_CTA_PRIMARY_GLASS_SX = {
  background:
    'linear-gradient(180deg, rgba(96,150,236,0.52) 0%, rgba(48,98,196,0.48) 100%)',
  backdropFilter: 'blur(22px) saturate(185%)',
  WebkitBackdropFilter: 'blur(22px) saturate(185%)',
  border: '1px solid rgba(219,234,254,0.22)',
  color: '#fff',
  textShadow: '0 1px 0 rgba(15,23,42,0.35)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(15,23,42,0.22), inset 0 0 0 1px rgba(226,242,255,0.12),' +
    ' 0 1px 2px rgba(0,0,0,0.2), 0 12px 26px -18px rgba(28,72,150,0.7)',
  transition:
    'transform 320ms cubic-bezier(0.34, 1.4, 0.5, 1), box-shadow 320ms cubic-bezier(0.32, 0.72, 0, 1), filter 320ms cubic-bezier(0.32, 0.72, 0, 1)',
  '&:hover': {
    transform: 'translateY(-1px)',
    filter: 'brightness(1.018) saturate(1.035)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(15,23,42,0.24), inset 0 0 0 1px rgba(226,242,255,0.2),' +
      ' 0 2px 4px rgba(0,0,0,0.22), 0 16px 30px -18px rgba(28,72,150,0.82)',
  },
  '&:active': {
    transform: 'translateY(0) scale(0.97)',
    filter: 'brightness(0.96)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
};

/**
 * Premium glass-styled secondary CTA — neutral dark glass that pairs with the
 * primary above without competing for attention.
 */
export const MARKETING_CTA_SECONDARY_GLASS_SX = {
  background:
    'linear-gradient(180deg, rgba(43,59,92,0.48) 0%, rgba(20,30,54,0.58) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(226,232,240,0.18)',
  color: '#fff',
  textShadow: '0 1px 0 rgba(15,23,42,0.4)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(15,23,42,0.22), inset 0 0 0 1px rgba(226,242,255,0.12),' +
    ' 0 1px 2px rgba(0,0,0,0.2)',
  transition:
    'transform 320ms cubic-bezier(0.34, 1.4, 0.5, 1), box-shadow 320ms cubic-bezier(0.32, 0.72, 0, 1), border-color 320ms cubic-bezier(0.32, 0.72, 0, 1)',
  '&:hover': {
    borderColor: 'rgba(226,242,255,0.3)',
    transform: 'translateY(-1px)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(15,23,42,0.24), inset 0 0 0 1px rgba(226,242,255,0.2),' +
      ' 0 2px 4px rgba(0,0,0,0.22)',
  },
  '&:active': {
    transform: 'translateY(0) scale(0.97)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
};

/** Primary `contained` + `size="large"` (404, marketing links). */
export const LINK_PRIMARY_CONTAINED_LARGE_SX: SxProps<Theme> = {
  fontWeight: 800,
};

/** Full-width primary block linking to a data page (home driver search rail). */
export const DATA_PAGE_CALLOUT_PRIMARY_SX: SxProps<Theme> = {
  fontWeight: 800,
  minHeight: 50,
  borderRadius: 1.4,
};

/** Small primary contained (preview unlock, compact actions). */
export const ACTION_CONTAINED_PRIMARY_SMALL_SX: SxProps<Theme> = {
  fontWeight: 800,
  minHeight: 40,
};

/** Small primary `contained` without forced min-height (inline nav actions). */
export const ACTION_PRIMARY_SMALL_SX: SxProps<Theme> = {
  fontWeight: 800,
};

/**
 * License / SR guide launcher (contained; size set on Button). This button only ever
 * sits inside already-blurred chrome (the nav rail / mobile header), so it drops its
 * own backdrop-filter — a nested blur over the drifting page grid caused a crawling
 * shimmer during load with no visual gain.
 */
export const GUIDE_LAUNCH_BUTTON_SX: SxProps<Theme> = {
  fontWeight: 800,
  borderRadius: 1.4,
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(15,23,42,0.22), inset 0 0 0 1px rgba(226,242,255,0.12),' +
    ' 0 1px 2px rgba(0,0,0,0.18), 0 12px 26px -18px rgba(28,72,150,0.7)',
};

/** Small outlined / toggle controls — default font weight for labels. */
export const ACTION_OUTLINED_SMALL_DENSE_SX: SxProps<Theme> = {
  fontWeight: 700,
  borderColor: 'rgba(226,242,255,0.22)',
};

/** Admin external link row (slate border). */
export const ADMIN_EXTERNAL_LINK_OUTLINED_SX: SxProps<Theme> = {
  borderColor: 'rgba(226,232,240,0.24)',
  fontWeight: 700,
};

/** Admin “join server” emphasis (green). */
export const ADMIN_JOIN_SERVER_OUTLINED_SX: SxProps<Theme> = {
  borderColor: 'rgba(34,197,94,0.45)',
  color: '#86efac',
  fontWeight: 700,
  '&:hover': {
    borderColor: 'rgba(134,239,172,0.62)',
    bgcolor: 'rgba(34,197,94,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
  },
};

/** Outlined control on dark glass (white hairline). */
export const OUTLINED_GLASS_WHITE_SX: SxProps<Theme> = {
  textTransform: 'none' as const,
  fontWeight: 700,
  borderColor: 'rgba(255, 255, 255, 0.28)',
  color: 'common.white',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.48)',
    bgcolor: 'rgba(255, 255, 255, 0.075)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
  },
};

/** Discord / info strip outlined button (update bar). */
export const OUTLINED_INFO_STRIP_SX: SxProps<Theme> = {
  minHeight: 30,
  mt: 0.5,
  px: 1.25,
  fontWeight: 700,
  textTransform: 'none' as const,
  borderColor: 'rgba(147,197,253,0.42)',
  color: 'rgba(219,234,254,0.98)',
  bgcolor: 'rgba(59,130,246,0.06)',
  '&:hover': {
    borderColor: 'rgba(191,219,254,0.62)',
    bgcolor: 'rgba(59,130,246,0.12)',
  },
};

/** Mobile header menu trigger. */
export const OUTLINED_MENU_TRIGGER_SMALL_SX: SxProps<Theme> = {
  fontWeight: 700,
  minWidth: 0,
  px: 1.5,
  py: 0.75,
  borderRadius: 1.25,
  borderColor: 'rgba(226,242,255,0.24)',
};

/** ErrorPanel Retry (rose accent, outlined). */
export const ERROR_RETRY_OUTLINED_SX: SxProps<Theme> = {
  mt: 0.25,
  fontWeight: 700,
  borderColor: 'rgba(251,113,133,0.55)',
  color: 'rgba(255,255,255,0.92)',
  '&:hover': {
    borderColor: 'rgba(251,113,133,0.85)',
    bgcolor: 'rgba(251,113,133,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
  },
};

/** Rankings tab bar + similar: caption above filters. */
export const FORM_SECTION_KICKER_CAPTION_SX: SxProps<Theme> = {
  color: 'rgba(255,255,255,0.78)',
  letterSpacing: 0.3,
};

/** Dense table header label color (admin file freshness grid). */
export const TABLE_HEAD_MUTED_COLOR = 'rgba(255,255,255,0.55)';
