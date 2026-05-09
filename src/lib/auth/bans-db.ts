import { useState, useEffect, useCallback } from 'react';

import { fetchJson } from 'src/lib/fetch-json';
import { getSupabaseClient } from 'src/lib/supabase-client';
import { DATA_FILES } from 'src/centralized/data-files';
import type { RankDriver } from 'src/lib/ac-elite-data';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export type BanEntry = {
  /** Steam GUID exactly as it appears in `blocklist.json`. */
  guid: string;
  /** Free-form note (reason). May be empty. */
  context: string;
};

export type BanAuditAction = 'ban' | 'unban';

export type BanAuditRow = {
  id: number;
  guid: string;
  context: string;
  action: BanAuditAction;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  createdAt: string;
};

// ----------------------------------------------------------------------
// Edge function calls
// ----------------------------------------------------------------------

const FUNCTION_NAME = 'manage-blocklist';

/** Bubble up the function's structured error message, fall back to status. */
async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body && typeof body.error === 'string' && body.error.length > 0) return body.error;
  } catch {
    // ignore — body wasn't JSON
  }
  return `${fallback} (HTTP ${res.status})`;
}

type RawEntry = { GUID?: unknown; Context?: unknown };

function parseEntries(raw: unknown): BanEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: BanEntry[] = [];
  for (const item of raw as RawEntry[]) {
    if (!item || typeof item !== 'object') continue;
    const guid = typeof item.GUID === 'string' ? item.GUID : '';
    if (!guid) continue;
    out.push({ guid, context: typeof item.Context === 'string' ? item.Context : '' });
  }
  return out;
}

async function invokeFunction(method: 'GET' | 'POST' | 'DELETE', body?: unknown): Promise<BanEntry[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');

  // The functions.invoke() helper doesn't support DELETE bodies cleanly, so we
  // call the function URL directly and attach the JWT ourselves. Same baseline
  // auth check the SDK does.
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Not signed in.');

  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  if (!url) throw new Error('Supabase is not configured.');
  const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/${FUNCTION_NAME}`;

  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    throw new Error(await readError(res, 'Blocklist request failed'));
  }
  const json = (await res.json()) as { entries?: unknown };
  return parseEntries(json.entries);
}

export function fetchBans(): Promise<BanEntry[]> {
  return invokeFunction('GET');
}

export function addBan(entry: BanEntry): Promise<BanEntry[]> {
  return invokeFunction('POST', { guid: entry.guid, context: entry.context });
}

export function removeBan(guid: string, context = ''): Promise<BanEntry[]> {
  // DELETE with body — many runtimes are happy with this, but we also keep the
  // GUID in the query string as a belt-and-braces fallback for proxies that
  // strip DELETE bodies.
  const client = getSupabaseClient();
  if (!client) return Promise.reject(new Error('Supabase is not configured.'));

  return (async () => {
    const { data: sessionData } = await client.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error('Not signed in.');
    const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
    if (!url) throw new Error('Supabase is not configured.');
    const endpoint = `${url.replace(/\/+$/, '')}/functions/v1/${FUNCTION_NAME}?guid=${encodeURIComponent(guid)}`;
    const trimmedContext = context.trim();
    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(trimmedContext ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(trimmedContext ? { body: JSON.stringify({ context: trimmedContext }) } : {}),
    });
    if (!res.ok) throw new Error(await readError(res, 'Unban request failed'));
    const json = (await res.json()) as { entries?: unknown };
    return parseEntries(json.entries);
  })();
}

// ----------------------------------------------------------------------
// Audit-log reads (direct from Supabase, governed by RLS)
// ----------------------------------------------------------------------

type RawAuditRow = {
  id: number;
  guid: string;
  context: string | null;
  action: BanAuditAction;
  actor_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  created_at: string;
};

function parseAuditRow(raw: RawAuditRow): BanAuditRow {
  return {
    id: raw.id,
    guid: raw.guid,
    context: raw.context ?? '',
    action: raw.action,
    actorId: raw.actor_id,
    actorRole: raw.actor_role,
    actorName: raw.actor_name,
    createdAt: raw.created_at,
  };
}

export async function fetchBanAudit(limit = 50): Promise<BanAuditRow[]> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  const { data, error } = await client
    .from('bans_audit')
    .select('id, guid, context, action, actor_id, actor_role, actor_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as RawAuditRow[] | null)?.map(parseAuditRow) ?? [];
}

/**
 * Wipes the entire ban audit log. RLS gates this to admin / owner roles, so
 * a moderator session calling this will get a permission error from Postgres.
 */
export async function clearBanAudit(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured.');
  // PostgREST requires a filter on bulk delete; `gte(id, 0)` matches every row
  // without leaning on a magic id value.
  const { error } = await client.from('bans_audit').delete().gte('id', 0);
  if (error) throw error;
}

// ----------------------------------------------------------------------
// Driver directory — `guid → name` map sourced from rank.json so we can show
// human-readable names next to bans (the AC blocklist file only has GUIDs).
// ----------------------------------------------------------------------

export type DriverDirectoryEntry = { guid: string; name: string };

export type DriverDirectory = {
  loading: boolean;
  /** O(1) name lookup. */
  byGuid: Map<string, string>;
  /** Sorted-by-name list, useful for the Autocomplete in the ban dialog. */
  entries: DriverDirectoryEntry[];
};

const EMPTY_DIRECTORY: DriverDirectory = {
  loading: true,
  byGuid: new Map(),
  entries: [],
};

export function useDriverDirectory(): DriverDirectory {
  const [state, setState] = useState<DriverDirectory>(EMPTY_DIRECTORY);

  useEffect(() => {
    let cancelled = false;
    void fetchJson<RankDriver[]>(DATA_FILES.rank)
      .then((rows) => {
        if (cancelled) return;
        const byGuid = new Map<string, string>();
        const entries: DriverDirectoryEntry[] = [];
        for (const row of rows ?? []) {
          if (!row || typeof row.guid !== 'string') continue;
          const name = typeof row.name === 'string' ? row.name.trim() : '';
          if (!name) continue;
          if (byGuid.has(row.guid)) continue;
          byGuid.set(row.guid, name);
          entries.push({ guid: row.guid, name });
        }
        entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setState({ loading: false, byGuid, entries });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, byGuid: new Map(), entries: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// ----------------------------------------------------------------------
// React hook
// ----------------------------------------------------------------------

type UseBansResult = {
  bans: BanEntry[];
  audit: BanAuditRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setBans: (next: BanEntry[]) => void;
};

export function useBans(): UseBansResult {
  const [bans, setBansState] = useState<BanEntry[]>([]);
  const [audit, setAudit] = useState<BanAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, history] = await Promise.all([fetchBans(), fetchBanAudit().catch(() => [])]);
      setBansState(list);
      setAudit(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { bans, audit, loading, error, reload, setBans: setBansState };
}
