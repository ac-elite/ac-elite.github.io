import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let cached: SupabaseClient | null = null;

/**
 * Lazily-instantiated Supabase client used for Auth (sign-in, session, role lookup).
 * Returns `null` when env vars are missing so we can render a clear "not configured"
 * state instead of crashing the bundle.
 *
 * Note: existing analytics code (site visits, server status) keeps using raw `fetch`
 * against PostgREST — we only introduce this client where the JWT/session machinery
 * is genuinely useful (Auth).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached) return cached;
  if (!url || !anonKey) return null;
  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'ace-auth',
    },
  });
  return cached;
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(url && anonKey);
}
