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

  return (
    <Box sx={{ ...GLASS_CARD_INNER_SX, p: 2, borderRadius: 2 }}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <RatingV2Badge rating={rating} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            KMR backbone with bounded recent-results adjustments.
          </Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
          {[
            ['Base pace', Math.round(b.paceRaw).toLocaleString()],
            ['Racecraft', pct(b.racecraft)],
            ['Activity', pct(b.activity)],
            ['Base SR', b.legacySafetyRating.toFixed(2)],
            ['Recent SR', b.resultsSafetyRating.toFixed(2)],
            ['Confidence', pct(b.confidence * 100)],
          ].map(([label, value]) => (
            <Box key={label} sx={{ minWidth: 110 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {label}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Applied rating adjustments: license {signedPct(b.recentLicenseAdjustmentPct)}, SR{' '}
          {signedSr(b.recentSafetyAdjustment)}. Recent results can tune the rating, but cannot erase
          the historical KMR backbone.
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {b.ratedSessions} rated sessions, {b.ratedRaces} races, {Math.round(b.ratedKm).toLocaleString()} rated km,
          {` ${b.carCollisions + b.envCollisions}`} collisions, {b.cuts} cuts, {b.penalties} penalties.
          {b.excludedSessions ? ` ${b.excludedSessions} sessions excluded for missing track length.` : ''}
        </Typography>
      </Stack>
    </Box>
  );
}
