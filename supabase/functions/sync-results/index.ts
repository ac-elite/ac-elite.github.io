/**
 * AC Elite — sync-results
 * ============================================================================
 * Ingests Assetto Corsa server session results (RACE / QUALIFY / PRACTICE) from
 * the `results/` folder on the same FTP server `sync-kmr-data` already uses.
 *
 * Flow per run:
 *   1. List the remote `results/` dir; keep `*_RACE/QUALIFY/PRACTICE.json` files.
 *   2. Dedupe against `sessions.session_file` rows already ingested.
 *   3. Download + parse up to RESULTS_MAX_PER_RUN of the newest un-ingested
 *      files into a slim { classification, laps, incidents } payload and insert
 *      one `sessions` row each (the raw AC files are mostly GuidsList noise).
 *   4. Upsert the `results_sync` status row (id=1) for the site's Realtime refetch.
 *
 * Auth: `verify_jwt = false`; caller presents CRON_SECRET as
 *   `Authorization: Bearer <secret>` or `x-cron-secret: <secret>`.
 *
 * Required project secrets (shared with sync-kmr-data):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, FTP_HOST, FTP_USER, FTP_PASS
 * Optional:
 *   FTP_SECURE           "true" for FTPS (default false)
 *   RESULTS_REMOTE_DIR   remote folder to read (default "results")
 *   RESULTS_MAX_PER_RUN  max new files to ingest per run (default 30)
 *   RESULTS_SINCE        only ingest sessions on/after this date, e.g. "2026-05-27"
 *                        (older files are skipped by filename date, never downloaded)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import ftp from 'npm:basic-ftp@5.0.5';
import { Buffer } from 'node:buffer';
import { Writable } from 'node:stream';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const NO_TIME = 999999999; // AC sentinel for "no valid lap"
const FILE_RE = /^(\d+)_(\d+)_(\d+)_(\d+)_(\d+)_(RACE|QUALIFY|PRACTICE)\.json$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// --- AC result file shapes (only the fields we keep) -------------------------
type RawDriver = { Guid?: string; Name?: string; Nation?: string };
type RawCar = { CarId: number; Driver?: RawDriver; Model?: string; Skin?: string };
type RawLap = {
  CarId: number;
  DriverGuid?: string;
  DriverName?: string;
  LapTime?: number;
  Sectors?: number[];
  Cuts?: number;
  Tyre?: string;
  Timestamp?: number;
};
type RawResult = {
  CarId: number;
  BestLap?: number;
  CarModel?: string;
  DriverGuid?: string;
  DriverName?: string;
  TotalTime?: number;
  NumLaps?: number;
  GridPosition?: number;
  HasPenalty?: boolean;
  PenaltyTime?: number;
  LapPenalty?: number;
  Disqualified?: boolean;
};
type RawEvent = {
  Type?: string;
  Driver?: RawDriver;
  OtherDriver?: RawDriver;
  ImpactSpeed?: number;
  Timestamp?: number;
};
type RawSession = {
  Cars?: RawCar[];
  Events?: RawEvent[];
  Laps?: RawLap[];
  Result?: RawResult[];
  TrackName?: string;
  TrackConfig?: string;
  Type?: string;
  Date?: string;
  SessionFile?: string;
  EventName?: string;
};

function downloadToBuffer(client: ftp.Client, remotePath: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });
  return client.downloadTo(sink, remotePath).then(() => Buffer.concat(chunks));
}

function validLap(ms: number | undefined): number | null {
  return typeof ms === 'number' && ms > 0 && ms < NO_TIME ? ms : null;
}

/** Newest-first sort key parsed from the filename (fields are not zero-padded). */
function fileSortKey(name: string): number {
  const m = FILE_RE.exec(name);
  if (!m) return 0;
  const [, y, mo, d, h, mi] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi);
}

