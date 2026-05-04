import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getSyncHealth } from 'src/lib/sync-utils';
import { SITE_PREVIEW } from 'src/site-manual-config';
import { getTrackDisplayName } from 'src/lib/ac-elite-data';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  GLASS_CARD_SX,
  GLASS_PANEL_SX,
  GLASS_INNER_PANEL_SX,
  GLASS_PANEL_COMPACT_SX,
} from 'src/lib/glass';
import {
  DATA_PAGE_SHELL_SX,
  TABLE_HEAD_MUTED_COLOR,
  HERO_FOOTNOTE_CAPTION_SX,
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

/** Public site + repo (same URLs as elsewhere in the project). */
const TEAM_GITHUB_REPO = 'https://github.com/ac-elite/ac-elite.github.io';
const TEAM_GAME_SERVER_JOIN =
  'https://acstuff.ru/s/q:race/online/join?httpPort=18283&ip=157.90.3.32';

// ---------------------------------------------------------------------------
// Types for fetched data
// ---------------------------------------------------------------------------

type MetadataData = { lastSync?: string; status?: string; error?: string; rank24hSnapshotAt?: string };
type CurrentTrackData = CurrentTrackPayload;

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
    workflow: 'Sync KMR Data',
    cron: '0 * * * *',
    what: 'Downloads rank.json and leaderboard.json from KMR FTP; writes metadata.json with sync time.',
    chain: 'Then: Daily Rank Snapshot → Deploy Pages',
  },
  {
    agendaWhen: ':05',
    agendaSub: 'Every hour · UTC',
    kind: 'recurring',
    workflow: 'GitHub · current-track snapshot',
    cron: '5 * * * *',
    what:
      'GitHub Action hits /INFO and commits public/data/current-track.json only when it changes. Static fallback for builds; live server UI reads Supabase server_status when URL + anon key are in the build (opt-out with VITE_SUPABASE_LIVE_SERVER_STATUS=0).',
  },
  {
    agendaWhen: '1–5 min',
    agendaSub: 'cron-job.org → Supabase Edge',
    kind: 'recurring',
    workflow: 'sync-server-status',
    cron: 'Your cron-job.org schedule',
    what:
      'POST to Edge Function with CRON_SECRET; polls /INFO and upserts public.server_status. Same /INFO source as the snapshot workflow, but stored in Supabase for frequent updates without a git commit.',
  },
  {
    agendaWhen: 'After sync',
    agendaSub: 'Not before 06:00 local (Amsterdam) · once per day',
    kind: 'chained',
    workflow: 'Daily Rank Snapshot (24h)',
    cron: 'workflow_run (after Sync KMR)',
    what:
      'Copies rank.json → rank-24h.json for delta calculations. Skipped before 06:00 local (Amsterdam); at most once per day.',
    chain: 'Then: Deploy Pages',
  },
  {
    agendaWhen: 'On change',
    agendaSub: 'Push main · workflow_run',
    kind: 'deploy',
    workflow: 'Deploy Pages',
    cron: 'workflow_run + push main',
    what: 'Builds Vite app and deploys dist/ to GitHub Pages.',
  },
];

// ---------------------------------------------------------------------------
// Data files we track
// ---------------------------------------------------------------------------

type DataFileEntry = {
  file: string;
  updatedBy: string;
  getTimestamp: (s: AdminState) => string | undefined;
  getNote?: (s: AdminState) => string;
};

