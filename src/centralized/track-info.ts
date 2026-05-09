import { useSyncExternalStore } from 'react';

import bundledCatalog from 'src/centralized/track-catalog.json';

// =============================================================================
// Track catalog store
// =============================================================================
// The track catalog is seeded at module load with the bundled JSON so the very
// first paint never has to wait for the network. A bridge in `src/lib/auth/
// tracks-bridge.ts` fetches the live DB version on app mount (and after admin
// edits) and replaces this in-memory cache via `setTrackCatalog`.
//
// Components that should rerender when the catalog updates call
// `useTrackCatalogVersion()` once at the top of their render.
// =============================================================================

export type TrackInfo = {
  id: string;
  name: string;
  image?: string;
  /** Vertical image shift in pixels; negative moves image up, positive moves image down. */
  imageOffsetY?: number;
  aliases: string[];
};

let snapshot: TrackInfo[] = bundledCatalog as TrackInfo[];
let trackInfoMap: Record<string, TrackInfo> = buildTrackInfoMap(snapshot);
let aliasMap: Record<string, string> = buildAliasMap(snapshot);
let version = 0;

const listeners = new Set<() => void>();

function buildTrackInfoMap(rows: readonly TrackInfo[]): Record<string, TrackInfo> {
  return Object.fromEntries(rows.map((entry) => [entry.id, entry]));
}

function buildAliasMap(rows: readonly TrackInfo[]): Record<string, string> {
  return Object.fromEntries(
    rows.flatMap((entry) => entry.aliases.map((alias) => [alias, entry.id]))
  );
}

function emit(): void {
  for (const cb of listeners) cb();
}

/** Replace the in-memory catalog and notify subscribers. No-op if rows is empty. */
export function setTrackCatalog(rows: readonly TrackInfo[]): void {
  if (rows.length === 0) return;
  snapshot = rows.slice();
  trackInfoMap = buildTrackInfoMap(snapshot);
  aliasMap = buildAliasMap(snapshot);
  version += 1;
  emit();
}

const subscribeStore = (cb: () => void): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const getStoreVersion = (): number => version;

/**
 * Subscribe to catalog updates. Returns the current version number — when it
 * changes (because admin saved an edit, or the initial DB fetch landed),
 * components rerender and pick up fresh data from `getTrackDisplayName` etc.
 */
export function useTrackCatalogVersion(): number {
  return useSyncExternalStore(subscribeStore, getStoreVersion, getStoreVersion);
}

// =============================================================================
// Lookup helpers — signature unchanged from the old static implementation.
// =============================================================================

export function normalizeServerTrackId(trackId: string): string {
  let t = trackId.trim();
  t = t.replace('-layout', '_layout').replace(/-/g, '_');
  return aliasMap[t] ?? t;
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
  const info = trackInfoMap[id] ?? (!id.endsWith('_') ? trackInfoMap[`${id}_`] : undefined);
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

/** Read-only access to the current catalog. Used by the admin "track catalog stats" tile. */
export function getAllTracks(): readonly TrackInfo[] {
  return snapshot;
}
