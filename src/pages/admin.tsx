import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { DATA_FILES as DATA_FILE_PATHS } from 'src/centralized/data-files';
import trackCatalog from 'src/centralized/track-catalog.json';
import { fetchJson } from 'src/lib/fetch-json';
import { getSyncHealth, type SyncHealthProfile } from 'src/lib/sync-utils';
import { SERVER_ENDPOINTS } from 'src/centralized/server-endpoints';
import { SITE_PREVIEW } from 'src/site-manual-config';
import { SITE_REPO_URL } from 'src/centralized/site-urls';
import { getTrackDisplayName } from 'src/lib/ac-elite-data';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_SX, GLASS_INNER_PANEL_SX, GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import {
  DATA_PAGE_SHELL_SX,
  TABLE_HEAD_MUTED_COLOR,
  ADMIN_JOIN_SERVER_OUTLINED_SX,
  ADMIN_EXTERNAL_LINK_OUTLINED_SX,
} from 'src/lib/page-shell';
import {
  acSessionTypeLabel,
  AC_SESSION_TYPE_RACE,
  acCurrentSessionLabel,
  formatTimeLeftSeconds,
  formatSessionDurationsLine,
  sanitizeServerLobbyDisplayName,
  shouldAppendReversedGridRaceHint,
} from 'src/lib/server-info';
import {
  pickNewerCurrentTrack,
  toCurrentTrackPayload,
  type CurrentTrackPayload,
  LIVE_SERVER_STATUS_POLL_MS,
  shouldPollLiveServerStatus,
  canAttemptLiveServerStatusFetch,
  fetchLiveServerStatusFromSupabase,
} from 'src/lib/server-status';

import { PreviewLock } from 'src/components/preview-lock/preview-lock';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { SiteVisitsShowcase } from 'src/components/site-visits-showcase/site-visits-showcase';
import {
  fetchSiteVisitCount,
  type SitePageVisitRow,
  isSiteVisitsConfigured,
  fetchSitePageVisitCounts,
} from 'src/lib/site-visits';

// ---------------------------------------------------------------------------
// Types for fetched data
// ---------------------------------------------------------------------------

type MetadataData = { lastSync?: string; status?: string; error?: string; rank24hSnapshotAt?: string };
type CurrentTrackData = CurrentTrackPayload;
type TrackCatalogEntry = {
  id: string;
  name: string;
  image?: string;
  imageOffsetY?: number;
  aliases: string[];
};

type AdminState = {
  metadata: MetadataData | null;
  currentTrack: CurrentTrackData | null;
};

// ---------------------------------------------------------------------------
// Schedule data
// ---------------------------------------------------------------------------

type ScheduleKind = 'recurring' | 'chained' | 'deploy';

type ScheduleEntry = {
  /** Short label for the left “agenda” column */
  agendaWhen: string;
  agendaSub: string;
  kind: ScheduleKind;
  workflow: string;
  cron: string;
  what: string;
  chain?: string;
};

const SCHEDULE: readonly ScheduleEntry[] = [
  {
    agendaWhen: ':00',
    agendaSub: 'Every hour · UTC',
    kind: 'recurring',
    workflow: 'Ranking sync (KMR)',
    cron: '0 * * * *',
    what: 'Downloads the latest driver list and leaderboard from KMR so the website matches the league.',
    chain: 'Then: daily 24h snapshot → publish website',
  },
  {
    agendaWhen: ':05',
    agendaSub: 'Every hour · UTC',
    kind: 'recurring',
    workflow: 'Hourly server backup file',
    cron: '5 * * * *',
    what:
      'Once an hour, checks if the game lobby or track changed. If so, saves a backup copy the website can fall back on. Slower than the live check below.',
  },
  {
    agendaWhen: '≈1 min',
    agendaSub: 'External scheduler · hosted service',
    kind: 'recurring',
    workflow: 'Live server check',
    cron: 'Your external cron schedule (e.g. every minute)',
    what:
      'Checks the AC Elite server often so the site can show who is online, which track is running, and session info without waiting for the hourly backup.',
  },
  {
    agendaWhen: 'After sync',
    agendaSub: 'Not before 06:00 Amsterdam · once per day',
    kind: 'chained',
    workflow: 'Daily 24h ranking snapshot',
    cron: 'workflow_run (after Sync KMR)',
    what:
      'Saves a “yesterday style” copy of the rankings used for 24-hour stats. Waits until after 06:00 Amsterdam time and runs at most once per day.',
    chain: 'Then: publish website',
  },
  {
    agendaWhen: 'On change',
    agendaSub: 'When the website code updates',
    kind: 'deploy',
    workflow: 'Publish website',
    cron: 'workflow_run + push main',
    what: 'Rebuilds the public site so visitors see the latest pages and data files.',
  },
];

