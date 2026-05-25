import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useAdminLiveData } from 'src/lib/admin/use-admin-live-data';
import { getSyncHealth, type SyncHealthProfile } from 'src/lib/sync-utils';
import { SERVER_ENDPOINTS } from 'src/centralized/server-endpoints';
import { SITE_REPO_URL } from 'src/centralized/site-urls';
import { getTrackDisplayName } from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_INLINE_CODE_SX, GLASS_PANEL_COMPACT_SX, GLASS_TABLE_CONTAINER_SX } from 'src/lib/glass';
import {
  TABLE_HEAD_MUTED_COLOR,
  ADMIN_JOIN_SERVER_OUTLINED_SX,
  ADMIN_EXTERNAL_LINK_OUTLINED_SX,
} from 'src/lib/page-shell';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';
import { AdminSyncStatusPanel } from 'src/components/admin/admin-sync-status-panel';
import { SiteVisitsShowcase } from 'src/components/site-visits-showcase/site-visits-showcase';
import {
  fetchSiteVisitCount,
  type SitePageVisitRow,
  isSiteVisitsConfigured,
  fetchSitePageVisitCounts,
} from 'src/lib/site-visits';

import type { AdminLiveData } from 'src/lib/admin/use-admin-live-data';

// ---------------------------------------------------------------------------
// Data files we track
// ---------------------------------------------------------------------------

type DataFileEntry = {
  file: string;
  updatedBy: string;
  getTimestamp: (s: AdminLiveData) => string | undefined;
  getNote?: (s: AdminLiveData) => string;
  syncHealthProfile?: SyncHealthProfile;
};

const DATA_FILES: readonly DataFileEntry[] = [
  {
    file: 'metadata.json',
    updatedBy: 'Ranking sync (KMR)',
    getTimestamp: (s) => s.metadata?.lastSync,
    syncHealthProfile: 'liveFeed',
    getNote: (s) => (s.metadata?.status === 'success' ? 'Last run reported success' : s.metadata?.status ?? ''),
  },
  {
    file: 'current-track.json',
    updatedBy: 'AC Elite server (live check + hourly backup)',
    getTimestamp: (s) => s.currentTrack?.fetchedAt,
    syncHealthProfile: 'liveFeed',
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
    syncHealthProfile: 'liveFeed',
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
    syncHealthProfile: 'liveFeed',
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

const FRESHNESS_ROW_BORDER = '1px solid rgba(148,163,184,0.1)';
const freshnessBodyCellSx = {
  borderBottom: FRESHNESS_ROW_BORDER,
  py: 1.35,
  verticalAlign: 'top' as const,
};

export default function Page() {
  useTrackCatalogVersion();
  const data = useAdminLiveData();

  const siteVisitsConfigured = isSiteVisitsConfigured();
  const [visitPhase, setVisitPhase] = useState<'off' | 'loading' | 'ready' | 'error'>(() =>
    siteVisitsConfigured ? 'loading' : 'off'
  );
  const [visitCount, setVisitCount] = useState<number | undefined>(undefined);
  const [visitPageRows, setVisitPageRows] = useState<SitePageVisitRow[] | undefined>(undefined);

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
    <AdminPageShell
      title="Overview"
      description="Quick checks for the team: is public data up to date, where to dig deeper if something looks wrong."
    >
      <Box sx={{ ...glassCardMotionSx(1) }}>
        <SiteVisitsShowcase
          phase={visitPhase}
          count={visitCount}
          configured={siteVisitsConfigured}
          pageRows={visitPageRows}
          onRefresh={refreshSiteVisits}
        />
      </Box>

      <AdminSyncStatusPanel motionIndex={2} />

      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(3) }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Data freshness
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4, mb: 1 }}>
          Each row is one file the website reads. If something looks old, note the time and tell a tech lead which row it was.
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', mb: data.metadata?.error ? 1 : 2, lineHeight: 1.55, maxWidth: 900 }}
        >
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
            ...GLASS_TABLE_CONTAINER_SX,
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            borderRadius: 2,
          }}
        >
          <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 980, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow
                sx={{
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
                    '&:nth-of-type(even)': { bgcolor: 'rgba(255,255,255,0.022)' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
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
                        ...GLASS_INLINE_CODE_SX,
                        borderRadius: 1,
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

      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(4) }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Quick links</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
              Jump to the live server status page, recent automation runs, or join the server in Content Manager.
            </Typography>
          </Box>
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
      </Paper>
    </AdminPageShell>
  );
}