const DATA_FILES: readonly DataFileEntry[] = [
  {
    file: 'metadata.json',
    updatedBy: 'Sync KMR Data',
    getTimestamp: (s) => s.metadata?.lastSync,
    getNote: (s) => (s.metadata?.status === 'success' ? 'success' : s.metadata?.status ?? ''),
  },
  {
    file: 'current-track.json',
    updatedBy: 'GitHub · current-track.json',
    getTimestamp: (s) => s.currentTrack?.fetchedAt,
    getNote: (s) => {
      const state =
        s.currentTrack?.online
          ? `online · ${s.currentTrack.track ? getTrackDisplayName(s.currentTrack.track) : '—'}`
          : 'offline';
      return `${state} · GitHub Action when file changes; live feed = Supabase server_status`;
    },
  },
  {
    file: 'rank.json',
    updatedBy: 'Sync KMR Data',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
  {
    file: 'rank-24h.json',
    updatedBy: 'Daily Rank Snapshot',
    getTimestamp: (s) => s.metadata?.rank24hSnapshotAt,
    getNote: (s) =>
      s.metadata?.rank24hSnapshotAt
        ? 'metadata.rank24hSnapshotAt (Daily Rank Snapshot; preserved when KMR sync rewrites metadata)'
        : 'set automatically on next snapshot run after workflow update',
  },
  {
    file: 'leaderboard.json',
    updatedBy: 'Sync KMR Data',
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

const AC_SERVER_INFO_URL = 'http://157.90.3.32:18283/INFO';

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
    rows.push({ label: '/INFO', value: 'No info object on payload — check Supabase server_status.info or static merge.' });
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

type ActionStatusTone = 'ok' | 'warn' | 'error';

type ActionPanelEntry = {
  name: string;
  tone: ActionStatusTone;
  status: string;
  when?: string;
  note: string;
  href: string;
};

const FRESHNESS_ROW_BORDER = '1px solid rgba(148,163,184,0.1)';

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
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [showRawServerInfo, setShowRawServerInfo] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const staticCurrentTrackRef = useRef<CurrentTrackData | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetchJson<MetadataData>('/data/metadata.json'),
      fetchJson<CurrentTrackData>('/data/current-track.json'),
    ]).then((results) => {
      if (!mounted) return;
      const staticTrack = results[1].status === 'fulfilled' ? results[1].value : null;
      staticCurrentTrackRef.current = staticTrack;
      setData({
        metadata: results[0].status === 'fulfilled' ? results[0].value : null,
        currentTrack: staticTrack,
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

  const actionOverview = useMemo<ActionPanelEntry[]>(() => {
    const syncHealth = getSyncHealth(data.metadata?.lastSync);
    const syncFailed = data.metadata?.status?.toLowerCase() === 'error';
    const syncActionStatus = syncFailed ? 'Failed' : data.metadata?.status === 'success' ? 'Healthy' : syncHealth.label;

    const snapshotHealth = getSyncHealth(data.metadata?.rank24hSnapshotAt);
    const snapshotStatus = data.metadata?.rank24hSnapshotAt ? snapshotHealth.label : 'Pending';

    const trackHealth = getSyncHealth(data.currentTrack?.fetchedAt);

    const syncNote =
      syncFailed && data.metadata?.error
        ? data.metadata.error
        : 'Downloads rank.json + leaderboard.json and updates metadata.';

    return [
      {
        name: 'Sync KMR Data',
        tone: syncFailed ? 'error' : syncActionStatus === 'Live' || syncActionStatus === 'Healthy' ? 'ok' : 'warn',
        status: syncActionStatus,
        when: data.metadata?.lastSync,
        note: syncNote,
        href: `${TEAM_GITHUB_REPO}/actions/workflows/sync-data.yml`,
      },
      {
        name: 'Daily Rank Snapshot (24h)',
        tone: snapshotStatus === 'Live' || snapshotStatus === 'Delayed' ? 'ok' : 'warn',
        status: snapshotStatus,
        when: data.metadata?.rank24hSnapshotAt,
        note: data.metadata?.rank24hSnapshotAt
          ? 'Copies rank.json to rank-24h.json once per day after 06:00 Amsterdam.'
          : 'No snapshot timestamp yet; this can be normal before the first daily run.',
        href: `${TEAM_GITHUB_REPO}/actions/workflows/snapshot-24h.yml`,
      },
      {
        name: 'Current-track snapshot',
        tone: trackHealth.label === 'Live' ? 'ok' : trackHealth.label === 'Stale' ? 'error' : 'warn',
        status: trackHealth.label,
        when: data.currentTrack?.fetchedAt,
        note: 'GitHub Action updates current-track.json when /INFO snapshot changes.',
        href: `${TEAM_GITHUB_REPO}/actions`,
      },
    ];
  }, [data.currentTrack?.fetchedAt, data.metadata?.error, data.metadata?.lastSync, data.metadata?.rank24hSnapshotAt, data.metadata?.status]);

  const overallIncident = useMemo(() => {
    const hasHardError = actionOverview.some((entry) => entry.tone === 'error');
    const hasWarning = actionOverview.some((entry) => entry.tone === 'warn');
    if (hasHardError) return { label: 'Down', color: '#ef4444', tone: 'error' as const };
    if (hasWarning) return { label: 'Degraded', color: '#f59e0b', tone: 'warn' as const };
    return { label: 'Healthy', color: '#22c55e', tone: 'ok' as const };
  }, [actionOverview]);

  const actionLastUpdate = useMemo(() => {
    const stamps = actionOverview
      .map((entry) => entry.when)
      .filter((x): x is string => Boolean(x))
      .map((ts) => new Date(ts).getTime())
      .filter((ms) => Number.isFinite(ms));
    if (!stamps.length) return undefined;
    return new Date(Math.max(...stamps)).toISOString();
  }, [actionOverview]);

  const staleFileRows = useMemo(() => {
    const rows = DATA_FILES.map((df) => {
      const ts = df.getTimestamp(data);
      const note = df.getNote?.(data) ?? '';
      const health = getSyncHealth(ts);
      return { df, ts, note, health };
    });
    return showAllFiles ? rows : rows.filter((row) => row.health.label !== 'Live');
  }, [data, showAllFiles]);

  return (
    <>
      <title>{`Admin Panel - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite internal admin panel." />
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
                    Internal overview for moderators and admins — schedules, data freshness, and site status at a glance.
                  </Typography>
                  <Typography variant="caption" sx={{ ...HERO_FOOTNOTE_CAPTION_SX, maxWidth: 720 }}>
                    Live KMR sync and server snapshot cards are directly below, then workflow schedule, file freshness (incl.
                    current-track.json vs Supabase), and team shortcuts.
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <PreviewLock
              storageKey={SITE_PREVIEW.adminPanel.storageKey}
              password={SITE_PREVIEW.adminPanel.password}
              title="Admin Panel Locked"
              description="Use the internal preview password to access operational dashboards."
            >
              <Stack spacing={3}>
                <Paper
                  sx={{
                    ...GLASS_PANEL_COMPACT_SX,
                    ...glassCardMotionSx(1),
                    border: `1px solid ${overallIncident.color}55`,
                    borderLeft: `4px solid ${overallIncident.color}`,
                  }}
                >
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }} justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.14, fontWeight: 700 }}>
                        Incident overview
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                        <Chip
                          size="small"
                          label={overallIncident.label}
                          sx={{
                            fontWeight: 800,
                            color: overallIncident.color,
                            bgcolor: `${overallIncident.color}22`,
                            border: `1px solid ${overallIncident.color}55`,
                          }}
                        />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Last update: {actionLastUpdate ? `${formatAbsolute(actionLastUpdate)} (${formatRelative(actionLastUpdate)})` : 'Unknown'}
                        </Typography>
                      </Stack>
                    </Box>
                    <Button
                      component="a"
                      href={`${TEAM_GITHUB_REPO}/actions`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      size="small"
                      sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                    >
                      Open Actions
                    </Button>
                  </Stack>
                  {data.metadata?.error && (
                    <Typography variant="body2" sx={{ mt: 1.25, color: '#fca5a5', overflowWrap: 'anywhere' }}>
                      Last failure: {data.metadata.error}
                    </Typography>
                  )}
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(2) }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1.5}
                    sx={{ mb: 1.75 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Pipeline health
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        One row per critical workflow. Use this block as the primary triage signal.
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={1.1}>
                    {actionOverview.map((entry) => {
                      const toneColor =
                        entry.tone === 'ok' ? '#22c55e' : entry.tone === 'error' ? '#ef4444' : '#f59e0b';
                      return (
                        <Stack
                          key={entry.name}
                          direction={{ xs: 'column', md: 'row' }}
                          spacing={1.25}
                          sx={{
                            p: 1.35,
                            borderRadius: 1.75,
                            border: '1px solid rgba(148,163,184,0.2)',
                            bgcolor: 'rgba(15,23,42,0.35)',
                            borderLeft: `3px solid ${toneColor}`,
                          }}
                        >
                          <Box sx={{ minWidth: { md: 270 } }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {entry.name}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.9} sx={{ mt: 0.65 }}>
                              <Chip
                                size="small"
                                label={entry.status}
                                sx={{
                                  height: 22,
                                  fontWeight: 800,
                                  fontSize: '0.68rem',
                                  color: toneColor,
                                  bgcolor: `${toneColor}22`,
                                  border: `1px solid ${toneColor}55`,
                                }}
                              />
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {entry.when ? `${formatAbsolute(entry.when)} (${formatRelative(entry.when)})` : 'No timestamp yet'}
                              </Typography>
                            </Stack>
                          </Box>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                lineHeight: 1.5,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {entry.note}
                            </Typography>
                          </Box>

                          <Box sx={{ alignSelf: { xs: 'flex-start', md: 'center' } }}>
                            <Button
                              component="a"
                              href={entry.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="outlined"
                              size="small"
                              sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                            >
                              View logs
                            </Button>
                          </Box>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(3) }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    spacing={1}
                    sx={{ mb: 1.5 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Live server quick state
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        Server online state, track and session details for rapid race operations checks.
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

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(4) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Data integrity exceptions
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, mb: 2 }}>
                    Shows non-live files by default. Enable all rows when you need a full audit.
                  </Typography>
                  <FormControlLabel
                    control={<Switch size="small" checked={showAllFiles} onChange={(e) => setShowAllFiles(e.target.checked)} />}
                    label={showAllFiles ? 'Showing all files' : 'Showing only delayed/stale/unknown'}
                    sx={{ mb: 1.5, color: 'text.secondary' }}
                  />

                  <TableContainer
                    sx={{
                      ...GLASS_CARD_SX,
                      maxWidth: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      WebkitOverflowScrolling: 'touch',
                      borderRadius: 2,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                  >
                    <Table
                      size="small"
                      sx={{
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        minWidth: 720,
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
                          <TableCell>File</TableCell>
                          <TableCell>Updated by</TableCell>
                          <TableCell>Last update</TableCell>
                          <TableCell>Age</TableCell>
                          <TableCell>Note</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staleFileRows.map(({ df, ts, note, health }) => (
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
                              <TableCell sx={{ ...freshnessBodyCellSx, pl: 1.5, pr: 1 }}>
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
                              <TableCell sx={{ ...freshnessBodyCellSx, color: 'text.secondary', maxWidth: 200 }}>
                                {df.updatedBy}
                              </TableCell>
                              <TableCell
                                sx={{
                                  ...freshnessBodyCellSx,
                                  color: 'text.primary',
                                  fontVariantNumeric: 'tabular-nums',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {formatAbsolute(ts)}
                              </TableCell>
                              <TableCell sx={{ ...freshnessBodyCellSx, minWidth: 140 }}>
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
                                  maxWidth: { xs: 200, sm: 280, md: 360 },
                                  whiteSpace: 'normal',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {note || '—'}
                              </TableCell>
                            </TableRow>
                        ))}
                        {staleFileRows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ ...freshnessBodyCellSx, py: 2.2, color: '#86efac' }}>
                              No delayed, stale, or unknown files detected.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(5) }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Secondary details</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Button component="a" href={AC_SERVER_INFO_URL} target="_blank" rel="noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}>
                        Open live /INFO
                      </Button>
                      <Button component="a" href={`${TEAM_GITHUB_REPO}/actions`} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}>
                        Actions
                      </Button>
                      <Button component="a" href={TEAM_GAME_SERVER_JOIN} target="_blank" rel="noopener noreferrer" variant="outlined" size="small" sx={{ ...ADMIN_JOIN_SERVER_OUTLINED_SX }}>
                        Join game server
                      </Button>
                    </Stack>
                  </Stack>
                  <Stack spacing={1.25}>
                    <FormControlLabel
                      control={<Switch size="small" checked={showRawServerInfo} onChange={(e) => setShowRawServerInfo(e.target.checked)} />}
                      label="Show raw merged /INFO table"
                      sx={{ color: 'text.secondary' }}
                    />
                    {showRawServerInfo && (
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
                    )}
                    <FormControlLabel
                      control={<Switch size="small" checked={showSchedule} onChange={(e) => setShowSchedule(e.target.checked)} />}
                      label="Show workflow cadence details"
                      sx={{ color: 'text.secondary' }}
                    />
                    {showSchedule && (
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
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </PreviewLock>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
