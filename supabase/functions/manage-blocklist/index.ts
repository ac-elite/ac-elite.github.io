/**
 * AC Elite — manage-blocklist
 * ============================================================================
 * Reads/writes the AC server's `blocklist.json` (lives in the FTP root, NOT
 * inside the `kissmyrank` folder) and mirrors every change to a Supabase
 * audit table (`public.bans_audit`).
 *
 * Endpoints (single function, method-based):
 *   GET    → list current bans
 *   POST   { guid, context } → add ban (idempotent on existing GUID)
 *   DELETE ?guid=…            → remove ban (no-op if not present)
 *
 * Auth: `verify_jwt = true` in supabase/config.toml means Supabase has already
 * validated the JWT before this function runs. We additionally look up the
 * caller's role in `public.profiles` and require ≥ moderator.
 *
 * FTP write strategy: download → mutate JSON in memory → upload to a temp
 * filename → rename over the original. Avoids leaving the AC server with a
 * half-written file if the upload is interrupted.
 *
 * Required env (Supabase project secrets):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FTP_HOST                 (same host the sync workflow already uses)
 *   FTP_USER
 *   FTP_PASS
 *
 * Optional env:
 *   BLOCKLIST_REMOTE_PATH    default: "blocklist.json"
 *   FTP_SECURE               default: "false" — set to "true" to use FTPS.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import ftp, { type Client as FtpClient } from 'npm:basic-ftp@5.0.5';
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

type AppRole = 'owner' | 'admin' | 'moderator';

type BlocklistEntry = {
  GUID: string;
  Context: string;
};

const STAFF_ROLES: ReadonlySet<AppRole> = new Set<AppRole>(['moderator', 'admin', 'owner']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status: number, code?: string): Response {
  return jsonResponse({ error: message, ...(code ? { code } : {}) }, status);
}

/** Steam GUIDs are 17-digit numbers. We accept any non-empty digit string to
 *  stay flexible if KMR ever uses other identifiers. */
