import { useRef, useState, useEffect } from 'react';
import { keyframes, type Theme, type SxProps } from '@mui/material/styles';

// ----------------------------------------------------------------------
// Apple-style easing. Smooth, decisive ease-out for content; a gentle
// overshoot spring for interactive micro-motions (hover / press).
// ----------------------------------------------------------------------

/** iOS-sheet ease-out — smooth and premium. Use for entrances & reveals. */
export const APPLE_EASE_OUT = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** Symmetric ease for state changes (color, transform back-and-forth). */
export const APPLE_EASE_IN_OUT = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** Slight overshoot — playful spring for hover / press only (not big content). */
export const APPLE_SPRING = 'cubic-bezier(0.34, 1.4, 0.5, 1)';

/** Soft one-shot entrance: fade + slight lift + barely-there scale. */
export const subtleFadeUp = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 16px, 0) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
`;

const DURATION_MS = 560;
const STAGGER_MS = 60;

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
    animation: `${subtleFadeUp} ${DURATION_MS}ms ${APPLE_EASE_OUT} ${delay}ms both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}

// ----------------------------------------------------------------------
// Scroll reveal — Apple-style "content animates in as it enters the viewport".
// Pair the hook (gives a ref + revealed flag) with scrollRevealSx, or use the
// <Reveal> wrapper component for a one-liner.
// ----------------------------------------------------------------------

export type ScrollRevealOptions = {
  threshold?: number;
  rootMargin?: string;
  /** Re-hide and replay when scrolled back out of view. Default: false (reveal once). */
  repeat?: boolean;
};

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  // Pre-trigger: a positive bottom margin reveals items just *before* they reach
  // the viewport (and immediately for anything already on screen), so there's no
  // invisible below-the-fold content hiding the fact that the page can scroll.
  const { threshold = 0, rootMargin = '0px 0px 12% 0px', repeat = false } = options;
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // No IO (SSR/old browsers) or reduced-motion: show immediately, no animation.
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setRevealed(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (!repeat) observer.unobserve(entry.target);
          } else if (repeat) {
            setRevealed(false);
          }
        });
      },
      { threshold, rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, repeat]);

  return { ref, revealed };
}

/** Transition styles for a scroll-revealed block; index adds a gentle stagger. */
export function scrollRevealSx(revealed: boolean, index = 0): SxProps<Theme> {
  const delay = index * 70;
  return {
    opacity: revealed ? 1 : 0,
    transform: revealed ? 'translate3d(0,0,0) scale(1)' : 'translate3d(0,26px,0) scale(0.99)',
    transition: `opacity 640ms ${APPLE_EASE_OUT} ${delay}ms, transform 760ms ${APPLE_EASE_OUT} ${delay}ms`,
    willChange: 'opacity, transform',
    '@media (prefers-reduced-motion: reduce)': {
      opacity: 1,
      transform: 'none',
      transition: 'none',
    },
  };
}

// ----------------------------------------------------------------------
// Hero / panel ambient wrapper. Apple keeps surfaces still, so the former
// floating "bob" is retired — this is now a passthrough that only normalises
// width. Kept for signature compatibility with existing callers.
// ----------------------------------------------------------------------

export type SoftFloatWrapperOptions = {
  alternatePhase?: boolean;
};

const softAmbientFloat = keyframes`
  0%, 100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(0, -1.5px, 0);
  }
`;

export function softFloatWrapperSx(_options?: SoftFloatWrapperOptions): SxProps<Theme> {
  return {
    width: '100%',
    animation: `${softAmbientFloat} 9s ease-in-out ${_options?.alternatePhase ? '-3.8s' : '0s'} infinite`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}

/** @deprecated Use {@link softFloatWrapperSx} — kept for older imports. */
export const serverJoinCardFloatWrapperSx = softFloatWrapperSx();

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
    animation: `${subtleFadeIn} ${DURATION_MS}ms ${APPLE_EASE_OUT} ${delay}ms both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  };
}

/**
 * Hover polish for glass cards: a deliberate, weighty lift (no jittery scale) —
 * the window rises, its top edge and rim brighten, and the float shadow deepens.
 * Smooth ease-out, not a bouncy spring.
 */
export const glassCardHoverSx = {
  transition: `transform 260ms ${APPLE_EASE_OUT}, box-shadow 260ms ${APPLE_EASE_OUT}, border-color 260ms ${APPLE_EASE_OUT}, filter 260ms ${APPLE_EASE_OUT}, background 260ms ${APPLE_EASE_OUT}`,
  willChange: 'transform',
  '@media (hover: hover)': {
    '&:hover': {
      // Glass rises and catches more light: brighter specular top edge + rim, and a
      // saturation lift so the vibrant backdrop blooms through. Shadow hugs the card.
      transform: 'translate3d(0,-3px,0)',
      borderColor: 'rgba(226,242,255,0.3)',
      filter: 'brightness(1.025) saturate(1.07)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.16), inset 0 0 0 1px rgba(255,255,255,0.06),' +
        ' 0 4px 10px -3px rgba(0,0,0,0.32), 0 30px 60px -20px rgba(0,0,0,0.58)',
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