function parseSession(raw: RawSession, fileName: string) {
  const type = (raw.Type ?? '').toUpperCase() || inferTypeFromName(fileName);

  const skinByGuid = new Map<string, string>();
  for (const c of raw.Cars ?? []) {
    const g = c.Driver?.Guid;
    if (g && c.Skin && !skinByGuid.has(g)) skinByGuid.set(g, c.Skin);
  }

  const results = (raw.Result ?? []).filter((r) => r.DriverGuid);
  const isRace = type === 'RACE';
  const ordered = [...results].sort((a, b) => {
    if (isRace) {
      if (!!a.Disqualified !== !!b.Disqualified) return a.Disqualified ? 1 : -1;
      const la = a.NumLaps ?? 0;
      const lb = b.NumLaps ?? 0;
      if (la !== lb) return lb - la;
      return (a.TotalTime ?? 0) - (b.TotalTime ?? 0);
    }
    const ba = validLap(a.BestLap) ?? Number.MAX_SAFE_INTEGER;
    const bb = validLap(b.BestLap) ?? Number.MAX_SAFE_INTEGER;
    return ba - bb;
  });

  const classification = ordered.map((r, i) => ({
    pos: i + 1,
    guid: r.DriverGuid as string,
    name: r.DriverName ?? '',
    carModel: r.CarModel ?? '',
    skin: skinByGuid.get(r.DriverGuid as string) ?? '',
    bestLapMs: validLap(r.BestLap),
    totalTimeMs: r.TotalTime ?? 0,
    numLaps: r.NumLaps ?? 0,
    gridPosition: r.GridPosition ?? 0,
    hasPenalty: Boolean(r.HasPenalty),
    penaltyTimeMs: r.PenaltyTime ?? 0,
    lapPenalty: r.LapPenalty ?? 0,
    disqualified: Boolean(r.Disqualified),
  }));

  // Laps grouped per driver in chronological order to assign lap numbers.
  const lapsByGuid = new Map<string, RawLap[]>();
  for (const l of raw.Laps ?? []) {
    const g = l.DriverGuid;
    if (!g) continue;
    let list = lapsByGuid.get(g);
    if (!list) {
      list = [];
      lapsByGuid.set(g, list);
    }
    list.push(l);
  }
  const laps: Array<{
    guid: string;
    name: string;
    lap: number;
    lapMs: number;
    sectors: number[];
    cuts: number;
    tyre: string;
  }> = [];
  for (const [guid, list] of lapsByGuid) {
    list.sort((a, b) => (a.Timestamp ?? 0) - (b.Timestamp ?? 0));
    list.forEach((l, i) => {
      laps.push({
        guid,
        name: l.DriverName ?? '',
        lap: i + 1,
        lapMs: l.LapTime ?? 0,
        sectors: Array.isArray(l.Sectors) ? l.Sectors : [],
        cuts: l.Cuts ?? 0,
        tyre: l.Tyre ?? '',
      });
    });
  }

  const incidents = (raw.Events ?? [])
    .filter((e) => e.Type?.startsWith('COLLISION'))
    .map((e) => ({
      type: e.Type === 'COLLISION_WITH_CAR' ? 'CAR' : 'ENV',
      guid: e.Driver?.Guid ?? '',
      name: e.Driver?.Name ?? '',
      otherGuid: e.OtherDriver?.Guid ?? '',
      otherName: e.OtherDriver?.Name ?? '',
      impactSpeed: Math.round((e.ImpactSpeed ?? 0) * 10) / 10,
      ts: e.Timestamp ?? 0,
    }));

  // Session fastest lap: prefer clean laps (no cuts), fall back to any valid lap.
  let bestLapMs: number | null = null;
  let bestLapGuid = '';
  let bestLapName = '';
  for (const requireClean of [true, false]) {
    for (const l of laps) {
      if (requireClean && l.cuts > 0) continue;
      const v = validLap(l.lapMs);
      if (v !== null && (bestLapMs === null || v < bestLapMs)) {
        bestLapMs = v;
        bestLapGuid = l.guid;
        bestLapName = l.name;
      }
    }
    if (bestLapMs !== null) break;
  }

  const numLaps = classification.reduce((m, c) => Math.max(m, c.numLaps), 0);
  const winner = classification[0];

  // "Active" drivers = those who completed at least one lap (i.e. actually drove).
  // Only sessions with >= 2 active drivers are shown on the site. The rest (empty
  // / idle server sessions) are still recorded as `listed: false` markers with no
  // detail, so the sync dedupes them and never re-downloads them — but they don't
  // appear in the list and cost almost no storage.
  const activeDrivers = lapsByGuid.size;
  const listed = activeDrivers >= 2;

  // Denormalized free-text search blob (track / event / winner / fastest-lap
  // driver / date / every participant name + guid), lowercased.
  const search = listed
    ? [
        raw.TrackName ?? '',
        raw.EventName ?? '',
        winner?.name ?? '',
        bestLapName,
        raw.Date ? new Date(raw.Date).toISOString().slice(0, 10) : '',
        ...classification.map((c) => `${c.name} ${c.guid}`),
      ]
        .join(' ')
        .toLowerCase()
    : null;

  return {
    session_file: raw.SessionFile || fileName,
    type,
    track_name: raw.TrackName ?? null,
    track_config: raw.TrackConfig ?? null,
    event_name: raw.EventName ?? null,
    session_date: raw.Date ? new Date(raw.Date).toISOString() : null,
    num_drivers: listed ? classification.length : activeDrivers,
    num_laps: listed ? numLaps : 0,
    best_lap_ms: listed ? bestLapMs : null,
    best_lap_guid: listed ? bestLapGuid || null : null,
    best_lap_name: listed ? bestLapName || null : null,
    winner_guid: listed ? winner?.guid ?? null : null,
    winner_name: listed ? winner?.name ?? null : null,
    listed,
    search,
    detail: listed ? { classification, laps, incidents } : { classification: [], laps: [], incidents: [] },
  };
}

