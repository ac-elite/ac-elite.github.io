import Box, { type BoxProps } from '@mui/material/Box';

import { scrollRevealSx, useScrollReveal } from 'src/lib/subtle-motion';

// ----------------------------------------------------------------------

export type RevealProps = BoxProps & {
  /** Stagger index for a gentle cascade across sibling reveals. */
  index?: number;
  /** Fraction of the element visible before it reveals (0–1). */
  threshold?: number;
  /** Replay the animation each time the element re-enters the viewport. */
  repeat?: boolean;
};

/**
 * Wraps content so it fades/rises into view as it scrolls into the viewport
 * (Apple-style). Reduced-motion and no-IntersectionObserver fall back to
 * showing content immediately. Use `index` to stagger a row of siblings.
 */
export function Reveal({ index = 0, threshold, repeat, sx, children, ...rest }: RevealProps) {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>({ threshold, repeat });

  return (
    <Box
      ref={ref}
      sx={[scrollRevealSx(revealed, index), ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    >
      {children}
    </Box>
  );
}
