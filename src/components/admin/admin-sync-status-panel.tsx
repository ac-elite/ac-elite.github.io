import { useState, useEffect, useCallback } from 'react';

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

import { GLASS_PANEL_COMPACT_SX, GLASS_TABLE_CONTAINER_SX } from 'src/lib/glass';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { TABLE_HEAD_MUTED_COLOR } from 'src/lib/page-shell';
import { getSyncHealth, formatTimeAgo } from 'src/lib/sync-utils';
import {
  fetchAdminSyncStatus,
  type AdminSyncStatus,
  type SyncServiceStatus,
} from 'src/lib/admin/sync-status';

type Verdict = { label: string; color: string };

/** What the *site* is actually serving right now for this feed. */
function siteSourceVerdict(service: SyncServiceStatus): Verdict {
  if (service.siteOnBackup) {
    return { label: 'ON BACKUP', color: '#ef4444' };
  }
  if (service.live.status === 'error') {
    return { label: 'LIVE · last sync failed', color: '#f59e0b' };
  }
  const health = getSyncHealth(service.live.at ?? undefined, 'liveFeed');
  if (health.label !== 'Live') {
    return { label: `LIVE · ${health.label.toLowerCase()}`, color: health.color };
  }
  return { label: 'LIVE', color: '#22c55e' };
}

const CELL_BORDER = '1px solid rgba(148,163,184,0.1)';
const bodyCellSx = { borderBottom: CELL_BORDER, py: 1.35, verticalAlign: 'top' as const };

function ServiceRow({ feed, service }: { feed: string; service: SyncServiceStatus }) {
  const health = getSyncHealth(service.live.at ?? undefined, 'liveFeed');
  const verdict = siteSourceVerdict(service);

  return (
    <TableRow
      sx={{
        '&:last-of-type td': { borderBottom: 'none' },
        borderLeft: '3px solid',
        borderLeftColor: verdict.color,
      }}
    >
      <TableCell sx={{ ...bodyCellSx, pl: 1.5, color: 'text.primary', fontWeight: 700 }}>
        {feed}
      </TableCell>

      <TableCell sx={{ ...bodyCellSx }}>
        {service.live.reachable ? (
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={health.label}
                sx={{
                  height: 22,
                  fontWeight: 800,
                  fontSize: '0.68rem',
                  color: health.color,
                  bgcolor: `${health.color}1a`,
                  border: `1px solid ${health.color}66`,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {health.ageText}
              </Typography>
            </Stack>
            {service.live.detail && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {service.live.detail}
              </Typography>
            )}
            {service.live.error && (
              <Typography variant="caption" sx={{ color: '#fca5a5', overflowWrap: 'anywhere' }}>
                Error: {service.live.error}
              </Typography>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: '#fca5a5' }}>
            Supabase unreachable
          </Typography>
        )}
      </TableCell>

      <TableCell sx={{ ...bodyCellSx, color: 'text.secondary' }}>
        <Typography variant="caption">{formatTimeAgo(service.backupAt ?? undefined)}</Typography>
      </TableCell>

      <TableCell sx={{ ...bodyCellSx }}>
        <Chip
          size="small"
          label={verdict.label}
          sx={{
            height: 22,
            fontWeight: 800,
            fontSize: '0.68rem',
            color: verdict.color,
            bgcolor: `${verdict.color}1a`,
            border: `1px solid ${verdict.color}66`,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </TableCell>
    </TableRow>
  );
}

export function AdminSyncStatusPanel({ motionIndex = 2 }: { motionIndex?: number }) {
  const [status, setStatus] = useState<AdminSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminSyncStatus();
    setStatus(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetchAdminSyncStatus().then((result) => {
      if (mounted) {
        setStatus(result);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Paper
      sx={{
        ...GLASS_PANEL_COMPACT_SX,
        ...brandAccentBorderSx(),
        ...glassCardMotionSx(motionIndex),
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'center', sm: 'center' }}
        spacing={1}
        sx={{ textAlign: { xs: 'center', sm: 'left' } }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Live data services
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            Realtime Supabase sync vs the GitHub Actions backup. When &ldquo;Site source&rdquo;
            shows <strong>ON BACKUP</strong>, the live sync is down and the site is serving the
            Actions data. A long all-green streak means the Actions are safe to retire.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Stack>

      <TableContainer
        sx={{
          ...GLASS_TABLE_CONTAINER_SX,
          mt: 1.5,
          maxWidth: '100%',
          overflowX: 'auto',
          borderRadius: 2,
        }}
      >
        <Table size="small" sx={{ borderCollapse: 'separate', borderSpacing: 0, minWidth: 720 }}>
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
              <TableCell sx={{ width: { xs: 150, sm: 190 } }}>Feed</TableCell>
              <TableCell sx={{ width: { xs: 220, sm: 280 } }}>Live sync (Supabase)</TableCell>
              <TableCell sx={{ width: { xs: 130, sm: 150 } }}>Backup (GitHub)</TableCell>
              <TableCell sx={{ width: { xs: 150, sm: 180 } }}>Site source</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {status && (
              <>
                <ServiceRow feed="KMR rank & leaderboard" service={status.kmr} />
                <ServiceRow feed="Live server status" service={status.server} />
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
