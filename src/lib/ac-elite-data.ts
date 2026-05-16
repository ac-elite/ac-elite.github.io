import type { Theme, SxProps } from '@mui/material/styles';

import { GLASS_CHIP_SHEEN_SX, GLASS_SPECULAR_SWEEP_SX } from 'src/lib/glass';
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

export const ROLE_CHIP_SX = {
  Creator: {
    color: '#fff',
    background: 'linear-gradient(135deg, #FF6B6B 0%, #ED4245 100%)',
    border: '1px solid rgba(237,66,69,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
  },
  Admin: {
    color: '#fff',
    background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
    border: '1px solid rgba(168,85,247,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
  },
  Moderator: {
    color: '#0a2e14',
    background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 100%)',
    border: '1px solid rgba(74,222,128,0.72)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  },
} as const satisfies Record<string, SxProps<Theme>>;

export type DiscordRole = keyof typeof ROLE_CHIP_SX;

export function formatNumber(value: number) {
  return value.toLocaleString();
}

export function getPodiumChipSx(position: number, zeroIndexed = false): SxProps<Theme> {
  const rank = zeroIndexed ? position + 1 : position;

  if (rank === 1) {
    return {
      color: '#fef3c7',
      border: '1px solid rgba(245, 158, 11, 0.55)',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.38), rgba(245,158,11,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
    };
  }
  if (rank === 2) {
    return {
      color: '#e2e8f0',
      border: '1px solid rgba(148, 163, 184, 0.55)',
      background: 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(148,163,184,0.12))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  if (rank === 3) {
    return {
      color: '#ffedd5',
      border: '1px solid rgba(194, 101, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(194,101,31,0.36), rgba(194,101,31,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
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

/** Animated glass sheen + hover lift for license / SR chips (same timing as theme buttons). */
function withBadgeGlassHover(base: SxProps<Theme>): SxProps<Theme> {
  return {
    ...GLASS_CHIP_SHEEN_SX,
    ...base,
    transition: (theme: Theme) =>
      theme.transitions.create(['transform', 'box-shadow', 'filter'], { duration: 180 }),
    '@media (hover: hover)': {
      '&:hover': {
        transform: 'translateY(-1px)',
        filter: 'brightness(1.08)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.48), 0 0 0 1px rgba(255,255,255,0.2), 0 10px 28px rgba(0,0,0,0.38), 0 0 20px rgba(255,255,255,0.14)',
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

export function getLicenseBadgeSx(license: string): SxProps<Theme> {
  const textColor = '#111827';
  const glass = (start: string, end: string, border: string, color = textColor): SxProps<Theme> => ({
    color,
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
    border: `1px solid ${border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  });

  const styles: Record<string, SxProps<Theme>> = {
    Elite: glass('#D8B4FE', '#C084FC', 'rgba(216,180,254,0.9)'),
    'Diamond+': {
      color: '#0b1f3a',
      background: 'linear-gradient(135deg, #93C5FD 0%, #60A5FA 52%, #A5F3FC 100%)',
      border: '1px solid rgba(191,219,254,0.92)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 0 0 1px rgba(147,197,253,0.22)',
    },
    Diamond: glass('#67E8F9', '#22D3EE', 'rgba(103,232,249,0.8)'),
    'Platinum+': glass('#F8FAFC', '#E2E8F0', 'rgba(226,232,240,0.95)'),
    Platinum: glass('#E2E8F0', '#CBD5E1', 'rgba(203,213,225,0.86)'),
    'Gold+': glass('#FEF08A', '#FDE047', 'rgba(254,240,138,0.88)'),
    Gold: glass('#FDE047', '#FACC15', 'rgba(250,204,21,0.86)'),
    'Silver+': glass('#C9D5E1', '#A8B9CC', 'rgba(201,213,225,0.84)'),
    Silver: glass('#D9E2EC', '#C9D5E1', 'rgba(201,213,225,0.82)'),
    'Bronze+': glass('#FDBA74', '#FB923C', 'rgba(251,146,60,0.86)'),
    Bronze: glass('#FB923C', '#F97316', 'rgba(249,115,22,0.84)'),
    Rookie: glass('#CBD5E1', '#B2BDC8', 'rgba(178,189,200,0.82)'),
  };
  return withBadgeGlassHover(styles[license] || styles.Bronze);
}

export function getSRBadgeSx(tier: string): SxProps<Theme> {
  const textColor = '#111827';
  const glass = (start: string, end: string, border: string, color = textColor): SxProps<Theme> => ({
    color,
    background: `linear-gradient(135deg, ${start} 0%, ${end} 100%)`,
    border: `1px solid ${border}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
  });

  const first = tier.charAt(0);
  if (first === 'S') return withBadgeGlassHover(glass('#4ADE80', '#22C55E', 'rgba(74,222,128,0.86)'));
  if (first === 'A') return withBadgeGlassHover(glass('#A78BFA', '#7C3AED', 'rgba(167,139,250,0.84)'));
  if (first === 'B') return withBadgeGlassHover(glass('#FDE047', '#EAF239', 'rgba(234,242,57,0.86)'));
  if (first === 'C') return withBadgeGlassHover(glass('#E5E7EB', '#D1D5DB', 'rgba(209,213,219,0.84)'));
  if (first === 'D') return withBadgeGlassHover(glass('#FDBA74', '#EA7A2D', 'rgba(253,186,116,0.84)'));
  if (first === 'E') return withBadgeGlassHover(glass('#D1D5DB', '#9CA3AF', 'rgba(209,213,219,0.8)'));
  return withBadgeGlassHover(glass('#FB7185', '#FF1F2D', 'rgba(251,113,133,0.86)'));
}

/**
 * Tier-tinted medal panel + static gloss layers + animated specular sweep ({@link GLASS_SPECULAR_SWEEP_SX}, same
 * rhythm as license/SR chips).
 */
function medalPanelShinySx(rgb: string, opacity: number, borderOpacity: number): SxProps<Theme> {
  const o = opacity;
  const base = `linear-gradient(135deg, rgba(${rgb},${o}) 0%, rgba(${rgb},${o * 0.55}) 55%, rgba(${rgb},${o * 0.28}) 100%)`;
  const topSheen = `linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.04) 24%, rgba(255,255,255,0) 46%)`;
  const bottomDepth = `linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.16) 100%)`;
  return {
    background: `${topSheen}, ${bottomDepth}, ${base}`,
    border: `1.5px solid rgba(${rgb},${borderOpacity * 0.7})`,
    borderLeft: `3.5px solid rgba(${rgb},${borderOpacity})`,
    boxShadow: [
      'inset 0 1px 0 rgba(255,255,255,0.28)',
      'inset 0 -1px 0 rgba(0,0,0,0.14)',
      `0 0 18px rgba(${rgb},${o * 0.6})`,
      `0 0 4px rgba(${rgb},${o * 0.35})`,
    ].join(', '),
    ...GLASS_SPECULAR_SWEEP_SX,
    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
  };
}

/** Medal-style tinted panel for license tier — used on driver profile stat cards. */
export function getLicensePanelSx(license: string): SxProps<Theme> {
  const medal = (rgb: string, opacity = 0.38, borderOpacity = 0.85) =>
    medalPanelShinySx(rgb, opacity, borderOpacity);
  const map: Record<string, SxProps<Theme>> = {
    Elite: medal('192,132,252', 0.42, 0.9),
    'Diamond+': medal('96,165,250', 0.4, 0.85),
    Diamond: medal('34,211,238', 0.38, 0.82),
    'Platinum+': medal('226,232,240', 0.28, 0.65),
    Platinum: medal('203,213,225', 0.25, 0.6),
    'Gold+': medal('253,224,71', 0.38, 0.82),
    Gold: medal('250,204,21', 0.36, 0.78),
    'Silver+': medal('168,185,204', 0.24, 0.58),
    Silver: medal('201,213,225', 0.22, 0.55),
    'Bronze+': medal('251,146,60', 0.36, 0.78),
    Bronze: medal('249,115,22', 0.34, 0.75),
    Rookie: medal('178,189,200', 0.18, 0.48),
  };
  return map[license] || map.Bronze;
}

/** Medal-style tinted panel for safety rating tier. */
export function getSRPanelSx(tier: string): SxProps<Theme> {
  const medal = (rgb: string, opacity = 0.38, borderOpacity = 0.85) =>
    medalPanelShinySx(rgb, opacity, borderOpacity);
  const first = tier.charAt(0);
  if (first === 'S') return medal('34,197,94', 0.42, 0.9);
  if (first === 'A') return medal('124,58,237', 0.4, 0.85);
  if (first === 'B') return medal('234,242,57', 0.36, 0.78);
  if (first === 'C') return medal('209,213,219', 0.22, 0.55);
  if (first === 'D') return medal('234,122,45', 0.36, 0.78);
  if (first === 'E') return medal('156,163,175', 0.18, 0.48);
  return medal('251,113,133', 0.36, 0.78);
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
