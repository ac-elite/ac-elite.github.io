export function supabaseReadConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export function supabaseHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
  };
  // New platform keys (sb_publishable_ / sb_secret_) are not JWTs — do not use Bearer.
  // Legacy anon JWT still uses Authorization for PostgREST.
  if (!key.startsWith('sb_')) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

export function supabaseBaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL!.trim().replace(/\/$/, '');
}
