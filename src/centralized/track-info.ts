import trackCatalog from 'src/centralized/track-catalog.json';

export type TrackInfo = {
  id: string;
  name: string;
  image?: string;
  /** Vertical image shift in pixels; negative moves image up, positive moves image down. */
  imageOffsetY?: number;
  aliases: string[];
};

const TRACKS = trackCatalog as TrackInfo[];

/** Canonical id -> track info. */
export const TRACK_INFO: Record<string, TrackInfo> = Object.fromEntries(
  TRACKS.map((entry) => [entry.id, entry])
);

/** Server id -> canonical leaderboard key. */
export const SERVER_TRACK_ID_ALIASES: Record<string, string> = Object.fromEntries(
  TRACKS.flatMap((entry) => entry.aliases.map((alias) => [alias, entry.id]))
);

export function normalizeServerTrackId(trackId: string): string {
  let t = trackId.trim();
  t = t.replace('-layout', '_layout').replace(/-/g, '_');
  return SERVER_TRACK_ID_ALIASES[t] ?? t;
}

export function leaderboardTrackIdLookupCandidates(rawTrackId: string): string[] {
  const t = rawTrackId.trim();
  if (!t) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (id: string) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
    if (!id.endsWith('_')) {
      const suffixed = `${id}_`;
      if (!seen.has(suffixed)) {
        seen.add(suffixed);
        out.push(suffixed);
      }
    }
  };

  push(normalizeServerTrackId(t));
  push(t);
  push(t.replace('-layout', '_layout'));
  push(t.replace(/-/g, '_'));
  push(t.replace('-layout', '_layout').replace(/-/g, '_'));

  return out;
}

export function getTrackInfo(rawTrackId: string): TrackInfo | null {
  const id = normalizeServerTrackId(rawTrackId);
  const info = TRACK_INFO[id] ?? (!id.endsWith('_') ? TRACK_INFO[`${id}_`] : undefined);
  return info ?? null;
}

export function getTrackDisplayName(rawTrackId: string): string {
  const id = normalizeServerTrackId(rawTrackId);
  return getTrackInfo(id)?.name ?? id.replace(/_/g, ' ').trim();
}

export function getTrackHeroImageSrc(rawTrackId: string): string | null {
  const image = getTrackInfo(rawTrackId)?.image?.trim();
  return image ? image : null;
}

export function getTrackHeroImageOffsetY(rawTrackId: string): number {
  const offset = getTrackInfo(rawTrackId)?.imageOffsetY;
  return typeof offset === 'number' && Number.isFinite(offset) ? offset : 0;
}
