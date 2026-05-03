import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getSyncHealth } from 'src/lib/sync-utils';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { formatNumber, getTrackDisplayName } from 'src/lib/ac-elite-data';
import { fetchSiteVisitCount, isSiteVisitsConfigured } from 'src/lib/site-visits';
import { STATUS_ACCENT, brandAccentBorderSx, statusAccentBorderSx, statusAccentSplitRimSx } from 'src/lib/status-accent';
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
  pickNewerCurrentTrack,
  toCurrentTrackPayload,
  LIVE_SERVER_STATUS_POLL_MS,
  fetchLiveServerStatusFromSupabase,
  isSupabaseLiveServerStatusEnabled,
} from 'src/lib/server-status';

import { PreviewLock } from 'src/components/preview-lock/preview-lock';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { SiteVisitsShowcase } from 'src/components/site-visits-showcase/site-visits-showcase';

/** Preview gate (client-side only; edit here to rotate the admin preview password). */
const ADMIN_PREVIEW_PASSWORD = 'acelite-mod-team';

/** Public site + repo (same URLs as elsewhere in the project). */
const TEAM_PUBLIC_SITE = 'https://ac-elite.github.io/';
const TEAM_GITHUB_REPO = 'https://github.com/ac-elite/ac-elite.github.io';
const TEAM_DISCORD = 'https://discord.gg/d2EbxGYBbj';
const TEAM_GAME_SERVER_JOIN =
  'https://acstuff.ru/s/q:race/online/join?httpPort=18283&ip=157.90.3.32';

// ---------------------------------------------------------------------------
// Types for fetched data
// ---------------------------------------------------------------------------

type MetadataData = { lastSync?: string; status?: string };
type CurrentTrackData = { online?: boolean; track?: string; fetchedAt?: string };
type AceSkinPackData = { generatedAt?: string; entries?: unknown[] };
type LiverySectionsData = { officialPack?: boolean; aceSkinPack?: boolean; teamLiveries?: boolean };