function normalizeGuid(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 64) return null;
  if (!/^[A-Za-z0-9_\-]+$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeContext(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  // Cap context length so we can't accidentally bloat the file.
  return raw.trim().slice(0, 500);
}

function parseBlocklist(raw: string): BlocklistEntry[] {
  if (!raw || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`blocklist.json is not valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error('blocklist.json must be a JSON array');
  }
  const out: BlocklistEntry[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const guid = normalizeGuid(rec.GUID);
    if (!guid) continue;
    out.push({ GUID: guid, Context: typeof rec.Context === 'string' ? rec.Context : '' });
  }
  return out;
}

function serializeBlocklist(entries: BlocklistEntry[]): string {
  // Pretty-print with tab indent — matches the example the user shared.
  return JSON.stringify(entries, null, '\t') + '\n';
}

// ---------------------------------------------------------------------------
// Auth: validate the caller's JWT and look up their role.
// ---------------------------------------------------------------------------

type Caller = {
  userId: string;
  role: AppRole;
  displayName: string | null;
};

async function authenticateCaller(req: Request): Promise<{ caller: Caller } | { error: Response }> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return { error: errorResponse('Missing bearer token', 401, 'no-token') };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return { error: errorResponse('Supabase env missing (SUPABASE_URL/ANON_KEY)', 500, 'env') };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return { error: errorResponse('Invalid session', 401, 'invalid-session') };
  }

  const { data: profile, error: profileErr } = await userClient
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileErr) {
    return { error: errorResponse(`Profile lookup failed: ${profileErr.message}`, 500, 'profile') };
  }
  if (!profile || !STAFF_ROLES.has(profile.role as AppRole)) {
    return { error: errorResponse('Forbidden — staff role required', 403, 'forbidden') };
  }

  return {
    caller: {
      userId: userData.user.id,
      role: profile.role as AppRole,
      displayName: (profile.display_name as string | null) ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// FTP helpers
// ---------------------------------------------------------------------------

type FtpEnv = {
  host: string;
  user: string;
  password: string;
  secure: boolean;
  remotePath: string;
};

function readFtpEnv(): FtpEnv | { error: Response } {
  const host = Deno.env.get('FTP_HOST');
  const user = Deno.env.get('FTP_USER');
  const password = Deno.env.get('FTP_PASS');
  if (!host || !user || !password) {
    return { error: errorResponse('FTP env missing (FTP_HOST/USER/PASS)', 500, 'ftp-env') };
  }
  const remotePath = Deno.env.get('BLOCKLIST_REMOTE_PATH') ?? 'blocklist.json';
  const secureRaw = (Deno.env.get('FTP_SECURE') ?? 'false').toLowerCase();
  const secure = secureRaw === 'true' || secureRaw === '1' || secureRaw === 'yes';
  return { host, user, password, secure, remotePath };
}

async function withFtpClient<T>(env: FtpEnv, fn: (client: FtpClient) => Promise<T>): Promise<T> {
  const client = new ftp.Client(15_000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: env.host,
      user: env.user,
      password: env.password,
      secure: env.secure,
    });
    return await fn(client);
  } finally {
    client.close();
  }
}

async function downloadBlocklist(client: FtpClient, remotePath: string): Promise<BlocklistEntry[]> {
  // basic-ftp's downloadTo accepts a Writable. Collect into a Buffer in memory.
  const chunks: Buffer[] = [];
  const sink = new (await import('node:stream')).Writable({
    write(chunk, _enc, cb) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      cb();
    },
  });

  try {
    await client.downloadTo(sink, remotePath);
  } catch (err) {
    // FTP 550 = file not found — treat as empty list (first run case).
    const message = (err as Error).message ?? '';
    if (/(^|\s)5(50|0)\b/.test(message) || /no such file/i.test(message)) {
      return [];
    }
    throw err;
  }

  const text = Buffer.concat(chunks).toString('utf8');
  return parseBlocklist(text);
}

async function uploadBlocklistAtomic(
  client: FtpClient,
  remotePath: string,
  entries: BlocklistEntry[]
): Promise<void> {
  const body = serializeBlocklist(entries);
  const tmpPath = `${remotePath}.tmp`;
  // Stream the new content to a temp filename, then rename atomically. If the
  // upload is interrupted, the original file is untouched.
  const stream = Readable.from([Buffer.from(body, 'utf8')]);
  await client.uploadFrom(stream, tmpPath);

  // Remove any stale rename target before renaming on top of it.
  try {
    await client.remove(remotePath);
  } catch {
    // Original may not exist yet (first run) — fine.
  }
  await client.rename(tmpPath, remotePath);
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

function getServiceClient(): SupabaseClient | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function logAudit(
  caller: Caller,
  action: 'ban' | 'unban',
  guid: string,
  context: string
): Promise<void> {
  const service = getServiceClient();
  if (!service) return;
  const { error } = await service.from('bans_audit').insert({
    guid,
    context,
    action,
    actor_id: caller.userId,
    actor_role: caller.role,
    actor_name: caller.displayName,
  });
  if (error) {
    // Don't fail the request — the FTP write already succeeded. Log to stderr
    // so it shows up in Supabase function logs.
    console.error('bans_audit insert failed:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleList(env: FtpEnv): Promise<Response> {
  const entries = await withFtpClient(env, (client) => downloadBlocklist(client, env.remotePath));
  return jsonResponse({ ok: true, entries });
}

async function handleAdd(req: Request, env: FtpEnv, caller: Caller): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body', 400, 'bad-body');
  }
  const rec = (body ?? {}) as Record<string, unknown>;
  const guid = normalizeGuid(rec.guid ?? rec.GUID);
  if (!guid) {
    return errorResponse('Field `guid` is required (alphanumeric, max 64 chars)', 400, 'bad-guid');
  }
  const context = normalizeContext(rec.context ?? rec.Context);

  const entries = await withFtpClient(env, async (client) => {
    const current = await downloadBlocklist(client, env.remotePath);
    const existingIdx = current.findIndex((e) => e.GUID === guid);
    if (existingIdx === -1) {
      current.push({ GUID: guid, Context: context });
    } else {
      // Already banned — update the context (treat as an edit).
      current[existingIdx] = { GUID: guid, Context: context };
    }
    await uploadBlocklistAtomic(client, env.remotePath, current);
    return current;
  });

  await logAudit(caller, 'ban', guid, context);
  return jsonResponse({ ok: true, entries });
}

async function handleRemove(req: Request, env: FtpEnv, caller: Caller): Promise<Response> {
  const url = new URL(req.url);
  let guid = normalizeGuid(url.searchParams.get('guid'));
  let context = '';
  if (req.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      if (!guid) guid = normalizeGuid(body.guid ?? body.GUID);
      context = normalizeContext(body.context ?? body.Context);
    } catch {
      // ignore — we'll fall through to the missing-guid error if needed
    }
  }
  if (!guid) {
    return errorResponse('Field `guid` is required', 400, 'bad-guid');
  }

  const result = await withFtpClient(env, async (client) => {
    const current = await downloadBlocklist(client, env.remotePath);
    const next = current.filter((e) => e.GUID !== guid);
    const removed = next.length !== current.length;
    if (removed) {
      await uploadBlocklistAtomic(client, env.remotePath, next);
    }
    return { entries: next, removed };
  });

  if (result.removed) {
    await logAudit(caller, 'unban', guid, context);
  }
  return jsonResponse({ ok: true, removed: result.removed, entries: result.entries });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    return errorResponse('Method Not Allowed', 405, 'method');
  }

  const auth = await authenticateCaller(req);
  if ('error' in auth) return auth.error;

  const env = readFtpEnv();
  if ('error' in env) return env.error;

  try {
    if (req.method === 'GET') return await handleList(env);
    if (req.method === 'POST') return await handleAdd(req, env, auth.caller);
    if (req.method === 'DELETE') return await handleRemove(req, env, auth.caller);
    return errorResponse('Method Not Allowed', 405, 'method');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('manage-blocklist error:', message);
    return errorResponse(`FTP operation failed: ${message}`, 502, 'ftp');
  }
});
