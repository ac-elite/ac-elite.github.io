import { getSupabaseClient } from 'src/lib/supabase-client';
import { supabaseReadConfigured } from 'src/centralized/supabase-rest';

/** Opt out of the Supabase data source with VITE_SUPABASE_KMR_DATA=0/false/off. */
function kmrSupabaseDisabled(): boolean {
  const v = import.meta.env.VITE_SUPABASE_KMR_DATA?.trim().toLowerCase();
  return v === '0' || v === 'false' || v === 'no' || v === 'off';
}

/**
 * Realtime push: calls `onSync` whenever the `kmr_sync` status row changes —
 * i.e. right after the `sync-kmr-data` Edge Function publishes fresh rank /
 * leaderboard data. Lets an open page refresh itself without a poll.
 * Returns an unsubscribe function; no-op when Supabase reads are unavailable.
 */
export function subscribeKmrSync(onSync: () => void): () => void {
  if (kmrSupabaseDisabled() || !supabaseReadConfigured()) return () => {};
  const client = getSupabaseClient();
  if (!client) return () => {};
  const channel = client
    .channel('kmr-sync-live')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kmr_sync' },
      () => {
        onSync();
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
