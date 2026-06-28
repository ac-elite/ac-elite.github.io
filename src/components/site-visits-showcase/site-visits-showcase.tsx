import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  DATA_STATE_HELP_TEXT_SX,
  PANEL_OVERLINE_MUTED_SX,
  ACTION_OUTLINED_SMALL_DENSE_SX,
} from 'src/lib/page-shell';
import { type SitePageVisitRow, SITE_VISIT_COUNT_GAP_MINUTES } from 'src/lib/site-visits';

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
  /** When defined (including `[]`), per-route breakdown is shown under the milestone. */
  pageRows?: SitePageVisitRow[];
  onRefresh: () => void;
};

const MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000] as const;

/** Short encouragement under the total — plain language for moderators. */
function blurbForCount(n: number): string {
  if (n < 50) return 'Still early — every site starts small.';
  if (n < 200) return 'Growing — more people are opening the site.';
  if (n < 1000) return 'Healthy traffic — the community is finding us.';
  if (n < 5000) return 'Strong usage — lots of people check in regularly.';
  if (n < 20_000) return 'Very busy — the site is a well-used hub.';
  return 'Huge numbers — thank you for helping keep the community informed here.';
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
 * Site visit stats card (admin). Uses the same title + body2 header pattern as other admin Papers.
 * Do not add `glassCardMotionSx` on this `Paper` — merge with the rim animation can break dev `String()` on this chunk.
 */
export function SiteVisitsShowcase({
  phase,
  count,
  configured,
  pageRows,
  onRefresh,
}: SiteVisitsShowcaseProps) {
  const [showPageBreakdown, setShowPageBreakdown] = useState(false);
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
        ...brandAccentBorderSx(),
        overflow: 'hidden',
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'center' }}
          spacing={1}
          sx={{ textAlign: { xs: 'center', sm: 'left' } }}
        >
          <Box sx={{ flex: 1, minWidth: 0, pr: { sm: 1 } }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Public site visits (sessions)
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', lineHeight: 1.45, display: 'block', mt: 0.25 }}
            >
              Top number uses the {SITE_VISIT_COUNT_GAP_MINUTES}-minute session rule. The breakdown
              below shows page opens.
            </Typography>
          </Box>
          {configured && (
            <Button
              size="small"
              variant="outlined"
              disabled={phase === 'loading'}
              onClick={onRefresh}
              sx={{
                flexShrink: 0,
                alignSelf: { xs: 'center', sm: 'auto' },
                mt: { xs: 0.5, sm: 0 },
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

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {phase === 'off' && (
            <Stack spacing={1} sx={{ maxWidth: 680 }}>
              <Typography variant="body2" sx={{ ...DATA_STATE_HELP_TEXT_SX, lineHeight: 1.55 }}>
                Visitor counting is not set up on this copy of the site.{' '}
                <strong>Moderators:</strong> you do not need to change anything here.{' '}
                <strong>If you need this on the live site,</strong> ask a tech lead — they turn it
                on once (build settings + a small database step).
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', lineHeight: 1.55, display: 'block' }}
              >
                Tech reference: set{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  VITE_SUPABASE_URL
                </Box>{' '}
                and{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  VITE_SUPABASE_ANON_KEY
                </Box>
                , then run{' '}
                <Box component="span" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  scripts/supabase-site-stats.sql
                </Box>{' '}
                in the Supabase SQL editor.
              </Typography>
            </Stack>
          )}

          {phase === 'loading' && !showCount && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading visitor numbers…
            </Typography>
          )}

          {phase === 'error' && (
            <Typography
              variant="body2"
              sx={{ color: 'error.light', lineHeight: 1.55, maxWidth: 640 }}
            >
              We could not load the visitor count. This is usually a connection or database setup
              issue — <strong>ask a tech lead</strong>, not something you fix with the admin
              password.
            </Typography>
          )}

          {showCount && (
            <Stack spacing={2} sx={{ pt: 0.25 }}>
              <Stack spacing={0.75}>
                <Typography variant="caption" sx={{ ...PANEL_OVERLINE_MUTED_SX, fontWeight: 700 }}>
                  Session visits
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0,
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
                  <Typography
                    variant="caption"
                    sx={{ ...PANEL_OVERLINE_MUTED_SX, fontWeight: 600 }}
                  >
                    Updating numbers…
                  </Typography>
                )}
              </Stack>
              {(phase === 'ready' || (phase === 'loading' && showCount)) &&
                safeCount !== undefined && (
                  <Stack spacing={2}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55 }}>
                      {blurbForCount(safeCount)}
                    </Typography>
                    {milestone && (
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', fontWeight: 700 }}
                          >
                            Next fun target
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: VISIT_ACCENT_2, fontWeight: 800 }}
                          >
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
                      </Stack>
                    )}
                    {pageRows !== undefined && (
                      <Stack spacing={1}>
                        <Stack
                          direction="row"
                          alignItems="center"
                          justifyContent="space-between"
                          spacing={1}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            Page opens by route
                          </Typography>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => setShowPageBreakdown((prev) => !prev)}
                            sx={{
                              minWidth: 0,
                              px: 1,
                              color: 'text.secondary',
                              textTransform: 'none',
                              fontWeight: 700,
                            }}
                          >
                            {showPageBreakdown ? 'Hide' : 'Show'}
                          </Button>
                        </Stack>
                        {showPageBreakdown &&
                          (pageRows.length === 0 ? (
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', lineHeight: 1.55 }}
                            >
                              No breakdown by page yet. <strong>Moderators:</strong> you can ignore
                              this — the big number above may still be correct.{' '}
                              <strong>Tech team:</strong> run the latest{' '}
                              <Box
                                component="span"
                                sx={{
                                  fontFamily: 'ui-monospace, monospace',
                                  color: 'text.primary',
                                }}
                              >
                                scripts/supabase-site-stats.sql
                              </Box>{' '}
                              in Supabase if you expect a list here.
                            </Typography>
                          ) : (
                            <TableContainer
                              sx={{
                                maxHeight: 280,
                                borderRadius: 1,
                                border: '1px solid rgba(148,163,184,0.14)',
                                bgcolor: 'rgba(15,23,42,0.35)',
                              }}
                            >
                              <Table size="small" stickyHeader>
                                <TableHead>
                                  <TableRow>
                                    <TableCell
                                      sx={{ fontWeight: 800, bgcolor: 'rgba(15,23,42,0.92)' }}
                                    >
                                      Site area
                                    </TableCell>
                                    <TableCell
                                      align="right"
                                      sx={{
                                        fontWeight: 800,
                                        width: 120,
                                        bgcolor: 'rgba(15,23,42,0.92)',
                                      }}
                                    >
                                      Opens
                                    </TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {pageRows.map((row) => (
                                    <TableRow key={row.path} hover>
                                      <TableCell
                                        sx={{
                                          fontFamily:
                                            'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                                          fontSize: '0.78rem',
                                          color: 'rgba(248,250,252,0.92)',
                                          borderColor: 'rgba(148,163,184,0.12)',
                                          wordBreak: 'break-all',
                                        }}
                                      >
                                        {row.path}
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        sx={{
                                          fontVariantNumeric: 'tabular-nums',
                                          fontWeight: 800,
                                          color: 'rgba(248,250,252,0.95)',
                                          borderColor: 'rgba(148,163,184,0.12)',
                                        }}
                                      >
                                        {fmt(row.visit_count)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ))}
                      </Stack>
                    )}
                  </Stack>
                )}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}
