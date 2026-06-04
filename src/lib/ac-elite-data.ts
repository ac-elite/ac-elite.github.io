import type { Theme, SxProps } from '@mui/material/styles';

import { GLASS_CHIP_SHEEN_SX, GLASS_CARD_INNER_SX, GLASS_SPECULAR_SWEEP_SX } from 'src/lib/glass';
import {
  getTrackDisplayName,
  normalizeServerTrackId,
  leaderboardTrackIdLookupCandidates,
} from 'src/centralized/track-info';
// Pure scoring (SR + license/pace) lives in a dependency-free module so the
// Supabase Edge Function can import it too. Re-exported here so existing
// `import { ... } from 'src/lib/ac-elite-data'` call sites keep working.
import {
  CAR,
  SR_TIERS,
  SR_CONFIG,
  getSRTier,
  getDriverSR,
  type CarLap,
  safetyRating,
  LICENSE_TIERS,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  LICENSE_TIER_ORDER,
  type DriverLeaderboard,
} from 'src/lib/ac-elite-scoring';

export {
  CAR,
  SR_TIERS,
  SR_CONFIG,
  getSRTier,
  getDriverSR,
  safetyRating,
  LICENSE_TIERS,
  getDriverLicense,
  computeLicenseMap,
  LICENSE_TIER_ORDER,
};
export type { CarLap, RankDriver, DriverLeaderboard };

/** One driver row under a car id in `leaderboard.json` (e.g. per track). */
export type LeaderboardCarRow = {
  guid: string;
  laptime?: number;
  laps?: number;
  name?: string;
};

export const LICENSE_CHIP_WIDTH = 96;
export const SR_CHIP_WIDTH = 62;

function roleGlassChipSx(rgb: string, text: string): SxProps<Theme> {
  return {
    ...GLASS_CHIP_SHEEN_SX,
    color: text,
    background:
      `linear-gradient(180deg, rgba(${rgb},0.52) 0%, rgba(${rgb},0.28) 100%)`,
    border: `1px solid rgba(${rgb},0.68)`,
    textShadow: '0 1px 1px rgba(0,0,0,0.35)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.18),' +
      ` 0 1px 2px rgba(0,0,0,0.24), 0 8px 20px -12px rgba(${rgb},0.7)`,
  };
}

export const ROLE_CHIP_SX = {
  Creator: roleGlassChipSx('237,66,69', '#fff'),
  Admin: roleGlassChipSx('168,85,247', '#fff'),
  Moderator: roleGlassChipSx('74,222,128', '#0a2e14'),
  // Neutral slate — used for signed-in drivers (no staff role).
  Driver: roleGlassChipSx('148,163,184', '#e2e8f0'),
} as const satisfies Record<string, SxProps<Theme>>;

export type DiscordRole = keyof typeof ROLE_CHIP_SX;

export function formatNumber(value: number) {
  return value.toLocaleString();
}

export function getPodiumChipSx(position: number, zeroIndexed = false): SxProps<Theme> {
  const rank = zeroIndexed ? position + 1 : position;

  if (rank === 1) {
    return {
      ...GLASS_CHIP_SHEEN_SX,
      color: '#fde68a',
      border: '1px solid rgba(245, 158, 11, 0.42)',
      background: 'linear-gradient(180deg, rgba(245,158,11,0.26), rgba(245,158,11,0.11))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.14)',
    };
  }
  if (rank === 2) {
    return {
      ...GLASS_CHIP_SHEEN_SX,
      color: '#e2e8f0',
      border: '1px solid rgba(203, 213, 225, 0.34)',
      background: 'linear-gradient(180deg, rgba(203,213,225,0.2), rgba(148,163,184,0.09))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)',
    };
  }
  if (rank === 3) {
    return {
      ...GLASS_CHIP_SHEEN_SX,
      color: '#ffedd5',
      border: '1px solid rgba(194, 101, 31, 0.42)',
      background: 'linear-gradient(180deg, rgba(194,101,31,0.24), rgba(194,101,31,0.1))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.12)',
    };
  }
  return {
    bgcolor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  };
}

export { getTrackDisplayName, normalizeServerTrackId, leaderboardTrackIdLookupCandidates };

export function formatLaptime(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  const min = Math.floor(ms / 60000);
  const sec = ((ms / 1000) % 60).toFixed(3).padStart(6, '0');
  return `${min}:${sec}`;
}

export function calculateGap(fastestLap: number, currentLap: number) {
  if (fastestLap === currentLap) return '-';
  return `+${((currentLap - fastestLap) / 1000).toFixed(3)}`;
}

/** Static glass highlight + hover lift for license / SR chips. */
function withBadgeGlassHover(base: SxProps<Theme>): SxProps<Theme> {
  return {
    ...GLASS_CHIP_SHEEN_SX,
    ...base,
    transition: (theme: Theme) =>
      theme.transitions.create(['transform', 'box-shadow', 'filter'], { duration: 180 }),
    '@media (hover: hover)': {
      '&:hover': {
        transform: 'translateY(-1px)',
        filter: 'brightness(1.04)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.34), 0 0 0 1px rgba(255,255,255,0.12), 0 10px 24px -18px rgba(0,0,0,0.44)',
      },
    },
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
      '&:hover': {
        transform: 'none',
        filter: 'none',
      },
    },
  } as SxProps<Theme>;
}

