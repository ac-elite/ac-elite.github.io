/** Drivers (or similar) that may carry a unix last_seen from rank data. */
export type WithOptionalLastSeen = { last_seen?: string | number };

/** `public/data/metadata.json` shape (optional fields as synced). */
export type SiteMetadata = {
  lastSync?: string;
  status?: string;
  error?: string;
};

export type SyncHealthLabel = 'Live' | 'Delayed' | 'Stale' | 'Unknown';

export type SyncHealth = {
  label: SyncHealthLabel;
  color: string;
  ageText: string;
};

/**
 * Data freshness for UI badges (same thresholds as former home/dashboard helpers).
 * Use `color` with `statusAccentBorderSx` from `src/lib/status-accent` **only** for accents that
 * represent this freshness. For other panels use `brandAccentBorderSx()`.
 */
export function getSyncHealth(lastSync?: string): SyncHealth {
  if (!lastSync) {
    return { label: 'Unknown', color: '#f59e0b', ageText: 'Unknown' };
  }

  const timestamp = new Date(lastSync).getTime();
  if (!Number.isFinite(timestamp)) {
    return { label: 'Unknown', color: '#f59e0b', ageText: 'Unknown' };
  }

  const diffMs = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const ago = formatTimeAgo(lastSync);

  if (diffMs <= 2 * hour) {
    return { label: 'Live', color: '#22c55e', ageText: ago };
  }

  if (diffMs <= day) {
    return { label: 'Delayed', color: '#f59e0b', ageText: ago };
  }

  return { label: 'Stale', color: '#ef4444', ageText: ago };
}

export function parseTimestamp(input?: string | number): number | undefined {
  if (input == null) return undefined;
  if (typeof input === 'number') {
    const ms = input < 1_000_000_000_000 ? input * 1000 : input;
    return Number.isFinite(ms) ? ms : undefined;
  }
  const ms = new Date(input).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Unknown';
  const parsed = new Date(isoString).getTime();
  if (!Number.isFinite(parsed)) return 'Unknown';

  // Accept legacy/local values that were saved with a trailing "Z" even though
  // they were meant as local time. If parsed UTC lands in the future, try
  // re-parsing without the timezone marker as a local datetime.
  let timestamp = parsed;
  if (parsed > Date.now() + 2 * 60 * 1000 && /Z$/i.test(isoString)) {
    const localGuess = new Date(isoString.replace(/Z$/i, '')).getTime();
    if (Number.isFinite(localGuess) && localGuess <= Date.now() + 2 * 60 * 1000) {
      timestamp = localGuess;
    }
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'just now';

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/**
 * Best-effort “last update” time: max of metadata lastSync and any driver last_seen.
 */
export function getEffectiveLastSync(
  metadataLastSync: string | undefined,
  drivers: readonly WithOptionalLastSeen[]
): string | undefined {
  const metadataMs = parseTimestamp(metadataLastSync);
  const rankLastSeenMs = drivers.reduce<number | undefined>((latest, driver) => {
    const ts = parseTimestamp(driver.last_seen);
    if (!ts) return latest;
    if (!latest || ts > latest) return ts;
    return latest;
  }, undefined);

  const best = [metadataMs, rankLastSeenMs].filter((x): x is number => Boolean(x)).sort((a, b) => b - a)[0];
  return best ? new Date(best).toISOString() : undefined;
}
