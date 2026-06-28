import { useMemo, useState, useEffect, useCallback, useDeferredValue } from 'react';

import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Icon } from '@iconify/react';

import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { fetchDriverSessionStatsV2 } from 'src/lib/rating-playground-data';
import {
  getSRBadgeSx,
  SR_CHIP_WIDTH,
  type RankDriver,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
} from 'src/lib/ac-elite-data';
import {
  type RatingV2Config,
  type DriverRatingV2,
  cloneRatingV2Config,
  computeDriverRatingsV2,
  type DriverSessionStatV2,
} from 'src/lib/ac-elite-rating-v2';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  GLASS_INNER_PANEL_SX,
  GLASS_PANEL_COMPACT_SX,
  GLASS_TABLE_CONTAINER_SX,
} from 'src/lib/glass';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';
import { RaceLoader } from 'src/components/race-loader';

type NumericConfigKey = {
  [K in keyof RatingV2Config]: RatingV2Config[K] extends number ? K : never;
}[keyof RatingV2Config];

type PlaygroundState = {
  rank: RankDriver[];
  stats: DriverSessionStatV2[];
};

type ComparisonRow = {
  rating: DriverRatingV2;
  current: DriverRatingV2;
  licenseDelta: number;
  safetyDelta: number;
  licenseChanged: boolean;
  safetyChanged: boolean;
};

type SortMode = 'rating' | 'movement';

type StoredPlaygroundSettings = {
  version: 1;
  config: RatingV2Config;
  changedOnly: boolean;
  sortMode: SortMode;
};

