/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (https://….supabase.co) — site visit counter */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase legacy anon JWT or new publishable key (sb_publishable_…) — site visit counter */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
