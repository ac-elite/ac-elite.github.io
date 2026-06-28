export type RatingSystem = 'v1' | 'v2';

function normalizeRatingSystem(value: string | undefined): RatingSystem | null {
  const v = value?.trim().toLowerCase();
  if (v === 'v1' || v === 'legacy') return 'v1';
  if (v === 'v2') return 'v2';
  return null;
}

/** The current rating system is the default; legacy remains available as an explicit fallback. */
export function getRatingSystem(): RatingSystem {
  return normalizeRatingSystem(import.meta.env.VITE_RATING_SYSTEM) ?? 'v2';
}

export function ratingV2Enabled(): boolean {
  return getRatingSystem() === 'v2';
}

