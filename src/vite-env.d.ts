/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (https://….supabase.co) — site visit counter */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase legacy anon JWT or new publishable key (sb_publishable_…) — site visit counter */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** When `1` / `true` / `yes` / `on`: force merged server payload `online: false` (UI debug). */
  readonly VITE_SERVER_OFFLINE_DEBUG?: string;
  /** When `1` / `true` / `yes`: verbose `[server-status]` logging in the browser console. */
  readonly VITE_SERVER_STATUS_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
