/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (https://….supabase.co) — site visit counter */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase legacy anon JWT or new publishable key (sb_publishable_…) — site visit counter */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_KMR_DATA?: string;
  readonly VITE_SUPABASE_LIVE_SERVER_STATUS?: string;
  readonly VITE_SUPABASE_ANALYTICS?: string;
  readonly VITE_SUPABASE_FETCH_TIMEOUT_MS?: string;
  readonly VITE_SUPABASE_STORAGE_TIMEOUT_MS?: string;
  readonly VITE_SUPABASE_UNHEALTHY_COOLDOWN_MS?: string;
  /** Rating source: production defaults to v1; local dev defaults to v2 unless overridden. */
  readonly VITE_RATING_SYSTEM?: 'v1' | 'v2' | 'legacy' | 'preview';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
