import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import {
  DATA_STATE_HELP_TEXT_SX,
  PANEL_OVERLINE_MUTED_SX,
  HERO_FOOTNOTE_CAPTION_SX,
  ACTION_OUTLINED_SMALL_DENSE_SX,
} from 'src/lib/page-shell';

// ----------------------------------------------------------------------

const VISIT_ACCENT = '#c4b5fd';
const VISIT_ACCENT_2 = '#67e8f9';

function fmt(n: number) {
  return n.toLocaleString();
}

export type SiteVisitsShowcasePhase = 'off' | 'loading' | 'ready' | 'error';

export type SiteVisitsShowcaseProps = {
  phase: SiteVisitsShowcasePhase;
  /** Defined when phase is `ready`, or carried during `loading` after refresh. */
  count: number | undefined;
  configured: boolean;
  onRefresh: () => void;
};

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000] as const;

function blurbForCount(n: number): string {
  if (n < 50) return 'Early laps — every pit crew started somewhere.';
  if (n < 200) return 'The paddock is waking up. Keep pushing laps.';
  if (n < 1000) return 'Grid energy building — drivers are finding the line.';
  if (n < 5000) return 'Serious traction. The community is on throttle.';
  if (n < 20_000) return 'Full-send territory. This is a hot track.';
  return 'Legend traffic. The server browser would be proud.';
}

function nextMilestone(n: number): { next: number; progress: number } {
  let next = MILESTONES.find((m) => m > n);
  let prev = 0;
  for (const m of MILESTONES) {
    if (m <= n) prev = m;
  }
  if (next === undefined) {
    const step = 25_000;
    next = Math.ceil((n + 1) / step) * step;
    prev = Math.floor(n / step) * step;
  }
  const span = Math.max(1, next - prev);
  const progress = Math.min(100, Math.max(0, ((n - prev) / span) * 100));
  return { next, progress };
}

function useAnimatedCount(target: number | undefined, run: boolean) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const cancelRaf = () => cancelAnimationFrame(rafRef.current);

    if (!run || target === undefined) {
      return cancelRaf;
    }

    const reduced =
      typeof globalThis !== 'undefined' &&
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    if (reduced) {
      setDisplay(target);
      fromRef.current = target;
      return cancelRaf;
    }

    const from = fromRef.current;
    cancelRaf();
    const t0 = performance.now();
    const duration = Math.min(1100, 420 + Math.abs(target - from) * 0.08);

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = Math.round(from + (target - from) * eased);
      setDisplay(v);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return cancelRaf;
  }, [target, run]);

  return display;
}

// ----------------------------------------------------------------------

/**
 * Site visit stats card (admin). Avoid stacking `keyframes`-based `sx` helpers on one `Paper`
 * (`statusAccentBorderSx` + `glassCardMotionSx`) — Emotion merge can yield values that break
 * `String()` during dev error reporting when this module loads with the lazy admin chunk.
 */
export function SiteVisitsShowcase({ phase, count, configured, onRefresh }: SiteVisitsShowcaseProps) {
  const safeCount =
    typeof count === 'number' && Number.isFinite(count)
      ? count
      : typeof count === 'string'
        ? (() => {
            const v = Number(count);
            return Number.isFinite(v) ? v : undefined;
          })()
        : undefined;
  const showCount = safeCount !== undefined;
  const animated = useAnimatedCount(safeCount, showCount && phase !== 'off');

  const milestone = showCount && safeCount !== undefined ? nextMilestone(safeCount) : null;

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_COMPACT_SX,
        overflow: 'hidden',
        p: 2.5,
        borderTop: `3px solid ${VISIT_ACCENT}`,
        boxShadow:
          '0 12px 30px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08), 0 -1px 0 rgba(196,181,253,0.22)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        '@media (hover: hover)': {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow:
              '0 18px 44px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.12), 0 -1px 0 rgba(196,181,253,0.28)',
          },
        },
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 0.75 }}>
            <Typography
              variant="overline"
              sx={{
                letterSpacing: 0.16,
                color: 'text.secondary',
                fontWeight: 800,
                lineHeight: 1.2,
                display: 'block',
              }}
            >
              Site visits
            </Typography>
            <Typography
              variant="caption"
              sx={{
                ...HERO_FOOTNOTE_CAPTION_SX,
                display: 'block',
                mt: 0.35,
                fontWeight: 600,
                letterSpacing: 0.06,
              }}
            >
              Pit-lane traffic · total public sessions (one per browser session, not per page)
            </Typography>
          </Box>

          {phase === 'off' && (
            <Typography variant="body2" sx={{ ...DATA_STATE_HELP_TEXT_SX, maxWidth: 640 }}>
              Counter not active. Add{' '}
              <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                VITE_SUPABASE_URL
              </Box>{' '}
              and{' '}
              <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                VITE_SUPABASE_ANON_KEY
              </Box>{' '}
              (Supabase publishable key or legacy anon JWT) to your build, then run{' '}
              <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                scripts/supabase-site-stats.sql
              </Box>{' '}
              in the Supabase SQL editor (one session ≈ one count).
            </Typography>
          )}

          {phase === 'loading' && !showCount && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Warming tyres…
            </Typography>
          )}

          {phase === 'error' && (
            <Typography variant="body2" sx={{ color: 'error.light' }}>
              Could not load the counter. Check Supabase RLS and that the SQL script was applied.
            </Typography>
          )}

          {showCount && (
            <Stack spacing={1.25}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 900,
                  letterSpacing: '-0.04em',
                  lineHeight: 1.05,
                  fontFeatureSettings: '"tnum"',
                  background: `linear-gradient(115deg, ${VISIT_ACCENT} 0%, #e9d5ff 38%, ${VISIT_ACCENT_2} 88%)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  opacity: phase === 'loading' ? 0.55 : 1,
                  transition: 'opacity 0.25s ease',
                }}
              >
                {fmt(animated)}
              </Typography>
              {phase === 'loading' && (
                <Typography variant="caption" sx={{ ...PANEL_OVERLINE_MUTED_SX, fontWeight: 600 }}>
                  Refreshing lap count…
                </Typography>
              )}
              {phase === 'ready' && safeCount !== undefined && (
                <>
                  <Typography variant="body2" sx={{ ...DATA_STATE_HELP_TEXT_SX, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5 }}>
                    {blurbForCount(safeCount)}
                  </Typography>
                  {milestone && (
                    <Box sx={{ pt: 0.25 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                          Next milestone
                        </Typography>
                        <Typography variant="caption" sx={{ color: VISIT_ACCENT_2, fontWeight: 800 }}>
                          {fmt(milestone.next)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Number.isFinite(milestone.progress) ? milestone.progress : 0}
                        sx={{
                          height: 8,
                          borderRadius: 99,
                          bgcolor: 'rgba(255,255,255,0.08)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 99,
                            background: `linear-gradient(90deg, ${alpha(VISIT_ACCENT, 0.95)}, ${VISIT_ACCENT_2})`,
                          },
                        }}
                      />
                    </Box>
                  )}
                </>
              )}
            </Stack>
          )}
        </Box>

        {configured && (
          <Button
            size="small"
            variant="outlined"
            disabled={phase === 'loading'}
            onClick={onRefresh}
            sx={{
              flexShrink: 0,
              ...ACTION_OUTLINED_SMALL_DENSE_SX,
              borderColor: alpha(VISIT_ACCENT, 0.55),
              color: 'rgba(255,255,255,0.92)',
              '&:hover': {
                borderColor: VISIT_ACCENT_2,
                bgcolor: alpha(VISIT_ACCENT_2, 0.08),
              },
            }}
          >
            Refresh
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