/** Simple “try this in the address bar” helpers (optional). */
const DEBUG_QUICK_TRIES = [
  {
    key: 'offline',
    title: 'Preview: site thinks the AC Elite server is offline',
    intro:
      'Good for checking the homepage “server offline” layout. The real server is not touched — this only changes what your browser shows.',
    paste: '?serverOfflineDebug=on',
    stepsBeforeSnippet: [
      'Click the address bar at the top of the browser.',
      'Click at the very end of the URL so the cursor sits after the last character.',
    ],
    stepsAfterSnippet: [
      'Copy the entire line in the grey box above, paste it at the end of the URL, then press Enter.',
      'Reload the homepage (or open it) to see the offline layout.',
    ],
    turnOff: 'Delete the pasted part from the address bar, or open the site in a fresh tab without it.',
  },
  {
    key: 'track',
    title: 'Force a specific current track in the UI',
    intro:
      'Useful when you want to test track-specific cards/leaderboards without waiting for the real server to rotate tracks.',
    paste: '?currentTrackMock=spa',
    stepsBeforeSnippet: [
      'Open the page you want to test (home, leaderboard, admin, etc.).',
      'Click the address bar and place the cursor at the very end of the URL.',
    ],
    stepsAfterSnippet: [
      'Copy the entire line in the grey box above, paste it at the end of the URL, then press Enter.',
      'Use any known track id (example: spa, monza, ks_laguna_seca).',
    ],
    turnOff: 'Remove `currentTrackMock=...` from the URL and reload.',
  },
  {
    key: 'console',
    title: 'Extra detail in the browser console (optional)',
    intro:
      'For someone who already uses “Developer tools → Console”. Adds more lines about server loading. Safe to skip if that sounds unfamiliar.',
    paste: '?serverStatusDebug=1',
    stepsBeforeSnippet: [
      'Click the address bar and put the cursor at the very end of the URL.',
    ],
    stepsAfterSnippet: [
      'Copy the entire line in the grey box above, paste it at the end of the URL, then press Enter.',
      'Open Developer tools (F12 on many browsers) → Console tab.',
      'Look for lines starting with [server-status].',
    ],
    turnOff: 'Remove the extra text from the address bar when you are done.',
  },
] as const;

/** Developer-only reference (query params only). */
const DEBUG_TECH_REFERENCE = [
  {
    title: 'Pretend server offline',
    env: '—',
    query: 'serverOfflineDebug',
    storageKey: '—',
    values: '1, true, yes, on',
  },
  {
    title: 'Force current track in UI',
    env: '—',
    query: 'currentTrackMock',
    storageKey: '—',
    values: 'track id, e.g. spa / monza / ks_laguna_seca',
  },
  {
    title: 'Verbose server-status logging',
    env: '—',
    query: 'serverStatusDebug',
    storageKey: '—',
    values: '1, true, yes',
  },
] as const;

// ---------------------------------------------------------------------------
// Data files we track
// ---------------------------------------------------------------------------

type DataFileEntry = {
  file: string;
  updatedBy: string;
  getTimestamp: (s: AdminState) => string | undefined;
  getNote?: (s: AdminState) => string;
  /** Freshness thresholds: daily snapshot is not “delayed” within ~30h. */
  syncHealthProfile?: SyncHealthProfile;
};

