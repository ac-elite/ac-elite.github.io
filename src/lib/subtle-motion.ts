import { keyframes, type Theme } from '@mui/material/styles';

/** Soft one-shot entrance: fade + slight lift. No infinite loops. */
export const subtleFadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const DURATION_MS = 420;
const STAGGER_MS = 48;

export type SubtleEnterOptions = {
  /** Added before the stagger (ms), e.g. to run after a parent block. */
  baseDelayMs?: number;
};

/**
 * Staggered entrance for lists/grids. Respects `prefers-reduced-motion`.
 * Use index 0,1,2… across a section for a gentle cascade.
 */
export function subtleEnterUpSx(index: number, options: SubtleEnterOptions = {}) {
  const { baseDelayMs = 0 } = options;
  const delay = baseDelayMs + index * STAGGER_MS;
  return {
    animation: `${subtleFadeUp} ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}

/** Fade/slide without stagger (single block). */
export function subtleEnterOnceSx(delayMs = 0) {
  return subtleEnterUpSx(0, { baseDelayMs: delayMs });
}

/** Fade-only stagger for `<TableRow>` — avoid `transform` on table rows (layout quirks in browsers). */
const subtleFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export function subtleRowEnterSx(index: number, options: SubtleEnterOptions = {}) {
  const { baseDelayMs = 0 } = options;
  const delay = baseDelayMs + index * STAGGER_MS;
  return {
    animation: `${subtleFadeIn} ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}

/**
 * Hover polish for glass `Paper` / cards: slight lift + stronger shadow.
 * Pair with {@link glassCardMotionSx} for entrance + hover site-wide.
 */
export const glassCardHoverSx = {
  transition: (theme: Theme) => theme.transitions.create(['transform', 'box-shadow'], { duration: 200 }),
  '@media (hover: hover)': {
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 18px 44px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12)',
    },
  },
  '&:focus-visible': {
    outline: '2px solid rgba(147, 197, 253, 0.65)',
    outlineOffset: 3,
  },
};

/**
 * Staggered entrance + hover. Merges reduced-motion so entrance and hover both disable correctly.
 */
export function glassCardMotionSx(index: number, options?: SubtleEnterOptions) {
  const enter = subtleEnterUpSx(index, options);
  return {
    ...enter,
    ...glassCardHoverSx,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      transition: 'none',
      '&:hover': { transform: 'none' },
    },
  };
}

/** Entrance animation only — no card hover (use custom hover or none). */
export function glassCardEnterOnlySx(index: number, options?: SubtleEnterOptions) {
  const enter = subtleEnterUpSx(index, options);
  return {
    ...enter,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}
