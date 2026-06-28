import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { DriverRatingV2 } from 'src/lib/ac-elite-rating-v2';
import { GLASS_CARD_INNER_SX } from 'src/lib/glass';

function pct(value: number) {
  return `${Math.round(value)}%`;
}

function signedPct(value: number) {
  const pctValue = value * 100;
  return `${pctValue >= 0 ? '+' : ''}${pctValue.toFixed(1)}%`;
}

function signedSr(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

const breakdownMetricSx = {
  minWidth: { xs: '100%', sm: 180 },
  flex: 1,
  borderRadius: 1.25,
  px: 1.4,
  py: 1.25,
  bgcolor: 'rgba(255,255,255,0.035)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
} as const;

export function RatingV2Badge({ rating }: { rating: DriverRatingV2 | null | undefined }) {
  if (!rating) return null;
  return (
    <Chip
      size="small"
      label="Rating"
      sx={{
        fontWeight: 800,
        color: '#bfdbfe',
        bgcolor: 'rgba(59,130,246,0.13)',
        border: '1px solid rgba(96,165,250,0.36)',
      }}
    />
  );
}

export function RatingV2Breakdown({ rating }: { rating: DriverRatingV2 | null | undefined }) {
  if (!rating?.breakdown) return null;
  const b = rating.breakdown;
  const incidents = b.carCollisions + b.envCollisions;
  const recentPaceDirection =
    b.recentLicenseAdjustmentPct === 0
      ? 'No recent pace adjustment'
      : b.recentLicenseAdjustmentPct > 0
        ? 'Recent results lift pace'
        : 'Recent results lower pace';
  const recentSrDirection =
    b.recentSafetyAdjustment === 0
      ? 'no SR adjustment'
      : b.recentSafetyAdjustment > 0
        ? 'SR lifted'
        : 'SR lowered';
  const metrics = [
    {
      label: 'Pace score',
      value: Math.round(rating.licenseScore).toLocaleString(),
      detail: `Base ${Math.round(b.paceRaw).toLocaleString()} / Recent ${signedPct(b.recentLicenseAdjustmentPct)}`,
    },
    {
      label: 'Safety Rating',
      value: `${rating.safetyRating.toFixed(2)} SR`,
      detail: `Base ${b.legacySafetyRating.toFixed(2)} / Recent ${signedSr(b.recentSafetyAdjustment)}`,
    },
    {
      label: 'Recent races',
      value: `${signedPct(b.recentLicenseAdjustmentPct)} / ${signedSr(b.recentSafetyAdjustment)} SR`,
      detail: `${recentPaceDirection}; ${recentSrDirection}.`,
    },
    {
      label: 'Confidence',
      value: pct(b.confidence * 100),
      detail: `${b.ratedSessions} sessions / ${Math.round(b.ratedKm).toLocaleString()} rated km`,
    },
  ];

  return (
    <Box sx={{ ...GLASS_CARD_INNER_SX, p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <RatingV2Badge rating={rating} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 850, lineHeight: 1.2 }}>
              Rating breakdown
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Long-term lap and race history is the base. Recent race results only make a small
              correction.
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
          {metrics.map(({ label, value, detail }) => (
            <Box key={label} sx={breakdownMetricSx}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                {label}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 850, lineHeight: 1.25 }}>
                {value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.62)' }}>
                {detail}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Built from {b.ratedRaces} races across {b.uniqueTracks} tracks. Racecraft input:{' '}
          {incidents} collisions, {b.cuts} cuts, {b.penalties} penalties.
          {b.excludedSessions
            ? ` ${b.excludedSessions} sessions excluded for missing track length.`
            : ''}
        </Typography>
      </Stack>
    </Box>
  );
}