function inferTypeFromName(name: string): string {
  const m = FILE_RE.exec(name);
  return m ? m[6].toUpperCase() : 'RACE';
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
  const remoteDir = (Deno.env.get('RESULTS_REMOTE_DIR') ?? 'results').replace(/\/+$/, '');
  const maxPerRun = Number(Deno.env.get('RESULTS_MAX_PER_RUN') ?? '30') || 30;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const syncedAt = new Date().toISOString();

  const fail = async (message: string, status = 502) => {
    await supabase
      .from('results_sync')
      .upsert({ id: 1, synced_at: syncedAt, status: 'error', error: message }, { onConflict: 'id' });
    return json({ error: message }, status);
  };

  // --- 1. List remote results dir -------------------------------------------
  const client = new ftp.Client(20_000);
  client.ftp.verbose = false;
  let remoteFiles: string[] = [];
  try {
    await client.access({ host: ftpHost, user: ftpUser, password: ftpPass, secure: ftpSecure });
    const list = await client.list(remoteDir);
    remoteFiles = list
      .filter((f) => f.type === 1 && FILE_RE.test(f.name))
      .map((f) => f.name);
  } catch (err) {
    client.close();
    return fail(err instanceof Error ? err.message : 'FTP list error');
  }

  // --- 2. Dedupe against already-ingested filenames -------------------------
  const existing = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('sessions')
      .select('session_file')
      .range(from, from + 999);
    if (error) {
      client.close();
      return fail(`sessions read failed: ${error.message}`, 500);
    }
    for (const row of data ?? []) existing.add((row as { session_file: string }).session_file);
    if (!data || data.length < 1000) break;
  }

  // Optional cutoff: only ingest sessions on/after RESULTS_SINCE (e.g. "2026-05-27").
  // The date is read straight from the filename (YYYY_M_D_H_MM_TYPE.json), so older
  // files are skipped *before* any download — no backfill of ancient history, and
  // they're never recorded (cheap to re-skip each run by date).
  const sinceEnv = Deno.env.get('RESULTS_SINCE');
  const sinceMs = sinceEnv ? Date.parse(sinceEnv) : NaN;

  const todo = remoteFiles
    .filter((name) => !existing.has(name))
    .filter((name) => Number.isNaN(sinceMs) || fileSortKey(name) >= sinceMs)
    .sort((a, b) => fileSortKey(b) - fileSortKey(a)) // newest first
    .slice(0, maxPerRun);

  // --- 3. Download + parse + insert -----------------------------------------
  const rows: ReturnType<typeof parseSession>[] = [];
  const errors: string[] = [];
  try {
    for (const name of todo) {
      try {
        const buf = await downloadToBuffer(client, `${remoteDir}/${name}`);
        const raw = JSON.parse(buf.toString('utf8')) as RawSession;
        rows.push(parseSession(raw, name));
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message : 'parse error'}`);
      }
    }
  } finally {
    client.close();
  }

  if (rows.length) {
    const { error } = await supabase.from('sessions').insert(rows);
    if (error) return fail(`insert failed: ${error.message}`, 500);
  }

  const sessionCount = existing.size + rows.length;

  // --- 4. Status row --------------------------------------------------------
  await supabase.from('results_sync').upsert(
    {
      id: 1,
      synced_at: syncedAt,
      status: errors.length && !rows.length ? 'error' : 'success',
      error: errors.length ? errors.slice(0, 5).join('; ') : null,
      ingested_count: rows.length,
      session_count: sessionCount,
    },
    { onConflict: 'id' }
  );

  return json({
    ok: true,
    syncedAt,
    remoteFiles: remoteFiles.length,
    ingested: rows.length,
    remaining: remoteFiles.length - existing.size - rows.length,
    sessionCount,
    errors,
  });
});
