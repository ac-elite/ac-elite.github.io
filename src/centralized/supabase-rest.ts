export function supabaseReadConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

function envMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const SUPABASE_REST_TIMEOUT_MS = envMs(
  import.meta.env.VITE_SUPABASE_FETCH_TIMEOUT_MS,
  3_500
);

export const SUPABASE_STORAGE_TIMEOUT_MS = envMs(
  import.meta.env.VITE_SUPABASE_STORAGE_TIMEOUT_MS,
  2_500
);

const SUPABASE_UNHEALTHY_COOLDOWN_MS = envMs(
  import.meta.env.VITE_SUPABASE_UNHEALTHY_COOLDOWN_MS,
  60_000
);

let supabaseUnavailableUntil = 0;

function isUnhealthyStatus(status: number): boolean {
  return status === 402 || status === 522 || status === 544 || status >= 500;
}

function markSupabaseUnhealthy(): void {
  supabaseUnavailableUntil = Date.now() + SUPABASE_UNHEALTHY_COOLDOWN_MS;
}

export function supabaseTemporarilyUnavailable(): boolean {
  return Date.now() < supabaseUnavailableUntil;
}

export function resetSupabaseCircuitBreaker(): void {
  supabaseUnavailableUntil = 0;
}

export class SupabaseUnavailableError extends Error {
  constructor(message = 'Supabase is temporarily unavailable.') {
    super(message);
    this.name = 'SupabaseUnavailableError';
  }
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

function mergeHeaders(base: HeadersInit | undefined, extra: HeadersInit | undefined): Headers {
  const headers = new Headers(base);
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SUPABASE_REST_TIMEOUT_MS
): Promise<Response> {
  const ctrl = new AbortController();
  const timeout = globalThis.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

type SupabaseFetchOptions = {
  timeoutMs?: number;
  skipCircuitBreaker?: boolean;
};

export async function supabaseFetch(
  pathOrUrl: string,
  init: RequestInit = {},
  options: SupabaseFetchOptions = {}
): Promise<Response> {
  if (!supabaseReadConfigured()) {
    throw new SupabaseUnavailableError('Supabase is not configured.');
  }
  if (!options.skipCircuitBreaker && supabaseTemporarilyUnavailable()) {
    throw new SupabaseUnavailableError();
  }

  const requestUrl = /^https?:\/\//i.test(pathOrUrl)
    ? pathOrUrl
    : `${supabaseBaseUrl()}${pathOrUrl}`;

  try {
    const res = await fetchWithTimeout(
      requestUrl,
      {
        ...init,
        headers: mergeHeaders(supabaseHeaders(), init.headers),
      },
      options.timeoutMs ?? SUPABASE_REST_TIMEOUT_MS
    );
    if (isUnhealthyStatus(res.status)) markSupabaseUnhealthy();
    return res;
  } catch (error) {
    markSupabaseUnhealthy();
    throw error;
  }
}