const DATA_FILES: readonly DataFileEntry[] = [
  {
    file: 'metadata.json',
    updatedBy: 'Ranking sync (KMR)',
    getTimestamp: (s) => s.metadata?.lastSync,
    getNote: (s) => (s.metadata?.status === 'success' ? 'Last run reported success' : s.metadata?.status ?? ''),
  },
  {
    file: 'current-track.json',
    updatedBy: 'AC Elite server (live check + hourly backup)',
    getTimestamp: (s) => s.currentTrack?.fetchedAt,
    getNote: (s) => {
      const state =
        s.currentTrack?.online
          ? `Online · ${s.currentTrack.track ? getTrackDisplayName(s.currentTrack.track) : '—'}`
          : 'Offline';
      return `${state} · Time shown is the newest of: frequent live checks, or the hourly backup when the lobby/track changed`;
    },
  },
  {
    file: 'rank.json',
    updatedBy: 'Ranking sync (KMR)',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
  {
    file: 'rank-24h.json',
    updatedBy: 'Daily 24h snapshot (once per day)',
    getTimestamp: (s) => s.metadata?.rank24hSnapshotAt,
    syncHealthProfile: 'dailySnapshot',
    getNote: (s) =>
      s.metadata?.rank24hSnapshotAt
        ? 'Runs at most once per day; timestamp is kept when the main rank file refreshes'
        : 'Will fill in automatically after the next daily snapshot job',
  },
  {
    file: 'leaderboard.json',
    updatedBy: 'Ranking sync (KMR)',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
];

function formatAbsolute(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Keys we render explicitly; anything else on `info` becomes an extra row. */
const ADMIN_SERVER_INFO_HANDLED = new Set([
  'name',
  'clients',
  'maxclients',
  'track',
  'cars',
  'cport',
  'port',
  'tport',
  'session',
  'sessiontypes',
  'durations',
  'timeleft',
  'timeofday',
  'pickup',
  'timed',
  'pass',
  'inverted',
  'ip',
  'country',
  'json',
  'timestamp',
  'l',
  'extra',
  'pit',
]);

function fmtAdminScalar(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') return v.trim() === '' ? '(empty)' : v;
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : '[]';
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function formatAdminTimeleft(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  if (sec < 0) return `${sec}s`;
  return formatTimeLeftSeconds(sec);
}

function buildAdminServerInfoRows(ct: CurrentTrackPayload | null): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (!ct) {
    rows.push({ label: 'Payload', value: 'No current track loaded yet.' });
    return rows;
  }

  rows.push({ label: 'Snapshot (fetched_at)', value: ct.fetchedAt ? `${formatAbsolute(ct.fetchedAt)} · ${formatRelative(ct.fetchedAt)}` : '—' });
  rows.push({ label: 'Online (row)', value: ct.online ? 'Yes' : 'No' });
  rows.push({ label: 'Track ID (row)', value: ct.track?.trim() ? ct.track : '—' });

  const info = ct.info;
  if (!info || typeof info !== 'object') {
    rows.push({
      label: '/INFO',
      value: 'No lobby detail on this snapshot yet — try again shortly or open the live server link.',
    });
    return rows;
  }

  if (typeof info.name === 'string' && info.name.trim()) {
    rows.push({ label: 'Lobby name (display)', value: sanitizeServerLobbyDisplayName(info.name) });
    rows.push({ label: 'Lobby name (raw)', value: info.name });
  }

  const clients = typeof info.clients === 'number' && Number.isFinite(info.clients) ? info.clients : null;
  const maxc = typeof info.maxclients === 'number' && Number.isFinite(info.maxclients) ? info.maxclients : null;
  rows.push({
    label: 'Clients / max',
    value: clients != null && maxc != null ? `${clients} / ${maxc}` : `${fmtAdminScalar(info.clients)} / ${fmtAdminScalar(info.maxclients)}`,
  });

  if (typeof info.track === 'string' && info.track.trim() && info.track.trim() !== ct.track?.trim()) {
    rows.push({ label: 'Track ID (/INFO)', value: info.track });
  }

  rows.push({ label: 'Cars', value: Array.isArray(info.cars) && info.cars.length ? info.cars.join(', ') : '—' });

  rows.push({
    label: 'Ports',
    value: `cport ${fmtAdminScalar(info.cport)} · game ${fmtAdminScalar(info.port)} · query ${fmtAdminScalar(info.tport)}`,
  });

  rows.push({ label: 'IP (server)', value: typeof info.ip === 'string' && info.ip.trim() ? info.ip : '(empty)' });

  if (Array.isArray(info.sessiontypes) && info.sessiontypes.length > 0) {
    const seq = info.sessiontypes.map((id) => `${id} → ${acSessionTypeLabel(id)}`).join('; ');
    rows.push({ label: 'Session types', value: seq });
  }

  rows.push({ label: 'Session index', value: fmtAdminScalar(info.session) });
  rows.push({ label: 'Current phase', value: acCurrentSessionLabel(info) });
  rows.push({ label: 'Time left', value: formatAdminTimeleft(info.timeleft) });
  const scheduleHints = {
    inverted: typeof info.inverted === 'number' ? info.inverted : undefined,
    lobbyName: typeof info.name === 'string' ? info.name : undefined,
  };
  rows.push({
    label: 'Schedule (short)',
    value: formatSessionDurationsLine(info.sessiontypes, info.durations, info.timed, scheduleHints) ?? '—',
  });

  if (Array.isArray(info.sessiontypes) && Array.isArray(info.durations)) {
    const n = Math.min(info.sessiontypes.length, info.durations.length);
    const parts: string[] = [];
    const doubleRevRace = shouldAppendReversedGridRaceHint(info.sessiontypes, info.timed, scheduleHints);
    for (let i = 0; i < n; i += 1) {
      const typeId = info.sessiontypes[i];
      const isRaceLaps = typeId === AC_SESSION_TYPE_RACE && info.timed === false;
      if (isRaceLaps && doubleRevRace) {
        const rawLaps = info.durations[i];
        const per = typeof rawLaps === 'number' ? rawLaps : Number(rawLaps);
        const lapWord = Number.isFinite(per) && per === 1 ? 'lap' : 'laps';
        parts.push(`Race: 2×${fmtAdminScalar(rawLaps)} ${lapWord} (rev grid)`);
      } else {
        const unit = typeId === AC_SESSION_TYPE_RACE && info.timed === false ? 'laps' : 'min';
        parts.push(`${acSessionTypeLabel(typeId)}: ${fmtAdminScalar(info.durations[i])} ${unit}`);
      }
    }
    if (parts.length) rows.push({ label: 'Durations (per type)', value: parts.join(' · ') });
  }

  rows.push({ label: 'Time of day (slot)', value: fmtAdminScalar(info.timeofday) });
  rows.push({ label: 'Inverted grid', value: fmtAdminScalar(info.inverted) });
  rows.push({ label: 'Country (geo)', value: Array.isArray(info.country) && info.country.length ? info.country.join(', ') : '—' });

  rows.push({ label: 'Pickup', value: fmtAdminScalar(info.pickup) });
  rows.push({ label: 'Timed', value: fmtAdminScalar(info.timed) });
  rows.push({ label: 'Passworded', value: fmtAdminScalar(info.pass) });
  rows.push({ label: 'l', value: fmtAdminScalar(info.l) });
  rows.push({ label: 'extra', value: fmtAdminScalar(info.extra) });
  rows.push({ label: 'pit', value: fmtAdminScalar(info.pit) });
  rows.push({ label: 'timestamp', value: fmtAdminScalar(info.timestamp) });
  rows.push({ label: 'json', value: info.json == null ? '—' : fmtAdminScalar(info.json) });

  for (const key of Object.keys(info)) {
    if (ADMIN_SERVER_INFO_HANDLED.has(key)) continue;
    rows.push({ label: `Other: ${key}`, value: fmtAdminScalar((info as Record<string, unknown>)[key]) });
  }

  return rows;
}

const FRESHNESS_ROW_BORDER = '1px solid rgba(148,163,184,0.1)';
const TRACK_CATALOG = trackCatalog as TrackCatalogEntry[];

/** Body cell: soft row divider; vertical align top for multi-line age/note. */
const freshnessBodyCellSx = {
  borderBottom: FRESHNESS_ROW_BORDER,
  py: 1.35,
  verticalAlign: 'top' as const,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Page() {
  const [data, setData] = useState<AdminState>({
    metadata: null,
    currentTrack: null,
  });
  const [debugTechOpen, setDebugTechOpen] = useState(false);

  const siteVisitsConfigured = isSiteVisitsConfigured();
  const [visitPhase, setVisitPhase] = useState<'off' | 'loading' | 'ready' | 'error'>(() =>
    siteVisitsConfigured ? 'loading' : 'off'
  );
  const [visitCount, setVisitCount] = useState<number | undefined>(undefined);
  const [visitPageRows, setVisitPageRows] = useState<SitePageVisitRow[] | undefined>(undefined);

  const staticCurrentTrackRef = useRef<CurrentTrackData | null>(null);

  const applyVisitStatsResult = useCallback((n: number | null, pages: SitePageVisitRow[] | null) => {
    if (n !== null) {
      setVisitCount(n);
      setVisitPhase('ready');
      setVisitPageRows(pages ?? []);
    } else {
      setVisitPhase('error');
      setVisitPageRows(undefined);
    }
  }, []);

  const loadVisitStats = useCallback(async () => {
    if (!isSiteVisitsConfigured()) return;
    const [n, pages] = await Promise.all([fetchSiteVisitCount(), fetchSitePageVisitCounts()]);
    applyVisitStatsResult(n, pages);
  }, [applyVisitStatsResult]);

  const refreshSiteVisits = useCallback(() => {
    if (!isSiteVisitsConfigured()) return;
    setVisitPhase('loading');
    void loadVisitStats();
  }, [loadVisitStats]);

  useEffect(() => {
    let cancelled = false;
    if (siteVisitsConfigured) {
      void (async () => {
        const [n, pages] = await Promise.all([fetchSiteVisitCount(), fetchSitePageVisitCounts()]);
        if (cancelled) return;
        applyVisitStatsResult(n, pages);
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [siteVisitsConfigured, applyVisitStatsResult]);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetchJson<MetadataData>(DATA_FILE_PATHS.metadata),
      fetchJson<CurrentTrackData>(DATA_FILE_PATHS.currentTrack),
    ]).then((results) => {
      if (!mounted) return;
      const staticTrack = results[1].status === 'fulfilled' ? results[1].value : null;
      staticCurrentTrackRef.current = staticTrack;
      setData({
        metadata: results[0].status === 'fulfilled' ? results[0].value : null,
        currentTrack: toCurrentTrackPayload(staticTrack),
      });
      if (canAttemptLiveServerStatusFetch()) {
        void fetchLiveServerStatusFromSupabase().then((live) => {
          if (!mounted || !live) return;
          const base = toCurrentTrackPayload(staticCurrentTrackRef.current);
          setData((prev) => ({
            ...prev,
            currentTrack: pickNewerCurrentTrack(base ?? toCurrentTrackPayload(prev.currentTrack), live),
          }));
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldPollLiveServerStatus()) return undefined;
    let mounted = true;
    const id = window.setInterval(() => {
      void fetchLiveServerStatusFromSupabase().then((live) => {
        if (!mounted || !live) return;
        const base = toCurrentTrackPayload(staticCurrentTrackRef.current);
        setData((prev) => ({
          ...prev,
          currentTrack: pickNewerCurrentTrack(base ?? toCurrentTrackPayload(prev.currentTrack), live),
        }));
      });
    }, LIVE_SERVER_STATUS_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [data.currentTrack?.fetchedAt]);

  const adminServerDetailRows = useMemo(() => buildAdminServerInfoRows(data.currentTrack), [data.currentTrack]);
  const trackCatalogStats = useMemo(() => {
    const total = TRACK_CATALOG.length;
    const withImage = TRACK_CATALOG.filter((track) => Boolean(track.image?.trim())).length;
    const withAliases = TRACK_CATALOG.filter((track) => Array.isArray(track.aliases) && track.aliases.length > 0).length;
    const withOffset = TRACK_CATALOG.filter((track) => (track.imageOffsetY ?? 0) !== 0).length;
    return { total, withImage, withAliases, withOffset };
  }, []);

  const dataStatusRows = useMemo(
    () =>
      DATA_FILES.map((df) => {
        const ts = df.getTimestamp(data);
        const note = df.getNote?.(data) ?? '';
        const health = getSyncHealth(ts, df.syncHealthProfile ?? 'default');
        return { df, ts, note, health };
      }),
    [data]
  );

  return (
    <>
      <title>{`Admin Panel - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite team page — data freshness, AC Elite server status, and helpful links." />
      <meta name="robots" content="noindex, nofollow" />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Box sx={softFloatWrapperSx()}>
              <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                  <Typography variant="h4" fontWeight={800}>
                    Admin Panel
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Quick checks for the team: is public data up to date, is the game lobby up, and where to dig deeper if something looks wrong.
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <PreviewLock
              storageKey={SITE_PREVIEW.adminPanel.storageKey}
              password={SITE_PREVIEW.adminPanel.password}
              title="This area is locked"
              description="Ask your team lead for the shared password, then type it below."
            >
              <Stack spacing={3}>
                <Box sx={glassCardMotionSx(0)}>
                  <SiteVisitsShowcase
                    phase={visitPhase}
                    count={visitCount}
                    configured={siteVisitsConfigured}
                    pageRows={visitPageRows}
                    onRefresh={refreshSiteVisits}
                  />
                </Box>
                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Data freshness
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, mb: 1 }}>
                    Each row is one file the website reads. If something looks old, note the time and tell a tech lead which row it was.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: data.metadata?.error ? 1 : 2, lineHeight: 1.55, maxWidth: 900 }}>
                    <strong>Live</strong> — updated recently. <strong>Delayed</strong> — older than we like for that type of file; worth a look if players ask.{' '}
                    <strong>Stale</strong> — please flag to a tech lead. <strong>Unknown</strong> — no date yet (first load or missing file).
                  </Typography>
                  {data.metadata?.error && (
                    <Typography variant="body2" sx={{ mb: 2, color: '#fca5a5', overflowWrap: 'anywhere' }}>
                      Last sync error: {data.metadata.error}
                    </Typography>
                  )}

                  <TableContainer
                    sx={{
                      maxWidth: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      borderRadius: 2,
                      border: '1px solid rgba(148,163,184,0.14)',
                      bgcolor: 'rgba(15,23,42,0.35)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <Table
                      size="small"
                      sx={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        minWidth: 980,
                        tableLayout: 'fixed',
                      }}
                    >
                      <TableHead>
                        <TableRow
                          sx={{
                            background:
                              'linear-gradient(180deg, rgba(36,52,88,0.92) 0%, rgba(24,35,58,0.88) 100%)',
                            '& th': {
                              fontSize: '0.68rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.1em',
                              fontWeight: 800,
                              color: TABLE_HEAD_MUTED_COLOR,
                              borderBottom: '1px solid rgba(148,163,184,0.28)',
                              py: 1.35,
                              px: 1.5,
                            },
                          }}
                        >
                          <TableCell sx={{ width: { xs: 170, sm: 180 } }}>Data file</TableCell>
                          <TableCell sx={{ width: { xs: 120, sm: 140 } }}>Source</TableCell>
                          <TableCell sx={{ width: { xs: 165, sm: 180 } }}>Last change</TableCell>
                          <TableCell sx={{ width: { xs: 150, sm: 170 } }}>Freshness</TableCell>
                          <TableCell sx={{ width: { xs: 340, sm: 420, md: 500 } }}>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dataStatusRows.map(({ df, ts, note, health }) => (
                          <TableRow
                            key={df.file}
                            hover
                            sx={{
                              transition: 'background-color 0.15s ease',
                              '&:nth-of-type(even)': {
                                bgcolor: 'rgba(15,23,42,0.35)',
                              },
                              '&:hover': {
                                bgcolor: 'rgba(30,41,64,0.65)',
                              },
                              '&:last-of-type td': { borderBottom: 'none' },
                              borderLeft: '3px solid',
                              borderLeftColor: health.color,
                            }}
                          >
                            <TableCell sx={{ ...freshnessBodyCellSx, pl: 1.5, pr: 1, width: { xs: 170, sm: 180 } }}>
                              <Box
                                component="span"
                                sx={{
                                  display: 'inline-block',
                                  fontFamily: 'ui-monospace, monospace',
                                  fontWeight: 700,
                                  fontSize: '0.8rem',
                                  px: 1,
                                  py: 0.35,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(15,23,42,0.55)',
                                  border: '1px solid rgba(148,163,184,0.22)',
                                  color: 'rgba(248,250,252,0.95)',
                                }}
                              >
                                {df.file}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ ...freshnessBodyCellSx, color: 'text.secondary', width: { xs: 120, sm: 140 } }}>
                              {df.updatedBy}
                            </TableCell>
                            <TableCell
                              sx={{
                                ...freshnessBodyCellSx,
                                color: 'text.primary',
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                width: { xs: 165, sm: 180 },
                              }}
                            >
                              {formatAbsolute(ts)}
                            </TableCell>
                            <TableCell sx={{ ...freshnessBodyCellSx, minWidth: 140, width: { xs: 150, sm: 170 } }}>
                              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  size="small"
                                  label={health.label}
                                  sx={{
                                    height: 24,
                                    fontWeight: 800,
                                    fontSize: '0.7rem',
                                    color: health.color,
                                    bgcolor: `${health.color}1a`,
                                    border: `1px solid ${health.color}66`,
                                    '& .MuiChip-label': { px: 1.1 },
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {health.ageText}
                                </Typography>
                              </Stack>
                            </TableCell>
                            <TableCell
                              sx={{
                                ...freshnessBodyCellSx,
                                color: 'text.secondary',
                                fontSize: '0.8125rem',
                                lineHeight: 1.45,
                                width: { xs: 340, sm: 420, md: 500 },
                                whiteSpace: 'normal',
                                overflowWrap: 'break-word',
                                wordBreak: 'normal',
                              }}
                            >
                              {note || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(2) }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                    sx={{ mb: 1.5 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        AC Elite server status
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        Is the lobby up, which track is loaded, and how many drivers are connected — same idea players see on the homepage card.
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={data.currentTrack?.online ? 'Online' : 'Offline'}
                      sx={{
                        fontWeight: 800,
                        color: data.currentTrack?.online ? '#22c55e' : '#f59e0b',
                        bgcolor: data.currentTrack?.online ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        border: data.currentTrack?.online ? '1px solid rgba(34,197,94,0.45)' : '1px solid rgba(245,158,11,0.45)',
                      }}
                    />
                  </Stack>
                  <Grid container spacing={1.25}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Track</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                          {data.currentTrack?.track?.trim() ? getTrackDisplayName(data.currentTrack.track) : '—'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Drivers</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                          {data.currentTrack?.info?.clients ?? '—'} / {data.currentTrack?.info?.maxclients ?? '—'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Session</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                          {data.currentTrack?.info ? acCurrentSessionLabel(data.currentTrack.info) : '—'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Updated</Typography>
                        <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                          {data.currentTrack?.fetchedAt ? formatRelative(data.currentTrack.fetchedAt) : 'Unknown'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(3), order: 4 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>Track IDs</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        Short list of track names and IDs for quick lookup.
                      </Typography>
                    </Box>
                  </Stack>

                  <TableContainer sx={{ maxHeight: 380, borderRadius: 1, border: '1px solid rgba(148,163,184,0.14)', bgcolor: 'rgba(15,23,42,0.35)' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, width: '38%', bgcolor: 'rgba(15,23,42,0.88)' }}>Track name</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '42%', bgcolor: 'rgba(15,23,42,0.88)' }}>Track ID</TableCell>
                          <TableCell sx={{ fontWeight: 800, width: '20%', bgcolor: 'rgba(15,23,42,0.88)' }}>Image</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {TRACK_CATALOG.map((track) => {
                          const image = track.image?.trim() ?? '';
                          return (
                            <TableRow key={track.id}>
                              <TableCell sx={{ ...freshnessBodyCellSx, color: 'text.primary', fontWeight: 700 }}>{track.name || '—'}</TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '0.8rem' }}>
                                {track.id}
                              </TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx }}>
                                <Chip
                                  size="small"
                                  label={image ? 'Yes' : 'No'}
                                  sx={{
                                    height: 22,
                                    fontWeight: 700,
                                    color: image ? '#22c55e' : 'rgba(226,232,240,0.92)',
                                    bgcolor: image ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.15)',
                                    border: image ? '1px solid rgba(34,197,94,0.42)' : '1px solid rgba(148,163,184,0.35)',
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(4), order: 3 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Useful links & details</Typography>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1.25}
                      useFlexGap
                      flexWrap="wrap"
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                    >
                      <Button component="a" href={SERVER_ENDPOINTS.info} target="_blank" rel="noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}>
                        Live status page
                      </Button>
                      <Button component="a" href={`${SITE_REPO_URL}/actions`} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}>
                        Automation runs (GitHub)
                      </Button>
                      <Button component="a" href={SERVER_ENDPOINTS.join} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_JOIN_SERVER_OUTLINED_SX }}>
                        Join server (Content Manager)
                      </Button>
                    </Stack>
                  </Stack>
                  <Stack spacing={1.25}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Full field list (extra details)
                    </Typography>
                    <TableContainer sx={{ maxHeight: 400, borderRadius: 1, border: '1px solid rgba(148,163,184,0.14)', bgcolor: 'rgba(15,23,42,0.35)' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800, width: '32%', bgcolor: 'rgba(15,23,42,0.88)' }}>Field</TableCell>
                            <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(15,23,42,0.88)' }}>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {adminServerDetailRows.map((row, idx) => (
                            <TableRow key={`${row.label}-${idx}`}>
                              <TableCell sx={{ ...freshnessBodyCellSx, color: 'text.secondary', fontWeight: 700 }}>{row.label}</TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, fontFamily: row.value.length > 120 ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit', fontSize: '0.8125rem', wordBreak: 'break-word' }}>
                                {row.value}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', pt: 0.5 }}>
                      When background tasks usually run (plain-language)
                    </Typography>
                    <Stack spacing={1}>
                      {SCHEDULE.map((entry) => (
                        <Box key={entry.workflow} sx={{ ...GLASS_INNER_PANEL_SX, py: 1.2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{entry.workflow}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {entry.agendaWhen} · {entry.agendaSub} · {entry.cron}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.65, lineHeight: 1.5 }}>
                            {entry.what}
                          </Typography>
                          {entry.chain && (
                            <Typography variant="caption" sx={{ color: 'rgba(191,219,254,0.95)', display: 'block', mt: 0.5 }}>
                              {entry.chain}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Stack>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(5) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Optional: try things in your browser
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
                    You never have to use this section. It is only for checking how the site looks in special cases. Nothing here changes the real stuff.
                  </Typography>
                  <Stack spacing={2}>
                    {DEBUG_QUICK_TRIES.map((block) => (
                      <Box key={block.key} sx={{ ...GLASS_INNER_PANEL_SX, py: 1.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {block.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, lineHeight: 1.5 }}>
                          {block.intro}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', mt: 1.25 }}>
                          Steps
                        </Typography>
                        <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 2.25, color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55 }}>
                          {block.stepsBeforeSnippet.map((step, i) => (
                            <Box component="li" key={`${block.key}-before-${i}`} sx={{ mb: 0.35 }}>
                              {step}
                            </Box>
                          ))}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.25, fontWeight: 700 }}>
                          Copy this whole line:
                        </Typography>
                        <Box
                          component="code"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            mb: 1,
                            px: 1.25,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: 'rgba(15,23,42,0.65)',
                            border: '1px solid rgba(148,163,184,0.28)',
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.85rem',
                            color: 'rgba(248,250,252,0.95)',
                            wordBreak: 'break-all',
                          }}
                        >
                          {block.paste}
                        </Box>
                        <Box
                          component="ol"
                          start={block.stepsBeforeSnippet.length + 1}
                          sx={{ m: 0, mt: 0.5, pl: 2.25, color: 'text.secondary', fontSize: '0.875rem', lineHeight: 1.55 }}
                        >
                          {block.stepsAfterSnippet.map((step, i) => (
                            <Box component="li" key={`${block.key}-after-${i}`} sx={{ mb: 0.35 }}>
                              {step}
                            </Box>
                          ))}
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(191,219,254,0.95)', display: 'block', mt: 1 }}>
                          When you are done: {block.turnOff}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Button
                    type="button"
                    size="small"
                    variant="text"
                    onClick={() => setDebugTechOpen((o) => !o)}
                    sx={{
                      mt: 2,
                      fontWeight: 700,
                      textTransform: 'none',
                      color: 'rgba(248,250,252,0.88)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(248,250,252,0.98)' },
                    }}
                  >
                    {debugTechOpen ? '▲ Hide' : '▼ Show'} extra details (URL options)
                  </Button>
                  <Collapse in={debugTechOpen} timeout="auto" unmountOnExit>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, mb: 1, lineHeight: 1.55 }}>
                      These are the same switches as above in a compact developer reference. Everything here is query-param based, so you can toggle it directly from the address bar.
                    </Typography>
                    <TableContainer
                      sx={{
                        maxWidth: '100%',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        borderRadius: 2,
                        border: '1px solid rgba(148,163,184,0.14)',
                        bgcolor: 'rgba(15,23,42,0.35)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}
                    >
                      <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 640 }}>
                        <TableHead>
                          <TableRow
                            sx={{
                              background:
                                'linear-gradient(180deg, rgba(36,52,88,0.92) 0%, rgba(24,35,58,0.88) 100%)',
                              '& th': {
                                fontSize: '0.68rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontWeight: 800,
                                color: TABLE_HEAD_MUTED_COLOR,
                                borderBottom: '1px solid rgba(148,163,184,0.28)',
                                py: 1.1,
                                px: 1.25,
                              },
                            }}
                          >
                            <TableCell>What</TableCell>
                            <TableCell>Env variable (build)</TableCell>
                            <TableCell>URL piece</TableCell>
                            <TableCell>Browser storage key</TableCell>
                            <TableCell>Allowed values</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {DEBUG_TECH_REFERENCE.map((row) => (
                            <TableRow
                              key={row.title}
                              sx={{
                                '&:nth-of-type(even)': { bgcolor: 'rgba(15,23,42,0.35)' },
                                '&:last-of-type td': { borderBottom: 'none' },
                              }}
                            >
                              <TableCell sx={{ ...freshnessBodyCellSx, fontWeight: 700, maxWidth: 220 }}>{row.title}</TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                                {row.env}
                              </TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                                ?{row.query}=…
                              </TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                {row.storageKey}
                              </TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, color: 'text.secondary', fontSize: '0.8125rem' }}>
                                {row.values} (case-insensitive)
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Paper>
              </Stack>
            </PreviewLock>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
