import { getSupabaseClient } from 'src/lib/supabase-client';
import {
  supabaseReadConfigured,
  supabaseTemporarilyUnavailable,
} from 'src/centralized/supabase-rest';

/** Opt in to Supabase Storage-driven refreshes for the large KMR JSON blobs. */
function kmrStorageEnabled(): boolean {
  const v = (import.meta.env.VITE_SUPABASE_KMR_STORAGE ?? import.meta.env.VITE_SUPABASE_KMR_DATA)
    ?.trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/**
 * Realtime push: calls `onSync` whenever the `kmr_sync` status row changes —
 * i.e. right after the `sync-kmr-data` Edge Function publishes fresh rank /
 * leaderboard data. Lets an open page refresh itself without a poll.
 * Returns an unsubscribe function; no-op when Supabase reads are unavailable.
 */
export function subscribeKmrSync(onSync: () => void): () => void {
  if (!kmrStorageEnabled() || !supabaseReadConfigured()) return () => {};
  if (supabaseTemporarilyUnavailable()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};

  const hasDocument = typeof document !== 'undefined';
  // Defer refetches while the tab is hidden so abandoned/background tabs don't
  // re-pull the multi-MB rank/leaderboard JSON on every ~15-min sync. Missed
  // syncs coalesce into a single refetch when the tab becomes visible again.
  let pendingWhileHidden = false;

  const triggerSync = () => {
    if (hasDocument && document.visibilityState === 'hidden') {
      pendingWhileHidden = true;
      return;
    }
    onSync();
  };

  const onVisibilityChange = () => {
    if (pendingWhileHidden && document.visibilityState === 'visible') {
      pendingWhileHidden = false;
      onSync();
    }
  };
  if (hasDocument) document.addEventListener('visibilitychange', onVisibilityChange);

  const channel = client
    .channel('kmr-sync-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kmr_sync' }, () => {
      triggerSync();
    })
    .subscribe();
  return () => {
    if (hasDocument) document.removeEventListener('visibilitychange', onVisibilityChange);
    void client.removeChannel(channel);
  };
}