/**
 * Translucent frosted-glass tier chip. The tier colour is a *tint* that lets the
 * dark surface bloom through (real Liquid Glass) instead of a solid enamel pill:
 * an even colour wash, a bright specular top edge + grounding bottom, vibrancy
 * and light tier-tinted text that reads on the dark glass. `rgb` is the tier's
 * base colour as "r,g,b"; `text` is a bright pastel of that hue.
 *
 * No `backdrop-filter` on purpose: a single page (e.g. Hall of Fame) renders
 * ~80 of these chips, so per-chip blur would be an aggressive, janky cost for
 * no real gain — there is almost nothing behind a small chip to refract. The
 * translucent tint + specular edge + light text already read as frosted glass.
 */
function glassTierChipSx(rgb: string, text: string): SxProps<Theme> {
  return {
    color: text,
    background: `linear-gradient(180deg, rgba(${rgb},0.34) 0%, rgba(${rgb},0.16) 100%)`,
    border: `1px solid rgba(${rgb},0.55)`,
    textShadow: '0 1px 1px rgba(0,0,0,0.45)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18),' +
      ` 0 1px 2px rgba(0,0,0,0.22), 0 6px 16px -11px rgba(${rgb},0.55)`,
  };
}

/**
 * Single source of truth for license tier accent colours ("r,g,b"). Drives BOTH
 * the chips (getLicenseBadgeSx) and the medal panels on the driver profile
 * (getLicensePanelSx), so a tier's chip and its card always match. Authentic
 * materials, each a distinct hue: Elite amethyst, Diamond icy cyan, Platinum
 * lustrous white, Gold warm metallic gold, Silver neutral grey, Bronze copper;
 * "+" is the brighter shade. Rookie is red (lowest/entry tier).
 */
export const LICENSE_TIER_RGB: Record<string, string> = {
  Elite: '192,132,252',
  'Diamond+': '130,236,252',
  Diamond: '45,212,232',
  'Platinum+': '226,238,246',
  Platinum: '183,206,223',
  'Gold+': '246,205,90',
  Gold: '226,170,40',
  'Silver+': '203,210,217',
  Silver: '165,174,185',
  'Bronze+': '208,138,72',
  Bronze: '180,110,55',
  Rookie: '248,113,113',
};

/** Light text tint paired with each {@link LICENSE_TIER_RGB} entry. */
const LICENSE_TIER_TEXT: Record<string, string> = {
  Elite: '#EBDDFF',
  'Diamond+': '#E2FBFF',
  Diamond: '#CFFAFE',
  'Platinum+': '#F2F8FC',
  Platinum: '#E4F0FA',
  'Gold+': '#FEF3C7',
  Gold: '#FBEAB0',
  'Silver+': '#EFF2F5',
  Silver: '#E4E8EE',
  'Bronze+': '#F7E2CC',
  Bronze: '#EFD2B6',
  Rookie: '#FEE2E2',
};

/** Medal-panel glow strength per tier [fill, border] — light metals glow less. */
const LICENSE_TIER_PANEL_OPACITY: Record<string, [number, number]> = {
  Elite: [0.42, 0.9],
  'Diamond+': [0.4, 0.85],
  Diamond: [0.38, 0.82],
  'Platinum+': [0.28, 0.65],
  Platinum: [0.25, 0.6],
  'Gold+': [0.38, 0.82],
  Gold: [0.36, 0.78],
  'Silver+': [0.24, 0.58],
  Silver: [0.22, 0.55],
  'Bronze+': [0.36, 0.78],
  Bronze: [0.34, 0.75],
  Rookie: [0.3, 0.72],
};

export function getLicenseBadgeSx(license: string): SxProps<Theme> {
  const rgb = LICENSE_TIER_RGB[license] ?? LICENSE_TIER_RGB.Bronze;
  const text = LICENSE_TIER_TEXT[license] ?? LICENSE_TIER_TEXT.Bronze;
  return withBadgeGlassHover(glassTierChipSx(rgb, text));
}

/**
 * SR tier accent ("r,g,b") on a continuous green -> red *safety* scale (green =
 * clean/safe, red = unsafe); F is the reddest/darkest. Single source for the SR
 * chips and the driver-profile SR panel so they always match.
 */
export function getSrTierRgb(tier: string): string {
  switch (tier.charAt(0)) {
    case 'S':
      return '34,197,94'; // green
    case 'A':
      return '132,204,22'; // lime
    case 'B':
      return '253,224,71'; // yellow
    case 'C':
      return '245,158,11'; // amber
    case 'D':
      return '249,115,22'; // orange
    case 'E':
      return '239,68,68'; // red
    default:
      return '220,38,38'; // F — deepest red
  }
}

