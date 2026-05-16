/**
 * AC Elite — sync-kmr-data
 * ============================================================================
 * Replaces the hourly "Sync KMR Data" GitHub Action with a Supabase Edge
 * Function so rank/leaderboard data can refresh on a short interval without a
 * repo commit + Pages rebuild.
 *
 * Flow per run:
 *   1. Download `rank.json` + `leaderboard.json` over FTP (same server the old
 *      workflow used; tries the `kissmyrank/` folder then the FTP root).
 *   2. Validate the JSON shape (array / object) so we never publish garbage.
 *   3. Upload both files + a `metadata.json` to the public Storage bucket
 *      `kmr-data`. The site reads from there, falling back to the static
 *      `public/data/*.json` still committed by the workflow (kept as backup).
 *   4. Upsert the `kmr_sync` status row (id=1) — the site subscribes to this
 *      via Realtime and refetches within ~1s of a successful sync.
 *   5. Phase 3: if the newest `rank_history` row is older than ~55 min, insert
 *      a slim per-driver snapshot so the site can show deltas over any window.
 *
 * Auth: `verify_jwt = false`; caller must present CRON_SECRET as
 *   `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 *
 * Required project secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET,
 *   FTP_HOST, FTP_USER, FTP_PASS
 * Optional:
 *   FTP_SECURE      "true" for FTPS (default false)
 *   KMR_REMOTE_DIR  remote folder to try first (default "kissmyrank")
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import ftp from 'npm:basic-ftp@5.0.5';
import { Buffer } from 'node:buffer';
import { Writable } from 'node:stream';
// Pure scoring module (no MUI/DOM deps) — shared with the React app so the
// snapshot's SR/pace match exactly what the site computes.
import {
  safetyRating,
  computeLicenseMap,
  type RankDriver as ScoredDriver,
} from '../../../src/lib/ac-elite-scoring.ts';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const BUCKET = 'kmr-data';
/** Insert a new history snapshot only when the last one is older than this. */
const HISTORY_MIN_GAP_MS = 55 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function candidateRemotePaths(dir: string, fileName: string): string[] {
  const d = dir.replace(/\/+$/, '');
  return [`${d}/${fileName}`, `/${d}/${fileName}`, fileName, `/${fileName}`];
}

async function downloadToBuffer(client: ftp.Client, remotePath: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  await client.downloadTo(sink, remotePath);
  return Buffer.concat(chunks);
}