type AdminState = {
  metadata: MetadataData | null;
  currentTrack: CurrentTrackData | null;
  aceSkinPack: AceSkinPackData | null;
  liverySections: LiverySectionsData | null;
  /** Length of rank.json when loaded (drivers in KMR rank export). */
  rankDriverCount: number | null;
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
    workflow: 'Daily Current Track',
    cron: '5 * * * *',
    what: 'Fetches server /INFO and writes current-track.json (only commits on change). Optional fallback if Supabase live path is off.',
  },
  {
    agendaWhen: '1–5 min',
    agendaSub: 'cron-job.org → Supabase Edge',
    kind: 'recurring',
    workflow: 'sync-server-status',
    cron: 'Your cron-job.org schedule',
    what: 'POST to Edge Function with CRON_SECRET; polls /INFO and upserts public.server_status. Site reads when VITE_SUPABASE_LIVE_SERVER_STATUS=1.',
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

const SCHEDULE_KIND_ACCENT: Record<ScheduleKind, { dot: string; label: string }> = {
  recurring: {
    dot: '#38bdf8',
    label: 'Recurring',
  },
  chained: {
    dot: '#a78bfa',
    label: 'Chained',
  },
  deploy: {
    dot: '#f6d365',
    label: 'Deploy',
  },
};

function scheduleHexToRgb(hex: string) {
  const x = hex.replace('#', '');
  const n = Number.parseInt(x.length === 6 ? x : x.slice(0, 6), 16);
  return {
    r: Math.floor(n / 65536) % 256,
    g: Math.floor(n / 256) % 256,
    b: n % 256,
  };
}

/** Mobile timeline rail: tinted segment between this dot and the next (desktop rail uses the same hues). */
function scheduleMobileRailGradient(fromHex: string, toHex: string) {
  const a = scheduleHexToRgb(fromHex);
  const b = scheduleHexToRgb(toHex);
  return `linear-gradient(180deg, rgba(${a.r},${a.g},${a.b},0.62) 0%, rgba(${b.r},${b.g},${b.b},0.52) 100%)`;
}

function scheduleMobileRailGradientLast(fromHex: string) {
  const a = scheduleHexToRgb(fromHex);
  return `linear-gradient(180deg, rgba(${a.r},${a.g},${a.b},0.58) 0%, rgba(${a.r},${a.g},${a.b},0.12) 100%)`;
}

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
    updatedBy: 'Daily Current Track',
    getTimestamp: (s) => s.currentTrack?.fetchedAt,
    getNote: (s) =>
      s.currentTrack?.online
        ? `online · ${s.currentTrack.track ? getTrackDisplayName(s.currentTrack.track) : '—'}`
        : 'offline',
  },
  {
    file: 'rank.json',
    updatedBy: 'Sync KMR Data',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
  {
    file: 'rank-24h.json',
    updatedBy: 'Daily Rank Snapshot',
    getTimestamp: () => undefined,
    getNote: () => 'snapshot: see git log',
  },
  {
    file: 'leaderboard.json',
    updatedBy: 'Sync KMR Data',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
  {
    file: 'team-roles.json',
    updatedBy: 'Sync KMR Data',
    getTimestamp: (s) => s.metadata?.lastSync,
  },
  {
    file: 'ace-skin-pack.json',
    updatedBy: 'Build (manifest script)',
    getTimestamp: (s) => s.aceSkinPack?.generatedAt,
    getNote: (s) => (s.aceSkinPack?.entries ? `${(s.aceSkinPack.entries as unknown[]).length} entries` : ''),
  },
  {
    file: 'livery-showcase-sections.json',
    updatedBy: 'Manual edit',
    getTimestamp: () => undefined,
    getNote: (s) => {
      if (!s.liverySections) return '';
      const on = [s.liverySections.officialPack, s.liverySections.aceSkinPack, s.liverySections.teamLiveries].filter(
        Boolean
      ).length;
      return `${on}/3 sections on`;
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

type SiteVisitPanelState =
  | { kind: 'off' }
  | { kind: 'loading'; lastCount?: number }
  | { kind: 'ready'; count: number }
  | { kind: 'error' };

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
    aceSkinPack: null,
    liverySections: null,
    rankDriverCount: null,
  });

  const [siteVisitPanel, setSiteVisitPanel] = useState<SiteVisitPanelState>(() =>
    isSiteVisitsConfigured() ? { kind: 'loading' } : { kind: 'off' }
  );

  useEffect(() => {
    if (!isSiteVisitsConfigured()) return undefined;
    let mounted = true;
    fetchSiteVisitCount().then((n) => {
      if (!mounted) return;
      setSiteVisitPanel(n == null ? { kind: 'error' } : { kind: 'ready', count: n });
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetchJson<MetadataData>('/data/metadata.json'),
      fetchJson<CurrentTrackData>('/data/current-track.json'),
      fetchJson<AceSkinPackData>('/data/ace-skin-pack.json'),
      fetchJson<LiverySectionsData>('/data/livery-showcase-sections.json'),
      fetchJson<unknown[]>('/data/rank.json'),
    ]).then((results) => {
      if (!mounted) return;
      const rankResult = results[4];
      const rankLen =
        rankResult.status === 'fulfilled' && Array.isArray(rankResult.value) ? rankResult.value.length : null;
      const staticTrack = results[1].status === 'fulfilled' ? results[1].value : null;
      setData({
        metadata: results[0].status === 'fulfilled' ? results[0].value : null,
        currentTrack: staticTrack,
        aceSkinPack: results[2].status === 'fulfilled' ? results[2].value : null,
        liverySections: results[3].status === 'fulfilled' ? results[3].value : null,
        rankDriverCount: rankLen,
      });
      if (isSupabaseLiveServerStatusEnabled()) {
        void fetchLiveServerStatusFromSupabase().then((live) => {
          if (!mounted || !live) return;
          setData((prev) => ({
            ...prev,
            currentTrack: pickNewerCurrentTrack(toCurrentTrackPayload(prev.currentTrack), live),
          }));
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseLiveServerStatusEnabled()) return undefined;
    let mounted = true;
    const id = window.setInterval(() => {
      void fetchLiveServerStatusFromSupabase().then((live) => {
        if (!mounted || !live) return;
        setData((prev) => ({
          ...prev,
          currentTrack: pickNewerCurrentTrack(toCurrentTrackPayload(prev.currentTrack), live),
        }));
      });
    }, LIVE_SERVER_STATUS_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, []);

  const syncStatus = useMemo(() => getSyncHealth(data.metadata?.lastSync), [data.metadata?.lastSync]);

  const trackStatusAccent = data.currentTrack?.online ? STATUS_ACCENT.online : STATUS_ACCENT.offline;

  const liveSiteHref =
    typeof window !== 'undefined'
      ? `${window.location.origin}${import.meta.env.BASE_URL}`
      : TEAM_PUBLIC_SITE;

  const skinPackCount = Array.isArray(data.aceSkinPack?.entries)
    ? (data.aceSkinPack.entries as unknown[]).length
    : null;

  const liverySectionsOn = useMemo(() => {
    if (!data.liverySections) return null;
    return [data.liverySections.officialPack, data.liverySections.aceSkinPack, data.liverySections.teamLiveries].filter(
      Boolean
    ).length;
  }, [data.liverySections]);

  return (
    <>
      <title>{`Admin Panel - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite internal admin panel." />
      <meta name="robots" content="noindex, nofollow" />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Box sx={{ ...GLASS_PANEL_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
              <Stack spacing={0.75} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="h4" fontWeight={800}>
                  Admin Panel
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Internal overview for moderators and admins — schedules, data freshness, and site status at a glance.
                </Typography>
                <Typography variant="caption" sx={{ ...HERO_FOOTNOTE_CAPTION_SX, maxWidth: 720 }}>
                  Live KMR sync and server track are in the cards directly below. Further down: workflow schedule, file-level
                  freshness, and team shortcuts.
                </Typography>
              </Stack>
            </Box>

            <PreviewLock
              storageKey="acelite-preview-admin-panel"
              password={ADMIN_PREVIEW_PASSWORD}
              title="Admin Panel Locked"
              description="Use the internal preview password to access operational dashboards."
            >
              <Stack spacing={3}>
                {/* ── Quick status (sync colors match home Race Intelligence) ── */}
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_COMPACT_SX,
                        height: '100%',
                        p: 2.25,
                        ...statusAccentBorderSx(syncStatus.color),
                        ...statusAccentSplitRimSx(syncStatus.color),
                        ...glassCardMotionSx(1),
                      }}
                    >
                      <Typography
                        variant="overline"
                        sx={{
                          letterSpacing: 0.14,
                          color: 'text.secondary',
                          fontWeight: 700,
                          lineHeight: 1.3,
                          display: 'block',
                          mb: 1.25,
                        }}
                      >
                        KMR data sync
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            flexShrink: 0,
                            bgcolor: syncStatus.color,
                            boxShadow: `0 0 0 4px ${syncStatus.color}28`,
                          }}
                        />
                        <Typography component="span" sx={{ fontWeight: 800, color: syncStatus.color, fontSize: '1.1rem' }}>
                          {syncStatus.label}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                          · {syncStatus.ageText}
                        </Typography>
                      </Stack>
                      {data.metadata?.status && (
                        <Typography
                          variant="body2"
                          sx={{ color: 'text.secondary', mt: 1.25, opacity: 0.92 }}
                        >
                          Last sync status:{' '}
                          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            {data.metadata.status}
                          </Box>
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper
                      sx={{
                        ...GLASS_PANEL_COMPACT_SX,
                        height: '100%',
                        p: 2.25,
                        ...statusAccentBorderSx(trackStatusAccent),
                        ...statusAccentSplitRimSx(trackStatusAccent),
                        ...glassCardMotionSx(2),
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 1.25 }}
                      >
                        <Typography
                          variant="overline"
                          sx={{
                            letterSpacing: 0.14,
                            color: 'text.secondary',
                            fontWeight: 700,
                            lineHeight: 1.3,
                          }}
                        >
                          Live server track
                        </Typography>
                        <Chip
                          size="small"
                          label={data.currentTrack?.online ? 'Online' : 'Offline'}
                          sx={{
                            height: 22,
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: data.currentTrack?.online ? 'rgba(34,197,94,0.2)' : 'rgba(148,163,184,0.2)',
                            color: data.currentTrack?.online ? '#86efac' : 'text.secondary',
                            border: '1px solid',
                            borderColor: data.currentTrack?.online ? 'rgba(34,197,94,0.45)' : 'rgba(148,163,184,0.35)',
                          }}
                        />
                      </Stack>
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '1rem', sm: '1.15rem' },
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {data.currentTrack?.track?.trim()
                          ? getTrackDisplayName(data.currentTrack.track)
                          : '—'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.25 }}>
                        {data.currentTrack?.fetchedAt
                          ? `Track info ${formatRelative(data.currentTrack.fetchedAt)}`
                          : 'No fetch time yet'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <SiteVisitsShowcase
                  configured={isSiteVisitsConfigured()}
                  phase={siteVisitPanel.kind}
                  count={
                    siteVisitPanel.kind === 'ready'
                      ? siteVisitPanel.count
                      : siteVisitPanel.kind === 'loading' && siteVisitPanel.lastCount != null
                        ? siteVisitPanel.lastCount
                        : undefined
                  }
                  onRefresh={() => {
                    setSiteVisitPanel((prev) =>
                      prev.kind === 'ready' ? { kind: 'loading', lastCount: prev.count } : { kind: 'loading' }
                    );
                    void fetchSiteVisitCount().then((n) =>
                      setSiteVisitPanel(n == null ? { kind: 'error' } : { kind: 'ready', count: n })
                    );
                  }}
                />

                {/* ── Action schedule (agenda / timeline) ── */}
                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(3) }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
                    spacing={1}
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Schedule agenda
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
                        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                          When workflows run: read left to right like a day planner — time on the
                          left, details on the right.
                        </Box>
                        <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                          When workflows run: read top to bottom — time first, then what runs in each
                          block.
                        </Box>
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {(['recurring', 'chained', 'deploy'] as const).map((k) => (
                        <Chip
                          key={k}
                          size="small"
                          label={SCHEDULE_KIND_ACCENT[k].label}
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            borderColor: `${SCHEDULE_KIND_ACCENT[k].dot}88`,
                            color: SCHEDULE_KIND_ACCENT[k].dot,
                            bgcolor: `${SCHEDULE_KIND_ACCENT[k].dot}18`,
                          }}
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Stack>

                  <Box sx={{ position: 'relative' }}>
                    {/* Vertical rail (desktop) */}
                    <Box
                      sx={{
                        display: { xs: 'none', md: 'block' },
                        position: 'absolute',
                        left: 148,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        borderRadius: 1,
                        background:
                          'linear-gradient(180deg, rgba(56,189,248,0.55) 0%, rgba(167,139,250,0.45) 45%, rgba(246,211,101,0.5) 100%)',
                        opacity: 0.85,
                      }}
                    />

                    <Stack spacing={0}>
                      {SCHEDULE.map((entry, idx) => {
                        const accent = SCHEDULE_KIND_ACCENT[entry.kind];
                        const nextDot =
                          idx < SCHEDULE.length - 1
                            ? SCHEDULE_KIND_ACCENT[SCHEDULE[idx + 1].kind].dot
                            : accent.dot;
                        const mobileRailBg =
                          idx < SCHEDULE.length - 1
                            ? scheduleMobileRailGradient(accent.dot, nextDot)
                            : scheduleMobileRailGradientLast(accent.dot);
                        return (
                          <Stack
                            key={entry.workflow}
                            direction="row"
                            spacing={{ xs: 1.25, md: 0 }}
                            alignItems="stretch"
                            sx={{
                              position: 'relative',
                              pb: idx < SCHEDULE.length - 1 ? 2.5 : 0,
                            }}
                          >
                            {/* Desktop: time column */}
                            <Box
                              sx={{
                                display: { xs: 'none', md: 'block' },
                                width: 132,
                                flexShrink: 0,
                                textAlign: 'right',
                                pr: 2.5,
                                pt: 0.5,
                              }}
                            >
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 900,
                                  letterSpacing: '-0.02em',
                                  fontFeatureSettings: '"tnum"',
                                  color: 'common.white',
                                  lineHeight: 1.1,
                                }}
                              >
                                {entry.agendaWhen}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'text.secondary',
                                  display: 'block',
                                  mt: 0.35,
                                  maxWidth: 220,
                                  ml: 'auto',
                                }}
                              >
                                {entry.agendaSub}
                              </Typography>
                            </Box>

                            {/* Mobile: rail — line centered in column, dot on the line */}
                            <Box
                              sx={{
                                display: { xs: 'block', md: 'none' },
                                width: 22,
                                flexShrink: 0,
                                position: 'relative',
                                alignSelf: 'stretch',
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 3,
                                  top: 0,
                                  bottom: idx < SCHEDULE.length - 1 ? -22 : 0,
                                  borderRadius: 1,
                                  background: mobileRailBg,
                                  boxShadow: `0 0 12px ${accent.dot}22`,
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  left: '50%',
                                  top: 22,
                                  transform: 'translate(-50%, -50%)',
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  bgcolor: accent.dot,
                                  boxShadow: `0 0 0 4px ${accent.dot}33, 0 0 18px ${accent.dot}44`,
                                  border: '2px solid rgba(15,23,42,0.9)',
                                  zIndex: 1,
                                }}
                              />
                            </Box>

                            {/* Desktop: timeline node */}
                            <Box
                              sx={{
                                display: { xs: 'none', md: 'flex' },
                                width: 32,
                                flexShrink: 0,
                                justifyContent: 'center',
                                position: 'relative',
                                pt: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: '50%',
                                  flexShrink: 0,
                                  mt: 1,
                                  bgcolor: accent.dot,
                                  boxShadow: `0 0 0 4px ${accent.dot}33, 0 0 18px ${accent.dot}44`,
                                  border: '2px solid rgba(15,23,42,0.9)',
                                  zIndex: 1,
                                }}
                              />
                            </Box>

                            {/* Time (mobile) + card */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.25 }}>
                                <Typography
                                  variant="h5"
                                  sx={{
                                    fontWeight: 900,
                                    letterSpacing: '-0.02em',
                                    fontFeatureSettings: '"tnum"',
                                    color: 'common.white',
                                    lineHeight: 1.1,
                                  }}
                                >
                                  {entry.agendaWhen}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    display: 'block',
                                    mt: 0.35,
                                    maxWidth: '100%',
                                  }}
                                >
                                  {entry.agendaSub}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  ...GLASS_INNER_PANEL_SX,
                                  borderLeft: { md: '3px solid' },
                                  borderLeftColor: `${accent.dot}aa`,
                                  background:
                                    'linear-gradient(135deg, rgba(31,44,73,0.92) 0%, rgba(23,33,59,0.88) 100%)',
                                }}
                              >
                                <Stack
                                  direction={{ xs: 'column', sm: 'row' }}
                                  justifyContent="space-between"
                                  alignItems={{ sm: 'flex-start' }}
                                  spacing={1}
                                >
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                      {entry.workflow}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={accent.label}
                                      sx={{
                                        mt: 0.75,
                                        height: 22,
                                        fontWeight: 800,
                                        fontSize: '0.65rem',
                                        color: accent.dot,
                                        bgcolor: `${accent.dot}22`,
                                        border: `1px solid ${accent.dot}55`,
                                      }}
                                    />
                                  </Box>
                                </Stack>
                                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.25, lineHeight: 1.55 }}>
                                  {entry.what}
                                </Typography>
                                {entry.chain && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'rgba(191,219,254,0.95)',
                                      display: 'block',
                                      mt: 1,
                                      fontWeight: 600,
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {entry.chain}
                                  </Typography>
                                )}
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'rgba(148,163,184,0.85)',
                                    display: 'block',
                                    mt: 1,
                                    fontFamily: 'ui-monospace, monospace',
                                    wordBreak: 'break-all',
                                  }}
                                >
                                  {entry.cron}
                                </Typography>
                              </Box>
                            </Box>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                </Paper>

                {/* ── Data freshness table ── */}
                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(4) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Data freshness
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, mb: 2 }}>
                    Last update per public/data file. Uses the same labels and colours as the home page:
                    Live (≤2h), Delayed (≤24h), Stale (&gt;24h), Unknown (missing/invalid time).
                  </Typography>

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
                        {DATA_FILES.map((df) => {
                          const ts = df.getTimestamp(data);
                          const note = df.getNote?.(data) ?? '';
                          const health = getSyncHealth(ts);
                          return (
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
                                }}
                              >
                                {note || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                {/* ── Team hub: links + snapshot ── */}
                <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(5) }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Team hub
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, mb: 2 }}>
                    Shortcuts and bite-sized context — nothing here replaces the tables above.
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.06 }}>
                        Snapshot
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={
                            data.rankDriverCount != null
                              ? `${formatNumber(data.rankDriverCount)} drivers in rank.json`
                              : 'rank.json …'
                          }
                          sx={{ fontWeight: 700, bgcolor: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)' }}
                        />
                        <Chip
                          size="small"
                          label={
                            skinPackCount != null
                              ? `${formatNumber(skinPackCount)} skin pack entries`
                              : 'Skin pack …'
                          }
                          sx={{ fontWeight: 700, bgcolor: 'rgba(246,211,101,0.1)', border: '1px solid rgba(246,211,101,0.35)' }}
                        />
                        {liverySectionsOn != null && (
                          <Chip
                            size="small"
                            label={`${liverySectionsOn}/3 livery sections on`}
                            sx={{ fontWeight: 700, bgcolor: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.75, lineHeight: 1.55 }}>
                        Day-to-day rank <strong>deltas</strong> use <code style={{ fontSize: '0.85em' }}>rank-24h.json</code>{' '}
                        vs <code style={{ fontSize: '0.85em' }}>rank.json</code> (snapshot workflow after 06:00 Amsterdam).
                        <br />
                        <code style={{ fontSize: '0.85em' }}>team-roles.json</code> is not part of the FTP sync — update it in
                        the repo when Discord roles change.
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 7 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.06 }}>
                        Links
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
                        <Button
                          component="a"
                          href={liveSiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                        >
                          This site
                        </Button>
                        <Button
                          component="a"
                          href={TEAM_PUBLIC_SITE}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                        >
                          Production
                        </Button>
                        <Button
                          component="a"
                          href={TEAM_GITHUB_REPO}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                        >
                          GitHub
                        </Button>
                        <Button
                          component="a"
                          href={`${TEAM_GITHUB_REPO}/actions`}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                        >
                          Actions
                        </Button>
                        <Button
                          component="a"
                          href={TEAM_DISCORD}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_EXTERNAL_LINK_OUTLINED_SX }}
                        >
                          Discord
                        </Button>
                        <Button
                          component="a"
                          href={TEAM_GAME_SERVER_JOIN}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...ADMIN_JOIN_SERVER_OUTLINED_SX }}
                        >
                          Join game server
                        </Button>
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.25 }}>
                        App {CONFIG.appVersion} · same data as the rest of this page
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Stack>
            </PreviewLock>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
