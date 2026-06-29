import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useAdminLiveData } from 'src/lib/admin/use-admin-live-data';
import { getTrackDisplayName } from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  GLASS_INNER_PANEL_SX,
  GLASS_PANEL_COMPACT_SX,
  GLASS_TABLE_CONTAINER_SX,
} from 'src/lib/glass';
import {
  acSessionTypeLabel,
  AC_SESSION_TYPE_RACE,
  acCurrentSessionLabel,
  formatTimeLeftSeconds,
  formatSessionDurationsLine,
  sanitizeServerLobbyDisplayName,
  shouldAppendReversedGridRaceHint,
} from 'src/lib/server-info';
import type { CurrentTrackPayload } from 'src/lib/server-status';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';

// ---------------------------------------------------------------------------
// Schedule data
// ---------------------------------------------------------------------------

type ScheduleKind = 'recurring' | 'chained' | 'deploy';

type ScheduleEntry = {
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
    agendaWhen: ':00, :30',
    agendaSub: 'Every 30 minutes · UTC',
    kind: 'recurring',
    workflow: 'Ranking sync (KMR)',
    cron: '0,30 * * * *',
    what: 'Downloads the latest driver list and leaderboard from KMR so the website matches the league.',
    chain: 'Then: daily 24h snapshot → publish website',
  },
  {
    agendaWhen: ':05',
    agendaSub: 'Every hour · UTC',
    kind: 'recurring',
    workflow: 'Hourly server backup file',
    cron: '5 * * * *',
    what: 'Once an hour, checks if the game lobby or track changed. If so, saves a backup copy the website can fall back on. Slower than the live check below.',
  },
  {
    agendaWhen: '≈1 min',
    agendaSub: 'External scheduler · hosted service',
    kind: 'recurring',
    workflow: 'Live server check',
    cron: 'Your external cron schedule (e.g. every minute)',
    what: 'Checks the AC Elite server often so the site can show who is online, which track is running, and session info without waiting for the hourly backup.',
  },
  {
    agendaWhen: ':00, :15, :30, :45',
    agendaSub: 'Every 15 minutes · Supabase cron',
    kind: 'recurring',
    workflow: 'Session results sync',
    cron: '*/15 * * * *',
    what: 'Reads new result files from the AC server and adds sessions to the Results page (Supabase `sessions` table).',
  },
  {
    agendaWhen: 'After sync',
    agendaSub: 'Not before 06:00 Amsterdam · once per day',
    kind: 'chained',
    workflow: 'Daily 24h ranking snapshot',
    cron: 'workflow_run (after Sync KMR)',
    what: 'Saves a “yesterday style” copy of the rankings used for 24-hour stats. Waits until after 06:00 Amsterdam time and runs at most once per day.',
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

function formatAdminTimeleft(sec: number | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '—';
  if (sec < 0) return `${sec}s`;
  return formatTimeLeftSeconds(sec);
}

function buildAdminServerInfoRows(
  ct: CurrentTrackPayload | null
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (!ct) {
    rows.push({ label: 'Payload', value: 'No current track loaded yet.' });
    return rows;
  }
  rows.push({
    label: 'Snapshot (fetched_at)',
    value: ct.fetchedAt ? `${formatAbsolute(ct.fetchedAt)} · ${formatRelative(ct.fetchedAt)}` : '—',
  });
  rows.push({ label: 'Online (row)', value: ct.online ? 'Yes' : 'No' });
  rows.push({ label: 'Track ID (row)', value: ct.track?.trim() ? ct.track : '—' });

  const info = ct.info;
  if (!info || typeof info !== 'object') {
    rows.push({
      label: '/INFO',
      value:
        'No lobby detail on this snapshot yet — try again shortly or open the live server link.',
    });
    return rows;
  }

  if (typeof info.name === 'string' && info.name.trim()) {
    rows.push({ label: 'Lobby name (display)', value: sanitizeServerLobbyDisplayName(info.name) });
    rows.push({ label: 'Lobby name (raw)', value: info.name });
  }

  const clients =
    typeof info.clients === 'number' && Number.isFinite(info.clients) ? info.clients : null;
  const maxc =
    typeof info.maxclients === 'number' && Number.isFinite(info.maxclients)
      ? info.maxclients
      : null;
  rows.push({
    label: 'Clients / max',
    value:
      clients != null && maxc != null
        ? `${clients} / ${maxc}`
        : `${fmtAdminScalar(info.clients)} / ${fmtAdminScalar(info.maxclients)}`,
  });

  if (
    typeof info.track === 'string' &&
    info.track.trim() &&
    info.track.trim() !== ct.track?.trim()
  ) {
    rows.push({ label: 'Track ID (/INFO)', value: info.track });
  }

  rows.push({
    label: 'Cars',
    value: Array.isArray(info.cars) && info.cars.length ? info.cars.join(', ') : '—',
  });
  rows.push({
    label: 'Ports',
    value: `cport ${fmtAdminScalar(info.cport)} · game ${fmtAdminScalar(info.port)} · query ${fmtAdminScalar(info.tport)}`,
  });
  rows.push({
    label: 'IP (server)',
    value: typeof info.ip === 'string' && info.ip.trim() ? info.ip : '(empty)',
  });

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
    value:
      formatSessionDurationsLine(info.sessiontypes, info.durations, info.timed, scheduleHints) ??
      '—',
  });

  if (Array.isArray(info.sessiontypes) && Array.isArray(info.durations)) {
    const n = Math.min(info.sessiontypes.length, info.durations.length);
    const parts: string[] = [];
    const doubleRevRace = shouldAppendReversedGridRaceHint(
      info.sessiontypes,
      info.timed,
      scheduleHints
    );
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
  rows.push({
    label: 'Country (geo)',
    value: Array.isArray(info.country) && info.country.length ? info.country.join(', ') : '—',
  });
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
    rows.push({
      label: `Other: ${key}`,
      value: fmtAdminScalar((info as Record<string, unknown>)[key]),
    });
  }

  return rows;
}

