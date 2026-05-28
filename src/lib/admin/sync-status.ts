/**
 * Admin "Live data services" panel data.
 *
 * For each data feed it reports two sources side by side:
 *   - live   — the Supabase Edge Function path (kmr_sync / server_status)
 *   - backup — the static JSON the GitHub Actions still commit to the repo
 *
 * `siteOnBackup` is true when Supabase is unreachable, i.e. the site is
 * currently serving the GitHub Actions backup. Watch this before retiring the
 * workflows: a long stretch of all-green live means the backup is safe to drop.
 */
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchStaticJson } from 'src/lib/fetch-json';
import { supabaseBaseUrl, supabaseHeaders, supabaseReadConfigured } from 'src/centralized/supabase-rest';

export type SyncProbe = {
  /** Supabase reachable and a sync row was returned. */
  reachable: boolean;
  /** ISO timestamp of the last sync from the live source, or null. */
  at: string | null;
  /** 'success' | 'error' | 'unknown'. */
  status: string;
  /** Error text from the last failed live sync, if any. */
  error: string | null;
  /** Short human detail, e.g. "17,875 drivers" or "Server online". */
  detail?: string;
};

export type SyncServiceStatus = {
  /** Supabase live source. */
  live: SyncProbe;
  /** Last-updated time of the GitHub Actions static backup file, or null. */
  backupAt: string | null;
  /** True when the live source is unreachable — the site is on the backup. */
  siteOnBackup: boolean;
  /** When false, no GitHub Actions JSON backup exists for this feed. */
  hasStaticBackup?: boolean;
};

export type AdminSyncStatus = {
  kmr: SyncServiceStatus;
  server: SyncServiceStatus;
  results: SyncServiceStatus;
};

const UNREACHABLE: SyncProbe = { reachable: false, at: null, status: 'unknown', error: null };

async function readSupabaseRow<T>(path: string): Promise<T | null> {
  if (!supabaseReadConfigured()) return null;
  try {
    const res = await fetch(`${supabaseBaseUrl()}${path}`, { headers: supabaseHeaders() });
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown;
    if (!Array.isArray(rows) || !rows[0]) return null;
    return rows[0] as T;
  } catch {
    return null;
  }
}

async function fetchKmrSyncStatus(): Promise<SyncServiceStatus> {
  const row = await readSupabaseRow<{
    synced_at?: string;
    status?: string;
    error?: string | null;
    rank_count?: number;
  }>('/rest/v1/kmr_sync?id=eq.1&select=synced_at,status,error,rank_count');

  const live: SyncProbe = row
    ? {
        reachable: true,
        at: typeof row.synced_at === 'string' ? row.synced_at : null,
        status: row.status ?? 'unknown',
        error: row.error ?? null,
        detail:
          typeof row.rank_count === 'number'
            ? `${row.rank_count.toLocaleString()} drivers`
            : undefined,
      }
    : UNREACHABLE;

  let backupAt: string | null = null;
  try {
    const meta = await fetchStaticJson<{ lastSync?: string }>(DATA_FILES.metadata);
    backupAt = typeof meta.lastSync === 'string' ? meta.lastSync : null;
  } catch {
    backupAt = null;
  }

  return { live, backupAt, siteOnBackup: !live.reachable, hasStaticBackup: true };
}

async function fetchServerSyncStatus(): Promise<SyncServiceStatus> {
  const row = await readSupabaseRow<{ fetched_at?: string; online?: boolean }>(
    '/rest/v1/server_status?id=eq.1&select=fetched_at,online'
  );

  const live: SyncProbe = row
    ? {
        reachable: true,
        at: typeof row.fetched_at === 'string' ? row.fetched_at : null,
        status: 'success',
        error: null,
        detail: row.online ? 'Server online' : 'Server offline',
      }
    : UNREACHABLE;

  let backupAt: string | null = null;
  try {
    const track = await fetchStaticJson<{ fetchedAt?: string }>(DATA_FILES.currentTrack);
    backupAt = typeof track.fetchedAt === 'string' ? track.fetchedAt : null;
  } catch {
    backupAt = null;
  }

  return { live, backupAt, siteOnBackup: !live.reachable, hasStaticBackup: true };
}

async function fetchResultsSyncStatus(): Promise<SyncServiceStatus> {
  const row = await readSupabaseRow<{
    synced_at?: string;
    status?: string;
    error?: string | null;
    ingested_count?: number | null;
    session_count?: number | null;
  }>(
    '/rest/v1/results_sync?id=eq.1&select=synced_at,status,error,ingested_count,session_count'
  );

  const live: SyncProbe = row
    ? {
        reachable: true,
        at: typeof row.synced_at === 'string' ? row.synced_at : null,
        status: row.status ?? 'unknown',
        error: row.error ?? null,
        detail: [
          typeof row.session_count === 'number'
            ? `${row.session_count.toLocaleString()} sessions`
            : null,
          typeof row.ingested_count === 'number' && row.ingested_count > 0
            ? `+${row.ingested_count} last run`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined,
      }
    : UNREACHABLE;

  return { live, backupAt: null, siteOnBackup: !live.reachable, hasStaticBackup: false };
}

export async function fetchAdminSyncStatus(): Promise<AdminSyncStatus> {
  const [kmr, server, results] = await Promise.all([
    fetchKmrSyncStatus(),
    fetchServerSyncStatus(),
    fetchResultsSyncStatus(),
  ]);
  return { kmr, server, results };
}
