import { normalizeServerTrackId } from 'src/lib/ac-elite-data';

/**
 * Hero images for the server join card. Files live under `public/images/tracks/`.
 * Keys must match `normalizeServerTrackId()` output (same ids as `trackNames` in ac-elite-data).
 */
const TRACK_HERO_IMAGES: Record<string, string> = {
  ks_red_bull_ring_layout_gp: '/images/tracks/ks_red_bull_ring_layout_gp.jpg',
};

/** Public URL (site root) for a track hero, or null if none configured. */
export function getTrackHeroImageSrc(rawTrackId: string): string | null {
  const id = normalizeServerTrackId(rawTrackId.trim());
  if (!id) return null;
  return TRACK_HERO_IMAGES[id] ?? null;
}