const FRESHNESS_ROW_BORDER = '1px solid rgba(148,163,184,0.1)';
const freshnessBodyCellSx = {
  borderBottom: FRESHNESS_ROW_BORDER,
  py: { xs: 1.1, md: 0.8 },
  verticalAlign: 'top' as const,
};

export default function Page() {
  useTrackCatalogVersion();
  const data = useAdminLiveData();

  const adminServerDetailRows = useMemo(
    () => buildAdminServerInfoRows(data.currentTrack),
    [data.currentTrack]
  );

  return (
    <AdminPageShell
      title="Server"
      description="Lobby state, every raw field the AC server reports, and when automated jobs run."
      documentTitle="Admin · Server"
    >
      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'center', sm: 'center' }}
          spacing={1}
          sx={{ mb: 1.5, textAlign: { xs: 'center', sm: 'left' } }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              AC Elite server status
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
              Is the lobby up, which track is loaded, and how many drivers are connected — same idea
              players see on the homepage card.
            </Typography>
          </Box>
          <Chip
            size="small"
            label={data.currentTrack?.online ? 'Online' : 'Offline'}
            sx={{
              fontWeight: 800,
              color: data.currentTrack?.online ? '#22c55e' : '#f59e0b',
              bgcolor: data.currentTrack?.online ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              border: data.currentTrack?.online
                ? '1px solid rgba(34,197,94,0.45)'
                : '1px solid rgba(245,158,11,0.45)',
            }}
          />
        </Stack>
        <Grid container spacing={1.25}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Track
              </Typography>
              <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                {data.currentTrack?.track?.trim()
                  ? getTrackDisplayName(data.currentTrack.track)
                  : '—'}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Drivers
              </Typography>
              <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                {data.currentTrack?.info?.clients ?? '—'} /{' '}
                {data.currentTrack?.info?.maxclients ?? '—'}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Session
              </Typography>
              <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                {data.currentTrack?.info ? acCurrentSessionLabel(data.currentTrack.info) : '—'}
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.35 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Updated
              </Typography>
              <Typography sx={{ fontWeight: 800, mt: 0.25 }}>
                {data.currentTrack?.fetchedAt
                  ? formatRelative(data.currentTrack.fetchedAt)
                  : 'Unknown'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(2) }}>
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Server lobby (raw fields)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            Every field the AC server reports. Useful when something looks off in the cards above
            and you want to see the raw value.
          </Typography>
        </Box>
        <TableContainer sx={{ ...GLASS_TABLE_CONTAINER_SX, maxHeight: 400, borderRadius: 1 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 800,
                    width: { xs: 220, sm: 240 },
                    bgcolor: 'rgba(255,255,255,0.012)',
                  }}
                >
                  Field
                </TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.012)' }}>
                  Value
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adminServerDetailRows.map((row, idx) => (
                <TableRow key={`${row.label}-${idx}`}>
                  <TableCell
                    sx={{ ...freshnessBodyCellSx, color: 'text.secondary', fontWeight: 700 }}
                  >
                    {row.label}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...freshnessBodyCellSx,
                      fontFamily:
                        row.value.length > 120
                          ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
                          : 'inherit',
                      fontSize: '0.8125rem',
                      wordBreak: 'break-word',
                      minWidth: 0,
                    }}
                  >
                    {row.value}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(3) }}>
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Background schedule
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            When automated jobs run, in plain language. Handy for figuring out why data on the site
            might still look old.
          </Typography>
        </Box>
        <Stack spacing={1}>
          {SCHEDULE.map((entry) => (
            <Box key={entry.workflow} sx={{ ...GLASS_INNER_PANEL_SX, py: 1.2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                {entry.workflow}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
              >
                {entry.agendaWhen} · {entry.agendaSub} · {entry.cron}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', mt: 0.65, lineHeight: 1.5 }}
              >
                {entry.what}
              </Typography>
              {entry.chain && (
                <Typography
                  variant="caption"
                  sx={{ color: 'rgba(191,219,254,0.95)', display: 'block', mt: 0.5 }}
                >
                  {entry.chain}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Paper>
    </AdminPageShell>
  );
}