function srTierText(tier: string): string {
  switch (tier.charAt(0)) {
    case 'S':
      return '#DCFCE7';
    case 'A':
      return '#ECFCCB';
    case 'B':
      return '#FEF9C3';
    case 'C':
      return '#FDEBC8';
    case 'D':
      return '#FFE2CC';
    case 'E':
      return '#FECACA';
    default:
      return '#FCA5A5'; // F
  }
}

function srTierPanelOpacity(tier: string): [number, number] {
  switch (tier.charAt(0)) {
    case 'S':
      return [0.42, 0.9];
    case 'E':
      return [0.34, 0.75];
    default:
      return [0.36, 0.78];
  }
}

export function getSRBadgeSx(tier: string): SxProps<Theme> {
  return withBadgeGlassHover(glassTierChipSx(getSrTierRgb(tier), srTierText(tier)));
}

/**
 * Tier-tinted glass panel with a quiet static highlight.
 */
function medalPanelShinySx(rgb: string, opacity: number, borderOpacity: number): SxProps<Theme> {
  const o = opacity;
  return {
    ...(GLASS_CARD_INNER_SX as Record<string, unknown>),
    backgroundColor: 'rgba(255,255,255,0.045)',
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.006) 44%, rgba(255,255,255,0) 100%),' +
      `radial-gradient(380px 190px at 96px -70px, rgba(${rgb},${o * 0.6}) 0%, rgba(${rgb},${o * 0.2}) 42%, rgba(${rgb},0) 76%),` +
      `linear-gradient(135deg, rgba(${rgb},${o * 0.22}) 0%, rgba(${rgb},${o * 0.105}) 48.5%, rgba(${rgb},${o * 0.045}) 50.5%, rgba(${rgb},${o * 0.025}) 100%),` +
      'linear-gradient(180deg, rgba(255,255,255,0.028), rgba(255,255,255,0.006))',
    border: `1px solid rgba(${rgb},${borderOpacity * 0.56})`,
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.18)',
      'inset 0 -1px 0 rgba(0,0,0,0.18)',
      `inset 0 0 0 1px rgba(${rgb},${o * 0.18})`,
      `0 16px 34px -28px rgba(${rgb},${o * 0.28})`,
      '0 10px 26px -24px rgba(0,0,0,0.7)',
    ].join(', '),
    ...(GLASS_SPECULAR_SWEEP_SX as Record<string, unknown>),
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
  } as SxProps<Theme>;
}

/**
 * Medal-style tinted panel for a license tier — used on driver profile cards.
 * Same accent colour as the tier chip ({@link LICENSE_TIER_RGB}) so the card
 * and its chip always match.
 */
export function getLicensePanelSx(license: string): SxProps<Theme> {
  const [opacity, borderOpacity] =
    LICENSE_TIER_PANEL_OPACITY[license] ?? LICENSE_TIER_PANEL_OPACITY.Bronze;
  return medalPanelShinySx(LICENSE_TIER_RGB[license] ?? LICENSE_TIER_RGB.Bronze, opacity, borderOpacity);
}

/** Medal-style tinted panel for a safety rating tier (matches the SR chip). */
export function getSRPanelSx(tier: string): SxProps<Theme> {
  const [opacity, borderOpacity] = srTierPanelOpacity(tier);
  return medalPanelShinySx(getSrTierRgb(tier), opacity, borderOpacity);
}

const PACE_WEIGHT = 0.85;
const SR_WEIGHT = 0.15;

export function getOverallCombinedScore(paceScore: number, sr: number, maxPaceScore: number) {
  const paceNorm = maxPaceScore > 0 ? paceScore / maxPaceScore : 0;
  const srNorm = Math.max(0, Math.min(1, (sr - 1.0) / (9.99 - 1.0)));
  return PACE_WEIGHT * paceNorm + SR_WEIGHT * srNorm;
}

/**
 * 1-based overall standing for Rankings → "Overall" (combined score, then pace tie-break).
 * Matches {@link getOverallCombinedScore} ordering used on the rankings page — not `rank.json` array order.
 */
export function getDriverOverallRank(rankData: RankDriver[], guid: string): number | null {
  if (!rankData.length) return null;
  const licenseMap = computeLicenseMap(rankData);
  const maxPaceScore = Math.max(1, ...rankData.map((d) => getDriverLicense(d, licenseMap).paceScore));

  const scored = rankData.map((driver) => {
    const license = getDriverLicense(driver, licenseMap);
    const sr = getDriverSR(driver);
    return {
      guid: driver.guid,
      combined: getOverallCombinedScore(license.paceScore, sr.sr, maxPaceScore),
      paceScore: license.paceScore,
    };
  });

  scored.sort((a, b) => {
    if (b.combined !== a.combined) return b.combined - a.combined;
    return b.paceScore - a.paceScore;
  });

  const idx = scored.findIndex((row) => row.guid === guid);
  return idx >= 0 ? idx + 1 : null;
}
