/**
 * Admin "Live data services" panel data.
 *
 * Reports the live Supabase paths the site depends on:
 * - `kmr_sync` for rank / leaderboard / metadata updates
 * - `server_status` for the live AC Elite lobby snapshot
 */
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
};

export type AdminSyncStatus = {
  kmr: SyncServiceStatus;
  server: SyncServiceStatus;
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

  return { live };
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

  return { live };
}

export async function fetchAdminSyncStatus(): Promise<AdminSyncStatus> {
  const [kmr, server] = await Promise.all([fetchKmrSyncStatus(), fetchServerSyncStatus()]);
  return { kmr, server };
}
