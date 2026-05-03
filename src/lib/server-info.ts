/**
 * Shape of Assetto Corsa server HTTP /INFO (subset + passthrough fields we may show in UI).
 * @see http://157.90.3.32:18283/INFO
 */

export type AcServerInfo = {
  name?: string;
  clients?: number;
  maxclients?: number;
  track?: string;
  cars?: string[];
  cport?: number;
  port?: number;
  tport?: number;
  session?: number;
  sessiontypes?: number[];
  durations?: number[];
  timeleft?: number;
  timeofday?: number;
  pickup?: boolean;
  timed?: boolean;
  pass?: boolean;
  inverted?: number;
  ip?: string;
  country?: string[];
  /** Extra keys from server (ignored by UI unless we add them). */
  [key: string]: unknown;
};

/** Verwijdert trailing INFO-teken (U+2139) + poort achteraan in CM-lobbynaam. */
export function sanitizeServerLobbyDisplayName(raw: string): string {
  return raw
    .trim()
    .replace(/\s*\u2139\s*\d{2,5}\s*$/u, '')
    .trim();
}

/** Session type id 3 = race; when `timed` is false, `/INFO` `durations` entry is laps, not minutes. */
export const AC_SESSION_TYPE_RACE = 3;

/** AC `session` / `sessiontypes` enum (common values). */
const SESSION_LABEL: Record<number, string> = {
  0: 'Booking',
  1: 'Practice',
  2: 'Qualifying',
  3: 'Race',
  4: 'Hotlap',
  5: 'Time attack',
  6: 'Drift',
  7: 'Drag',
};

export function acSessionTypeLabel(id: number | undefined): string {
  if (id == null || !Number.isFinite(id)) return '—';
  return SESSION_LABEL[id] ?? `Type ${id}`;
}

/** Current phase from `session` index into `sessiontypes`. */
export function acCurrentSessionLabel(info: AcServerInfo | null | undefined): string {
  if (!info?.sessiontypes?.length) return '—';
  const idx = typeof info.session === 'number' ? info.session : 0;
  const typeId = info.sessiontypes[idx];
  return acSessionTypeLabel(typeId);
}

export function formatTimeLeftSeconds(sec: number | undefined | null): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '—';
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Schedule line from `/INFO` `sessiontypes` + `durations`.
 * Time sessions: `Q 10 min`. Race with `timed === false`: lap count, e.g. `R 6 laps`.
 */
export function formatSessionDurationsLine(
  sessiontypes: number[] | undefined,
  durations: number[] | undefined,
  timed?: boolean
): string | null {
  if (!sessiontypes?.length || !durations?.length) return null;
  const n = Math.min(sessiontypes.length, durations.length);
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const typeId = sessiontypes[i];
    const label = acSessionTypeLabel(typeId).charAt(0);
    const raw: unknown = durations[i];
    const value =
      typeof raw === 'number' && Number.isFinite(raw)
        ? raw
        : typeof raw === 'string' && raw.trim() !== ''
          ? Number(raw)
          : NaN;
    if (Number.isFinite(value)) {
      const raceIsLaps = typeId === AC_SESSION_TYPE_RACE && timed === false;
      if (raceIsLaps) {
        const lapWord = value === 1 ? 'lap' : 'laps';
        parts.push(`${label} ${value} ${lapWord}`);
      } else {
        parts.push(`${label} ${value} min`);
      }
    }
  }
  return parts.length ? parts.join(' · ') : null;
}

function toFiniteInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return undefined;
}

function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toNumberArray(v: unknown): number[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const out: number[] = [];
  for (const x of v) {
    const n = toFiniteInt(x);
    if (n !== undefined) out.push(n);
  }
  return out.length ? out : undefined;
}

function toStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const out = v.filter((c): c is string => typeof c === 'string' && Boolean(c.trim()));
  return out.length ? out : undefined;
}

/**
 * Live + static /INFO samenvoegen: static vult ontbrekende keys; live overschrijft.
 * Geen vroege return meer op “live heeft al HUD” — dan miste je bv. `clients` uit static
 * zodra live alleen `sessiontypes`/`cars` had, of overschreef poll de merge met ruwe live.
 */
export function mergeInfoWhenPreferringLiveSnapshot(
  liveInfo: AcServerInfo | null | undefined,
  staticInfo: AcServerInfo | null | undefined
): AcServerInfo | null | undefined {
  const l = liveInfo ?? undefined;
  const s = staticInfo ?? undefined;
  if (l && s) return { ...s, ...l };
  return l ?? s;
}

/** PostgREST/jsonb en oude snapshots: soms string-getallen of dubbel-gecodeerde JSON. */
export function parseAcServerInfo(raw: unknown): AcServerInfo | undefined {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const src = parsed as Record<string, unknown>;
  const clients = toFiniteInt(src.clients);
  const maxclients = toFiniteInt(src.maxclients);
  const session = toFiniteInt(src.session);
  const timeleft = toFiniteNumber(src.timeleft);
  const timeofday = toFiniteInt(src.timeofday);
  const cport = toFiniteInt(src.cport);
  const port = toFiniteInt(src.port);
  const tport = toFiniteInt(src.tport);
  const inverted = toFiniteInt(src.inverted);

  const out = { ...(src as AcServerInfo) };
  if (clients !== undefined) out.clients = clients;
  if (maxclients !== undefined) out.maxclients = maxclients;
  if (session !== undefined) out.session = session;
  if (timeleft !== undefined) out.timeleft = timeleft;
  if (timeofday !== undefined) out.timeofday = timeofday;
  if (cport !== undefined) out.cport = cport;
  if (port !== undefined) out.port = port;
  if (tport !== undefined) out.tport = tport;
  if (inverted !== undefined) out.inverted = inverted;

  if (Array.isArray(src.sessiontypes)) {
    const norm = toNumberArray(src.sessiontypes);
    if (norm?.length) out.sessiontypes = norm;
    else delete out.sessiontypes;
  }
  if (Array.isArray(src.durations)) {
    const norm = toNumberArray(src.durations);
    if (norm?.length) out.durations = norm;
    else delete out.durations;
  }
  if (Array.isArray(src.cars)) {
    const norm = toStringArray(src.cars);
    if (norm?.length) out.cars = norm;
    else delete out.cars;
  }

  return out;
}