/** Try each candidate path; return the first that downloads + parses as JSON. */
async function downloadJsonWithFallback(
  client: ftp.Client,
  dir: string,
  fileName: string
): Promise<unknown> {
  let lastError: unknown = null;
  for (const remotePath of candidateRemotePaths(dir, fileName)) {
    try {
      const buf = await downloadToBuffer(client, remotePath);
      const text = buf.toString('utf8');
      if (!text.trim()) throw new Error('empty file');
      return JSON.parse(text);
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Could not download ${fileName}: ${(lastError as Error)?.message ?? 'unknown error'}`
  );
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** Slim per-driver record kept in `rank_history` — scalars only, no nested
 *  leaderboard, so a snapshot is a few tens of KB instead of several MB.
 *  `sr` (Safety Rating) and `pace` (license pace score) are computed at
 *  snapshot time so the site can show SR/pace deltas over any window. */
function slimDriver(d: ScoredDriver, sr: number, pace: number) {
  return {
    g: typeof d.guid === 'string' ? d.guid : '',
    p: num(d.points),
    k: num(d.kilometers),
    w: num(d.wins),
    pd: num(d.podiums),
    pl: num(d.poles),
    fl: num(d.flaps),
    i: num(d.infr),
    c: num(d.collisions),
    sr: Math.round(sr * 1000) / 1000,
    pace: Math.round(pace),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) return json({ error: 'CRON_SECRET not configured' }, 500);
  const auth = req.headers.get('Authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (bearer !== cronSecret && req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const ftpHost = Deno.env.get('FTP_HOST');
  const ftpUser = Deno.env.get('FTP_USER');
  const ftpPass = Deno.env.get('FTP_PASS');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase env missing' }, 500);
  if (!ftpHost || !ftpUser || !ftpPass) return json({ error: 'FTP env missing' }, 500);

  const ftpSecure = (Deno.env.get('FTP_SECURE') ?? 'false').toLowerCase() === 'true';
  const remoteDir = Deno.env.get('KMR_REMOTE_DIR') ?? 'kissmyrank';
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const syncedAt = new Date().toISOString();

  // --- 1. Fetch + validate over FTP -----------------------------------------
  let rank: unknown;
  let leaderboard: unknown;
  const client = new ftp.Client(20_000);
  client.ftp.verbose = false;
  try {
    await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, secure: ftpSecure });
    rank = await downloadJsonWithFallback(client, remoteDir, 'rank.json');
    leaderboard = await downloadJsonWithFallback(client, remoteDir, 'leaderboard.json');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FTP error';
    await supabase
      .from('kmr_sync')
      .upsert({ id: 1, synced_at: syncedAt, status: 'error', error: message }, { onConflict: 'id' });
    return json({ error: message }, 502);
  } finally {
    client.close();
  }

  if (!Array.isArray(rank)) return json({ error: 'rank.json is not an array' }, 502);
  if (!leaderboard || typeof leaderboard !== 'object' || Array.isArray(leaderboard)) {
    return json({ error: 'leaderboard.json is not an object' }, 502);
  }

  const metadata = { lastSync: syncedAt, status: 'success' };

  // --- 2. Publish to the public Storage bucket ------------------------------
  const uploads: [string, string][] = [
    ['rank.json', JSON.stringify(rank)],
    ['leaderboard.json', JSON.stringify(leaderboard)],
    ['metadata.json', JSON.stringify(metadata)],
  ];
  for (const [name, body] of uploads) {
    const { error } = await supabase.storage.from(BUCKET).upload(name, body, {
      contentType: 'application/json',
      upsert: true,
    });
    if (error) {
      await supabase
        .from('kmr_sync')
        .upsert(
          { id: 1, synced_at: syncedAt, status: 'error', error: `storage: ${error.message}` },
          { onConflict: 'id' }
        );
      return json({ error: `storage upload failed: ${error.message}` }, 500);
    }
  }

  // --- 3. Phase 3: hourly slim history snapshot -----------------------------
  let snapshotInserted = false;
  const { data: lastRows } = await supabase
    .from('rank_history')
    .select('captured_at')
    .order('captured_at', { ascending: false })
    .limit(1);
  const lastAt = lastRows?.[0]?.captured_at ? new Date(lastRows[0].captured_at).getTime() : 0;
  if (Date.now() - lastAt >= HISTORY_MIN_GAP_MS) {
    try {
      // Compute SR + license pace with the SAME logic the site uses, so windowed
      // SR/pace deltas line up exactly with the live values.
      const scored = rank as ScoredDriver[];
      const licenseMap = computeLicenseMap(scored);
      const drivers = scored
        .map((d) => slimDriver(d, safetyRating(d), licenseMap.get(d.guid)?.paceScore ?? 0))
        .filter((d) => d.g);
      const { error } = await supabase.from('rank_history').insert({
        captured_at: syncedAt,
        driver_count: drivers.length,
        drivers,
      });
      if (error) console.error('rank_history insert failed:', error.message);
      else snapshotInserted = true;
    } catch (err) {
      // A scoring/snapshot failure must not break the main sync (storage + status).
      console.error('rank_history snapshot failed:', err instanceof Error ? err.message : err);
    }
  }

  // --- 4. Status row — drives the site's Realtime refetch -------------------
  const { error: syncErr } = await supabase.from('kmr_sync').upsert(
    {
      id: 1,
      synced_at: syncedAt,
      status: 'success',
      error: null,
      rank_count: (rank as unknown[]).length,
    },
    { onConflict: 'id' }
  );
  if (syncErr) return json({ error: `kmr_sync upsert failed: ${syncErr.message}` }, 500);

  return json({
    ok: true,
    syncedAt,
    rankCount: (rank as unknown[]).length,
    snapshotInserted,
  });
});