const CONTROL_GROUPS: Array<{
  title: string;
  description: string;
  help: string;
  controls: Array<{
    key: NumericConfigKey;
    label: string;
    help: string;
    min: number;
    max: number;
    step: number;
    suffix?: string;
  }>;
}> = [
  {
    title: 'Incident weights',
    description: 'Tune how incidents affect recent Safety Rating.',
    help: 'These settings decide how much messy driving hurts the results-based Safety Rating signal.',
    controls: [
      {
        key: 'collisionWeight',
        label: 'Collision weight',
        help: 'Multiplier for collision severity points. Higher values make car/wall contacts lower the recent SR signal more.',
        min: 0,
        max: 3,
        step: 0.05,
      },
      {
        key: 'cutWeight',
        label: 'Cut weight',
        help: 'Incident points added for each recorded track cut. Higher values punish repeated cuts more strongly.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'penaltyWeight',
        label: 'Penalty weight',
        help: 'Incident points added for each in-game penalty in the result file.',
        min: 0,
        max: 5,
        step: 0.05,
      },
      {
        key: 'disqualificationPenalty',
        label: 'DQ penalty',
        help: 'Flat incident penalty when a driver is disqualified from a session.',
        min: 0,
        max: 15,
        step: 0.25,
      },
    ],
  },
  {
    title: 'Racecraft',
    description: 'Tune how race results affect license score.',
    help: 'Racecraft is the results-based correction on top of the KMR pace backbone. It rewards finishing well and completing races.',
    controls: [
      {
        key: 'racecraftFinishWeight',
        label: 'Finish position weight',
        help: 'Share of racecraft score based on finishing position compared with the field. Higher rewards better race finishes more.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'racecraftCompletionWeight',
        label: 'Completion weight',
        help: 'Share of racecraft score based on race completion. Higher rewards finishing the race distance more.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'racecraftFallbackPaceWeight',
        label: 'No-race pace fallback',
        help: 'When a driver has no rated race results yet, racecraft is estimated from pace score times this value.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'racecraftBaseline',
        label: 'Racecraft neutral point',
        help: 'Racecraft score where license score gets no boost or penalty. Above this helps, below this hurts.',
        min: 40,
        max: 85,
        step: 1,
      },
    ],
  },
  {
    title: 'License adjustment',
    description: 'Tune how racecraft adjusts the KMR pace base.',
    help: 'These settings control how far recent racecraft can push the license score up or down from the KMR pace base.',
    controls: [
      {
        key: 'licenseAdjustmentMinRaces',
        label: 'Min rated races',
        help: 'Minimum rated race count before racecraft is allowed to adjust license score.',
        min: 0,
        max: 20,
        step: 1,
      },
      {
        key: 'licenseAdjustmentScale',
        label: 'Adjustment scale',
        help: 'Strength of the racecraft correction. Higher means racecraft moves license score more aggressively.',
        min: 0,
        max: 0.2,
        step: 0.005,
      },
      {
        key: 'licenseAdjustmentMaxGain',
        label: 'Max gain',
        help: 'Maximum percentage boost racecraft can add to the KMR pace score.',
        min: 0,
        max: 0.15,
        step: 0.005,
        suffix: '%',
      },
      {
        key: 'licenseAdjustmentMaxLoss',
        label: 'Max loss',
        help: 'Maximum percentage penalty racecraft can apply to the KMR pace score.',
        min: -0.15,
        max: 0,
        step: 0.005,
        suffix: '%',
      },
    ],
  },
  {
    title: 'Safety adjustment',
    description: 'Tune how recent results adjust all-time SR.',
    help: 'These settings control how recent result data can gently pull the all-time KMR Safety Rating up or down.',
    controls: [
      {
        key: 'safetyAdjustmentMinSessions',
        label: 'Min rated sessions',
        help: 'Minimum rated session count before recent results may adjust Safety Rating.',
        min: 0,
        max: 30,
        step: 1,
      },
      {
        key: 'safetyAdjustmentScale',
        label: 'Adjustment scale',
        help: 'Strength of the recent SR correction. Higher means recent clean or dirty sessions move SR more.',
        min: 0,
        max: 0.4,
        step: 0.01,
      },
      {
        key: 'safetyAdjustmentMaxGain',
        label: 'Max SR gain',
        help: 'Maximum SR points recent clean driving can add to the KMR all-time SR.',
        min: 0,
        max: 1,
        step: 0.025,
      },
      {
        key: 'safetyAdjustmentMaxLoss',
        label: 'Max SR loss',
        help: 'Maximum SR points recent incidents can remove from the KMR all-time SR.',
        min: -1,
        max: 0,
        step: 0.025,
      },
    ],
  },
  {
    title: 'Confidence',
    description: 'Tune how quickly recent result data is trusted.',
    help: 'Confidence decides how much the newer Supabase result data is trusted. Low confidence keeps the KMR baseline dominant.',
    controls: [
      {
        key: 'confidenceFullKm',
        label: 'Full confidence km',
        help: 'Rated kilometers needed before the kilometer part of confidence reaches full strength.',
        min: 100,
        max: 5000,
        step: 50,
      },
      {
        key: 'confidenceFullSessions',
        label: 'Full confidence sessions',
        help: 'Rated session count needed before the session-count part of confidence reaches full strength.',
        min: 1,
        max: 80,
        step: 1,
      },
      {
        key: 'confidenceKmWeight',
        label: 'KM confidence weight',
        help: 'How much rated kilometers contribute to confidence. Together with session weight this controls trust in recent data.',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        key: 'confidenceSessionWeight',
        label: 'Session confidence weight',
        help: 'How much rated session count contributes to confidence. Together with KM weight this controls trust in recent data.',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Activity score',
    description: 'Tune the displayed activity component.',
    help: 'Activity score is a displayed component showing how much useful history a driver has. It does not directly gate license tiers.',
    controls: [
      {
        key: 'activityFullSessions',
        label: 'Full activity sessions',
        help: 'Rated sessions needed for the session part of activity score to reach full value.',
        min: 1,
        max: 120,
        step: 1,
      },
      {
        key: 'activityFullTracks',
        label: 'Full activity tracks',
        help: 'Unique tracks needed for the track-variety part of activity score to reach full value.',
        min: 1,
        max: 30,
        step: 1,
      },
      {
        key: 'activityFullKm',
        label: 'Full activity km',
        help: 'Total kilometers needed for the distance part of activity score to reach full value.',
        min: 100,
        max: 12000,
        step: 100,
      },
      {
        key: 'activitySessionWeight',
        label: 'Session weight',
        help: 'Maximum activity points available from rated session count.',
        min: 0,
        max: 100,
        step: 1,
      },
      {
        key: 'activityTrackWeight',
        label: 'Track weight',
        help: 'Maximum activity points available from unique track variety.',
        min: 0,
        max: 100,
        step: 1,
      },
      {
        key: 'activityKmWeight',
        label: 'KM weight',
        help: 'Maximum activity points available from total driven kilometers.',
        min: 0,
        max: 100,
        step: 1,
      },
    ],
  },
];

const PLAYGROUND_STORAGE_KEY = 'ac-elite.rating-playground.settings.v1';
const MOVEMENT_LICENSE_EPSILON = 0.05;
const MOVEMENT_SAFETY_EPSILON = 0.0005;
const COMPARISON_RATING_COLUMNS = `${LICENSE_CHIP_WIDTH}px ${SR_CHIP_WIDTH}px`;
const NUMERIC_CONFIG_KEYS = CONTROL_GROUPS.flatMap((group) =>
  group.controls.map((control) => control.key)
);

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatSigned(value: number, digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}`;
}

function visibleDelta(value: number, epsilon: number): number {
  return Math.abs(value) < epsilon ? 0 : value;
}

function movementScore(row: ComparisonRow): number {
  return Math.abs(row.licenseDelta) / 100 + Math.abs(row.safetyDelta) * 10;
}

function buildTierOrderMap(tiers: Array<{ name: string }>): Map<string, number> {
  return new Map(tiers.map((tier, index) => [tier.name, index]));
}

function tierRank(order: Map<string, number>, tier: string): number {
  return order.get(tier) ?? Number.MAX_SAFE_INTEGER;
}

function compareRowsByRating(
  a: ComparisonRow,
  b: ComparisonRow,
  licenseOrder: Map<string, number>,
  safetyOrder: Map<string, number>
): number {
  return compareRatingsByRating(a.rating, b.rating, licenseOrder, safetyOrder);
}

function compareRatingsByRating(
  a: DriverRatingV2,
  b: DriverRatingV2,
  licenseOrder: Map<string, number>,
  safetyOrder: Map<string, number>
): number {
  const licenseTierDiff =
    tierRank(licenseOrder, a.licenseTier) - tierRank(licenseOrder, b.licenseTier);
  if (licenseTierDiff !== 0) return licenseTierDiff;

  const licenseDiff = b.licenseScore - a.licenseScore;
  if (licenseDiff !== 0) return licenseDiff;

  const safetyTierDiff = tierRank(safetyOrder, a.safetyTier) - tierRank(safetyOrder, b.safetyTier);
  if (safetyTierDiff !== 0) return safetyTierDiff;

  const safetyDiff = b.safetyRating - a.safetyRating;
  if (safetyDiff !== 0) return safetyDiff;

  return b.totalKm - a.totalKm;
}

function buildPositionMap(
  ratings: DriverRatingV2[],
  licenseOrder: Map<string, number>,
  safetyOrder: Map<string, number>
): Map<string, number> {
  return new Map(
    [...ratings]
      .sort((a, b) => compareRatingsByRating(a, b, licenseOrder, safetyOrder))
      .map((rating, index) => [rating.guid, index + 1])
  );
}

function displayedControlValue(value: number, suffix?: string): number {
  return suffix === '%' ? value * 100 : value;
}

function parseControlValue(value: number, suffix?: string): number {
  return suffix === '%' ? value / 100 : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isSortMode(value: unknown): value is SortMode {
  return value === 'rating' || value === 'movement';
}

function mergeStoredConfig(raw: unknown): RatingV2Config {
  const next = cloneRatingV2Config();
  if (!isRecord(raw)) return next;

  for (const key of NUMERIC_CONFIG_KEYS) {
    const value = finiteNumber(raw[key]);
    if (value != null) next[key] = value;
  }

  const storedLicenseTiers = raw.licenseTiers;
  if (Array.isArray(storedLicenseTiers)) {
    next.licenseTiers = next.licenseTiers.map((tier) => {
      const stored = storedLicenseTiers.find(
        (candidate: unknown) => isRecord(candidate) && candidate.name === tier.name
      );
      if (!isRecord(stored)) return tier;
      return {
        ...tier,
        minKm: finiteNumber(stored.minKm) ?? tier.minKm,
        minScore: finiteNumber(stored.minScore) ?? tier.minScore,
        minTracks: finiteNumber(stored.minTracks) ?? tier.minTracks,
      };
    });
  }

  const storedSafetyTiers = raw.safetyTiers;
  if (Array.isArray(storedSafetyTiers)) {
    next.safetyTiers = next.safetyTiers.map((tier) => {
      const stored = storedSafetyTiers.find(
        (candidate: unknown) => isRecord(candidate) && candidate.name === tier.name
      );
      if (!isRecord(stored)) return tier;
      return {
        ...tier,
        minSR: finiteNumber(stored.minSR) ?? tier.minSR,
        minKm: finiteNumber(stored.minKm) ?? tier.minKm,
      };
    });
  }

  return next;
}

function defaultPlaygroundSettings(): StoredPlaygroundSettings {
  return {
    version: 1,
    config: cloneRatingV2Config(),
    changedOnly: false,
    sortMode: 'rating',
  };
}

function loadPlaygroundSettings(): StoredPlaygroundSettings {
  const defaults = defaultPlaygroundSettings();
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(PLAYGROUND_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return defaults;
    return {
      version: 1,
      config: mergeStoredConfig(parsed.config),
      changedOnly: parsed.changedOnly === true,
      sortMode: isSortMode(parsed.sortMode) ? parsed.sortMode : defaults.sortMode,
    };
  } catch {
    return defaults;
  }
}

function savePlaygroundSettings(settings: StoredPlaygroundSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYGROUND_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private/locked-down browser contexts.
  }
}

const sliderSx = {
  mt: 0.8,
  height: 8,
  color: '#38bdf8',
  '& .MuiSlider-rail': {
    opacity: 1,
    bgcolor: 'rgba(148, 163, 184, 0.28)',
  },
  '& .MuiSlider-track': {
    border: 0,
    background: 'linear-gradient(90deg, #38bdf8, #2dd4bf)',
    boxShadow: '0 0 16px rgba(45, 212, 191, 0.24)',
  },
  '& .MuiSlider-thumb': {
    width: 17,
    height: 17,
    bgcolor: '#e0f2fe',
    border: '2px solid rgba(14, 165, 233, 0.95)',
    boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.16), 0 8px 18px rgba(0, 0, 0, 0.28)',
    '&:before': { display: 'none' },
    '&:hover, &.Mui-focusVisible': {
      boxShadow: '0 0 0 7px rgba(14, 165, 233, 0.24), 0 8px 18px rgba(0, 0, 0, 0.28)',
    },
  },
};

const numberFieldSx = {
  width: 128,
  flexShrink: 0,
  '& .MuiOutlinedInput-root': {
    borderRadius: 1.35,
    bgcolor: 'rgba(15, 23, 42, 0.42)',
    transition: 'border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease',
    '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.34)' },
    '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.56)' },
    '&:hover fieldset': { borderColor: 'rgba(125, 211, 252, 0.58)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(45, 212, 191, 0.86)' },
    '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(45, 212, 191, 0.12)' },
  },
  '& input': {
    py: 0.78,
    px: 1.15,
    fontWeight: 850,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    MozAppearance: 'textfield',
  },
  '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
};

const tableNumberFieldSx = {
  ...numberFieldSx,
  width: 104,
  '& input': {
    py: 0.58,
    px: 0.9,
    fontWeight: 800,
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    MozAppearance: 'textfield',
  },
};

const comparisonCheckboxSx = {
  color: 'rgba(226, 242, 255, 0.82)',
  p: 0.65,
  mr: 0.5,
  borderRadius: 1.1,
  bgcolor: 'rgba(15, 23, 42, 0.48)',
  border: '1px solid rgba(148, 163, 184, 0.32)',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  '&:hover': {
    bgcolor: 'rgba(14, 165, 233, 0.14)',
    borderColor: 'rgba(125, 211, 252, 0.56)',
  },
  '&.Mui-checked': {
    color: '#22d3ee',
    bgcolor: 'rgba(14, 165, 233, 0.18)',
    borderColor: 'rgba(34, 211, 238, 0.68)',
    boxShadow: '0 0 0 3px rgba(34, 211, 238, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 19,
    filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))',
  },
};

function InfoHint({ title }: { title: string }) {
  return (
    <Tooltip
      arrow
      placement="top"
      title={
        <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.45 }}>
          {title}
        </Typography>
      }
    >
      <Box
        component="span"
        tabIndex={0}
        aria-label={`Info: ${title}`}
        sx={{
          width: 16,
          height: 16,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(186, 230, 253, 0.78)',
          cursor: 'help',
          lineHeight: 0,
          transition: 'color 0.16s ease, opacity 0.16s ease',
          '&:hover, &:focus-visible': {
            color: '#e0f2fe',
            outline: 'none',
          },
        }}
      >
        <Icon icon="solar:info-circle-linear" width={15} height={15} />
      </Box>
    </Tooltip>
  );
}

function LabelWithInfo({
  label,
  help,
  align = 'left',
}: {
  label: string;
  help: string;
  align?: 'left' | 'right';
}) {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.65}
      alignItems="center"
      justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
      sx={{ minWidth: 0 }}
    >
      <Typography
        component="span"
        variant="caption"
        sx={{ color: 'inherit', fontWeight: 'inherit', lineHeight: 1.2 }}
      >
        {label}
      </Typography>
      <InfoHint title={help} />
    </Stack>
  );
}

function NumberControl({
  label,
  help,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const shown = displayedControlValue(value, suffix);
  const shownMin = displayedControlValue(min, suffix);
  const shownMax = displayedControlValue(max, suffix);
  const shownStep = displayedControlValue(step, suffix);
  const [draft, setDraft] = useState(shown);

  useEffect(() => {
    setDraft(shown);
  }, [shown]);

  const commitShownValue = useCallback(
    (next: number) => {
      setDraft(next);
      onChange(parseControlValue(next, suffix));
    },
    [onChange, suffix]
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="space-between">
        <Box sx={{ color: 'text.secondary', fontWeight: 700, minWidth: 0, pr: 1 }}>
          <LabelWithInfo label={label} help={help} />
        </Box>
        <TextField
          size="small"
          type="number"
          value={Number.isInteger(draft) ? draft : Number(draft.toFixed(3))}
          inputProps={{ min: shownMin, max: shownMax, step: shownStep }}
          InputProps={{
            endAdornment: suffix ? (
              <Typography
                component="span"
                variant="caption"
                sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 850 }}
              >
                {suffix}
              </Typography>
            ) : undefined,
          }}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) commitShownValue(next);
          }}
          sx={numberFieldSx}
        />
      </Stack>
      <Slider
        size="small"
        min={shownMin}
        max={shownMax}
        step={shownStep}
        value={draft}
        onChange={(_, next) => setDraft(next as number)}
        onChangeCommitted={(_, next) => commitShownValue(next as number)}
        sx={sliderSx}
      />
    </Box>
  );
}

function MetricCard({
  label,
  value,
  detail,
  help,
}: {
  label: string;
  value: string;
  detail?: string;
  help: string;
}) {
  return (
    <Paper sx={{ ...GLASS_INNER_PANEL_SX, p: 1.5, minHeight: 96 }}>
      <Box sx={{ color: 'text.secondary', fontWeight: 700 }}>
        <LabelWithInfo label={label} help={help} />
      </Box>
      <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 850 }}>
        {value}
      </Typography>
      {detail && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {detail}
        </Typography>
      )}
    </Paper>
  );
}

function licenseComparisonChipSx(tier: string): SxProps<Theme> {
  return {
    minWidth: LICENSE_CHIP_WIDTH,
    fontWeight: 700,
    justifyContent: 'center',
    ...getLicenseBadgeSx(tier),
  };
}

function safetyComparisonChipSx(tier: string): SxProps<Theme> {
  return {
    minWidth: SR_CHIP_WIDTH,
    fontWeight: 700,
    justifyContent: 'center',
    ...getSRBadgeSx(tier),
  };
}

const comparisonScoreSx: SxProps<Theme> = {
  color: 'text.secondary',
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  textAlign: 'center',
};

function RatingBadgesWithScores({ rating }: { rating: DriverRatingV2 }) {
  return (
    <Stack spacing={0.55} sx={{ minWidth: LICENSE_CHIP_WIDTH + SR_CHIP_WIDTH + 8 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: COMPARISON_RATING_COLUMNS,
          columnGap: 1,
          alignItems: 'center',
        }}
      >
        <Chip
          size="small"
          label={rating.licenseTier}
          sx={licenseComparisonChipSx(rating.licenseTier)}
        />
        <Chip
          size="small"
          label={rating.safetyTier}
          sx={safetyComparisonChipSx(rating.safetyTier)}
        />
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: COMPARISON_RATING_COLUMNS,
          columnGap: 1,
          alignItems: 'center',
        }}
      >
        <Typography variant="body2" sx={comparisonScoreSx}>
          {rating.licenseScore.toFixed(1)}
        </Typography>
        <Typography variant="body2" sx={comparisonScoreSx}>
          {rating.safetyRating.toFixed(2)}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function Page() {
  const [initialSettings] = useState(loadPlaygroundSettings);
  const [config, setConfig] = useState<RatingV2Config>(() => initialSettings.config);
  const [data, setData] = useState<PlaygroundState | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [changedOnly, setChangedOnly] = useState(() => initialSettings.changedOnly);
  const [sortMode, setSortMode] = useState<SortMode>(() => initialSettings.sortMode);
  const deferredConfig = useDeferredValue(config);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let mounted = true;
    setPhase('loading');
    void Promise.all([fetchJson<RankDriver[]>(DATA_FILES.rank), fetchDriverSessionStatsV2()])
      .then(([rank, stats]) => {
        if (!mounted) return;
        setData({ rank, stats });
        setError(null);
        setPhase('ready');
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Could not load rating data');
        setPhase('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setNumber = useCallback((key: NumericConfigKey, value: number) => {
    setConfig((current) => ({ ...current, [key]: value }));
  }, []);

  const resetDefaults = useCallback(() => {
    const defaults = defaultPlaygroundSettings();
    setConfig(defaults.config);
    setChangedOnly(defaults.changedOnly);
    setSortMode(defaults.sortMode);
    setQuery('');
    savePlaygroundSettings(defaults);
  }, []);

  useEffect(() => {
    savePlaygroundSettings({
      version: 1,
      config,
      changedOnly,
      sortMode,
    });
  }, [changedOnly, config, sortMode]);

  const updateLicenseTier = useCallback(
    (name: string, field: 'minKm' | 'minScore' | 'minTracks', value: number) => {
      setConfig((current) => ({
        ...current,
        licenseTiers: current.licenseTiers.map((tier) =>
          tier.name === name ? { ...tier, [field]: value } : tier
        ),
      }));
    },
    []
  );

  const updateSafetyTier = useCallback((name: string, field: 'minKm' | 'minSR', value: number) => {
    setConfig((current) => ({
      ...current,
      safetyTiers: current.safetyTiers.map((tier) =>
        tier.name === name ? { ...tier, [field]: value } : tier
      ),
    }));
  }, []);

  const playgroundRatings = useMemo(
    () =>
      data
        ? computeDriverRatingsV2(data.rank, data.stats, new Date().toISOString(), deferredConfig)
        : [],
    [deferredConfig, data]
  );

  const baselineRatings = useMemo(() => {
    if (!data) return new Map<string, DriverRatingV2>();
    return new Map(
      computeDriverRatingsV2(
        data.rank,
        data.stats,
        new Date().toISOString(),
        cloneRatingV2Config()
      ).map((rating) => [rating.guid, rating])
    );
  }, [data]);

  const comparisonRows = useMemo<ComparisonRow[]>(() => {
    if (!data) return [];
    return playgroundRatings.map((rating) => {
      const current = baselineRatings.get(rating.guid) ?? rating;
      const licenseDelta = visibleDelta(
        rating.licenseScore - current.licenseScore,
        MOVEMENT_LICENSE_EPSILON
      );
      const safetyDelta = visibleDelta(
        rating.safetyRating - current.safetyRating,
        MOVEMENT_SAFETY_EPSILON
      );
      return {
        rating,
        current,
        licenseDelta,
        safetyDelta,
        licenseChanged: current.licenseTier !== rating.licenseTier,
        safetyChanged: current.safetyTier !== rating.safetyTier,
      };
    });
  }, [baselineRatings, data, playgroundRatings]);

  const summary = useMemo(() => {
    const comparable = comparisonRows;
    const defaultConfig = cloneRatingV2Config();
    const baselinePositions = buildPositionMap(
      comparable.map((row) => row.current),
      buildTierOrderMap(defaultConfig.licenseTiers),
      buildTierOrderMap(defaultConfig.safetyTiers)
    );
    const playgroundPositions = buildPositionMap(
      comparable.map((row) => row.rating),
      buildTierOrderMap(deferredConfig.licenseTiers),
      buildTierOrderMap(deferredConfig.safetyTiers)
    );
    const overallPositionChanges = comparable.filter(
      (row) => baselinePositions.get(row.rating.guid) !== playgroundPositions.get(row.rating.guid)
    ).length;
    const licenseChanges = comparable.filter((row) => row.licenseChanged).length;
    const safetyChanges = comparable.filter((row) => row.safetyChanged).length;
    const avgLicenseDelta =
      comparable.reduce((sum, row) => sum + row.licenseDelta, 0) / Math.max(1, comparable.length);
    const avgSafetyDelta =
      comparable.reduce((sum, row) => sum + row.safetyDelta, 0) / Math.max(1, comparable.length);
    return {
      comparable,
      overallPositionChanges,
      licenseChanges,
      safetyChanges,
      avgLicenseDelta,
      avgSafetyDelta,
    };
  }, [comparisonRows, deferredConfig]);

  const filteredRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const licenseOrder = buildTierOrderMap(deferredConfig.licenseTiers);
    const safetyOrder = buildTierOrderMap(deferredConfig.safetyTiers);
    return comparisonRows
      .filter((row) => {
        if (changedOnly && !row.licenseChanged && !row.safetyChanged) return false;
        if (!q) return true;
        return (
          row.rating.name.toLowerCase().includes(q) ||
          row.rating.guid.includes(q) ||
          row.rating.licenseTier.toLowerCase().includes(q) ||
          row.rating.safetyTier.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'rating') {
          return compareRowsByRating(a, b, licenseOrder, safetyOrder);
        }
        const aMove = movementScore(a);
        const bMove = movementScore(b);
        if (bMove !== aMove) return bMove - aMove;
        return compareRowsByRating(a, b, licenseOrder, safetyOrder);
      })
      .slice(0, 150);
  }, [changedOnly, comparisonRows, deferredConfig, deferredQuery, sortMode]);

  return (
    <AdminPageShell
      title="Rating Playground"
      description="Sandbox rating changes without writing to Supabase. Reset to default returns to the current live formula."
      documentTitle="Admin - Rating Playground"
    >
      {phase === 'loading' && (
        <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), p: 2 }}>
          <RaceLoader
            title="Loading rating playground..."
            message="Collecting rank data, current ratings, and session stats."
            variant="page"
          />
        </Paper>
      )}

      {phase === 'error' && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      {phase === 'ready' && data && (
        <>
          <Paper
            sx={{
              ...GLASS_PANEL_COMPACT_SX,
              ...brandAccentBorderSx(),
              ...glassCardMotionSx(1),
              p: 2,
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip label="Read-only sandbox" color="info" variant="outlined" />
                  <Chip label={`${data.rank.length.toLocaleString()} drivers`} variant="outlined" />
                  <Chip
                    label={`${data.stats.length.toLocaleString()} session rows`}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  These controls only recalculate in your browser. They do not change the live
                  rating.
                </Typography>
              </Stack>
              <Button variant="contained" onClick={resetDefaults} sx={{ fontWeight: 800 }}>
                Reset to default
              </Button>
            </Stack>
          </Paper>

          <Grid container spacing={2}>
            {[
              {
                label: 'Overall position changes',
                value: summary.overallPositionChanges.toLocaleString(),
                detail: 'Drivers changing overall position',
                help: 'How many drivers would move to a different overall rating position with the current playground settings.',
              },
              {
                label: 'License tier changes',
                value: summary.licenseChanges.toLocaleString(),
                detail: 'Drivers changing license tier',
                help: 'How many compared drivers would move to another license tier with the current playground settings.',
              },
              {
                label: 'SR tier changes',
                value: summary.safetyChanges.toLocaleString(),
                detail: 'Drivers changing Safety Rating tier',
                help: 'How many compared drivers would move to another Safety Rating tier with the current playground settings.',
              },
              {
                label: 'Avg movement',
                value: `${formatSigned(summary.avgLicenseDelta)} pace / ${formatSigned(summary.avgSafetyDelta, 3)} SR`,
                detail: 'Across compared drivers',
                help: 'Average license-score and Safety Rating movement compared with the default formula.',
              },
            ].map(({ label, value, detail, help }) => (
              <Grid key={label} size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard label={label} value={value} detail={detail} help={help} />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            {CONTROL_GROUPS.map((group) => (
              <Grid key={group.title} size={{ xs: 12, md: 6, xl: 4 }}>
                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, p: 2, height: 1 }}>
                  <Stack spacing={1.6}>
                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                          {group.title}
                        </Typography>
                        <InfoHint title={group.help} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {group.description}
                      </Typography>
                    </Box>
                    {group.controls.map((control) => (
                      <NumberControl
                        key={control.key}
                        label={control.label}
                        help={control.help}
                        value={config[control.key]}
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        suffix={control.suffix}
                        onChange={(next) => setNumber(control.key, next)}
                      />
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, p: 2 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        License thresholds
                      </Typography>
                      <InfoHint title="Tier gates for license classes. A driver must meet score, kilometer, and optional track requirements to get that tier." />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Tune the gates for license tiers.
                    </Typography>
                  </Box>
                  <TableContainer sx={GLASS_TABLE_CONTAINER_SX}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <LabelWithInfo
                              label="Tier"
                              help="License tier shown next to the driver's rating."
                            />
                          </TableCell>
                          <TableCell align="right">
                            <LabelWithInfo
                              label="Min score"
                              help="Minimum license score needed for this tier."
                              align="right"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <LabelWithInfo
                              label="Min km"
                              help="Minimum total driven kilometers needed for this tier."
                              align="right"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <LabelWithInfo
                              label="Min tracks"
                              help="Minimum unique tracks needed for this tier. Zero means no extra track gate."
                              align="right"
                            />
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {config.licenseTiers.map((tier) => (
                          <TableRow key={tier.name}>
                            <TableCell>
                              <Chip
                                size="small"
                                label={tier.name}
                                sx={licenseComparisonChipSx(tier.name)}
                              />
                            </TableCell>
                            {(['minScore', 'minKm', 'minTracks'] as const).map((field) => (
                              <TableCell key={field} align="right">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={tier[field] ?? 0}
                                  onChange={(event) => {
                                    const next = Number(event.target.value);
                                    if (Number.isFinite(next))
                                      updateLicenseTier(tier.name, field, next);
                                  }}
                                  sx={tableNumberFieldSx}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, lg: 5 }}>
              <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, p: 2 }}>
                <Stack spacing={1.5}>
                  <Box>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                        Safety thresholds
                      </Typography>
                      <InfoHint title="Tier gates for Safety Rating badges. These affect the displayed SR tier, not the continuous SR score itself." />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Tune the gates for Safety Rating tiers.
                    </Typography>
                  </Box>
                  <TableContainer sx={GLASS_TABLE_CONTAINER_SX}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <LabelWithInfo
                              label="Tier"
                              help="Safety Rating badge shown next to the driver's rating."
                            />
                          </TableCell>
                          <TableCell align="right">
                            <LabelWithInfo
                              label="Min SR"
                              help="Minimum Safety Rating score needed for this badge."
                              align="right"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <LabelWithInfo
                              label="Min km"
                              help="Minimum total driven kilometers needed before this SR badge can be shown."
                              align="right"
                            />
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {config.safetyTiers.map((tier) => (
                          <TableRow key={tier.name}>
                            <TableCell>
                              <Chip
                                size="small"
                                label={tier.name}
                                sx={safetyComparisonChipSx(tier.name)}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={tier.minSR}
                                inputProps={{ step: 0.05 }}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (Number.isFinite(next))
                                    updateSafetyTier(tier.name, 'minSR', next);
                                }}
                                sx={tableNumberFieldSx}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={tier.minKm}
                                onChange={(event) => {
                                  const next = Number(event.target.value);
                                  if (Number.isFinite(next))
                                    updateSafetyTier(tier.name, 'minKm', next);
                                }}
                                sx={tableNumberFieldSx}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), p: 2 }}>
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.5}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
              >
                <Box>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 850 }}>
                      Rating comparison
                    </Typography>
                    <InfoHint title="Side-by-side view of the default rating formula versus the rating produced by your playground settings." />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Showing the top 150 drivers after filters.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <Box sx={{ color: 'text.secondary', fontWeight: 800 }}>
                      <LabelWithInfo
                        label="Sort"
                        help="Rating sorts best to worst. Movement sorts by the biggest visible change from the default formula."
                      />
                    </Box>
                    <ToggleButtonGroup
                      exclusive
                      size="small"
                      value={sortMode}
                      onChange={(_, next) => {
                        if (next) setSortMode(next);
                      }}
                      sx={{
                        alignSelf: { xs: 'stretch', sm: 'center' },
                        '& .MuiToggleButton-root': {
                          px: 1.25,
                          py: 0.7,
                          fontSize: '0.75rem',
                          fontWeight: 850,
                        },
                      }}
                    >
                      <ToggleButton value="rating">Rating</ToggleButton>
                      <ToggleButton value="movement">Movement</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={changedOnly}
                        onChange={(event) => setChangedOnly(event.target.checked)}
                        sx={comparisonCheckboxSx}
                      />
                    }
                    label={
                      <LabelWithInfo
                        label="Changed tiers only"
                        help="Only show drivers whose license tier or Safety Rating tier changes with the current playground settings."
                      />
                    }
                    sx={{
                      mr: 0,
                      ml: 0,
                      '& .MuiFormControlLabel-label': {
                        color: 'rgba(226, 242, 255, 0.94)',
                        fontSize: '0.875rem',
                        fontWeight: 750,
                      },
                    }}
                  />
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <TextField
                      size="small"
                      label="Search driver"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      sx={{ minWidth: 240 }}
                    />
                    <InfoHint title="Search by driver name, SteamID, license tier, or Safety Rating tier." />
                  </Stack>
                </Stack>
              </Stack>

              <TableContainer sx={GLASS_TABLE_CONTAINER_SX}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <LabelWithInfo
                          label="Driver"
                          help="Driver name and SteamID from the ranking data."
                        />
                      </TableCell>
                      <TableCell>
                        <LabelWithInfo
                          label="Current"
                          help="Rating from the current default formula before playground changes."
                        />
                      </TableCell>
                      <TableCell>
                        <LabelWithInfo
                          label="Playground"
                          help="Rating calculated locally with the current playground settings."
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LabelWithInfo
                          label="Pace delta"
                          help="Difference between playground license score and the default-formula license score."
                          align="right"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LabelWithInfo
                          label="SR delta"
                          help="Difference between playground Safety Rating and the default-formula Safety Rating."
                          align="right"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LabelWithInfo
                          label="Racecraft"
                          help="Results-based score from race finish quality and completion."
                          align="right"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LabelWithInfo
                          label="Confidence"
                          help="How much the formula trusts recent Supabase result data for this driver."
                          align="right"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <LabelWithInfo
                          label="Rated"
                          help="Rated sessions and rated kilometers included in the v2 calculation."
                          align="right"
                        />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.map((row) => (
                      <TableRow key={row.rating.guid}>
                        <TableCell>
                          <Stack spacing={0.2}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>
                              {row.rating.name || row.rating.guid}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {row.rating.guid}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <RatingBadgesWithScores rating={row.current} />
                        </TableCell>
                        <TableCell>
                          <RatingBadgesWithScores rating={row.rating} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatSigned(row.licenseDelta)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatSigned(row.safetyDelta, 3)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(row.rating.racecraftScore)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatNumber(row.rating.confidence * 100, 0)}%
                        </TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          {row.rating.ratedSessions} /{' '}
                          {Math.round(row.rating.ratedKm).toLocaleString()} km
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Paper>
        </>
      )}
    </AdminPageShell>
  );
}
