import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SPACIOUS_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { glassCardMotionSx, glassCardEnterOnlySx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';

// ----------------------------------------------------------------------

type StatTileProps = {
  label: string;
  value: string | number;
  /** Position in the page's stagger cascade — drives entrance delay. */
  motionIndex: number;
  /**
   * `hero` is the larger card used for headline metrics; `compact` is the
   * smaller secondary metric. Defaults to `compact`.
   */
  size?: 'hero' | 'compact';
  /** Optional accessibility label for the article element. */
  ariaLabel?: string;
  /**
   * When the tile sits *inside* another glass card, use the lighter inner-panel
   * film instead of a second full level-1 surface, per the nesting model.
   */
  nested?: boolean;
};

/**
 * Single-metric tile used on the dashboard. Wraps a glass card with our
 * brand accent rim, entrance motion, and an overline + big number. Centralises
 * the spacing/typography that was duplicated across seven inline cards.
 */
export function StatTile({ label, value, motionIndex, size = 'compact', ariaLabel, nested = false }: StatTileProps) {
  const isHero = size === 'hero';
  return (
    <Paper
      component="article"
      aria-label={ariaLabel ?? label}
      tabIndex={0}
      sx={{
        ...(nested
          ? { ...GLASS_INNER_PANEL_SX, ...glassCardEnterOnlySx(motionIndex) }
          : { ...GLASS_PANEL_SPACIOUS_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(motionIndex) }),
        ...(isHero && { p: { xs: 2.5, md: 3 } }),
        textAlign: { xs: 'center', md: 'left' },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          color: isHero ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.72)',
          fontWeight: 700,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="h2"
        sx={{
          fontWeight: 900,
          mt: isHero ? 0.75 : 0.5,
          lineHeight: 1.05,
          letterSpacing: 0,
          fontVariantNumeric: 'tabular-nums',
          // Fluid size so long numbers (e.g. "2.024.451") never overflow a narrow
          // 2-up mobile tile. clamp(min, viewport-scaled, max): rem min/max keep it
          // zoom/accessibility-safe; the vw middle term does the scaling.
          maxWidth: '100%',
          ...(isHero
            ? { fontSize: 'clamp(2.25rem, 4.6vw, 2.875rem)' }
            : { fontSize: 'clamp(1.25rem, 5.4vw, 2.5rem)' }),
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}
