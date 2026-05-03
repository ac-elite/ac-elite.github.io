/**
 * Called by cron-job.org (or handmatig) met header:
 *   Authorization: Bearer <CRON_SECRET>
 * of: x-cron-secret: <CRON_SECRET>
 *
 * Haalt http://157.90.3.32:18283/INFO op (override via SERVER_INFO_URL) en schrijft één rij in public.server_status.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/** Zelfde canonieke lijst als .github/workflows/current-track.yml (Python). */
const CANONICAL_TRAILING_UNDERSCORE = [
  'imola_',
  'ks_laguna_seca_',
  'magione_',
  'monza_',
  'mugello_',
  'spa_',
  'ks_zandvoort_',
  'canada_2021_',
] as const;

function normalizeTrackId(track: unknown): string {
  if (typeof track !== 'string') return '';
  let t = track.replace(/-layout/g, '_layout').replace(/-/g, '_');
  for (const canon of CANONICAL_TRAILING_UNDERSCORE) {
    const short = canon.slice(0, -1);
    if (t === canon || t === short) return canon;
  }
  return t;
}

function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET not configured' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const auth = req.headers.get('Authorization');
  const headerSecret = req.headers.get('x-cron-secret');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer !== cronSecret && headerSecret !== cronSecret) {
    return unauthorized();
  }

  const infoUrl = Deno.env.get('SERVER_INFO_URL') ?? 'http://157.90.3.32:18283/INFO';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase env missing' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const fetchedAt = new Date().toISOString();
  let online = false;
  let track = '';
  let info: Record<string, unknown> = {};

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(infoUrl, { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      track = normalizeTrackId(data?.track);
      online = true;
      info = { ...data, track };
    }
  } catch {
    online = false;
    track = '';
    info = {};
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from('server_status').upsert(
    {
      id: 1,
      online,
      track,
      fetched_at: fetchedAt,
      info,
    },
    { onConflict: 'id' }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, online, track, fetchedAt, info }), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
