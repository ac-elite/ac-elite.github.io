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

export function getLicenseBadgeSx(license: string): SxProps<Theme> {
  // Each metal gets a distinct hue *and* text tint so adjacent tiers never read
  // as the same chip. The old Platinum / Silver / Rookie were all the same
  // grey-blue; they are now icy-steel-blue / neutral-grey / warm-stone.
  const styles: Record<string, SxProps<Theme>> = {
    Elite: glassTierChipSx('192,132,252', '#EBDDFF'), // violet
    'Diamond+': glassTierChipSx('96,165,250', '#DBEAFE'), // azure blue
    Diamond: glassTierChipSx('34,211,238', '#CFFAFE'), // cyan
    'Platinum+': glassTierChipSx('167,226,246', '#E8F8FF'), // icy cyan-white
    Platinum: glassTierChipSx('125,196,224', '#D6F0FB'), // icy steel blue
    'Gold+': glassTierChipSx('253,224,71', '#FEF9C3'), // bright yellow
    Gold: glassTierChipSx('250,204,21', '#FDF0C2'), // gold
    'Silver+': glassTierChipSx('196,205,216', '#EFF2F6'), // light neutral grey
    Silver: glassTierChipSx('148,163,184', '#DEE5EE'), // medium slate grey
    'Bronze+': glassTierChipSx('251,146,60', '#FFE7CC'), // light orange
    Bronze: glassTierChipSx('211,120,72', '#FADFCD'), // copper / bronze
    Rookie: glassTierChipSx('248,113,113', '#FEE2E2'), // red — the lowest/entry tier
  };
  return withBadgeGlassHover(styles[license] || styles.Bronze);
}

export function getSRBadgeSx(tier: string): SxProps<Theme> {
  const first = tier.charAt(0);
  if (first === 'S') return withBadgeGlassHover(glassTierChipSx('34,197,94', '#DCFCE7'));
  if (first === 'A') return withBadgeGlassHover(glassTierChipSx('167,139,250', '#EDE9FE'));
  if (first === 'B') return withBadgeGlassHover(glassTierChipSx('234,242,57', '#FBFCD3'));
  if (first === 'C') return withBadgeGlassHover(glassTierChipSx('209,213,219', '#F1F5F9'));
  if (first === 'D') return withBadgeGlassHover(glassTierChipSx('234,122,45', '#FFEDD5'));
  if (first === 'E') return withBadgeGlassHover(glassTierChipSx('156,163,175', '#E5E7EB'));
  // F — the lowest SR tier; red, matching the Rookie license chip.
  return withBadgeGlassHover(glassTierChipSx('248,113,113', '#FEE2E2'));
}

/**
 * Tier-tinted glass panel with a quiet static highlight.
 */
function medalPanelShinySx(rgb: string, opacity: number, borderOpacity: number): SxProps<Theme> {
  const o = opacity;
  return {
    ...(GLASS_CARD_INNER_SX as Record<string, unknown>),
    backgroundColor: 'rgba(16,31,61,0.62)',
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.006) 44%, rgba(255,255,255,0) 100%),' +
      `radial-gradient(380px 190px at 96px -70px, rgba(${rgb},${o * 0.6}) 0%, rgba(${rgb},${o * 0.2}) 42%, rgba(${rgb},0) 76%),` +
      `linear-gradient(135deg, rgba(${rgb},${o * 0.22}) 0%, rgba(${rgb},${o * 0.105}) 48.5%, rgba(${rgb},${o * 0.045}) 50.5%, rgba(${rgb},${o * 0.025}) 100%),` +
      'linear-gradient(180deg, rgba(22,38,70,0.24), rgba(16,31,61,0.5))',
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
