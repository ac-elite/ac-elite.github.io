import { useState } from 'react';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { GLASS_PANEL_COMPACT_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { TABLE_HEAD_MUTED_COLOR } from 'src/lib/page-shell';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';

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
    stepsBeforeSnippet: ['Click the address bar and put the cursor at the very end of the URL.'],
    stepsAfterSnippet: [
      'Copy the entire line in the grey box above, paste it at the end of the URL, then press Enter.',
      'Open Developer tools (F12 on many browsers) → Console tab.',
      'Look for lines starting with [server-status].',
    ],
    turnOff: 'Remove the extra text from the address bar when you are done.',
  },
] as const;

const DEBUG_TECH_REFERENCE = [
  { title: 'Pretend server offline', env: '—', query: 'serverOfflineDebug', storageKey: '—', values: '1, true, yes, on' },
  { title: 'Force current track in UI', env: '—', query: 'currentTrackMock', storageKey: '—', values: 'track id, e.g. spa / monza / ks_laguna_seca' },
  { title: 'Verbose server-status logging', env: '—', query: 'serverStatusDebug', storageKey: '—', values: '1, true, yes' },
] as const;

const FRESHNESS_ROW_BORDER = '1px solid rgba(148,163,184,0.1)';
const freshnessBodyCellSx = { borderBottom: FRESHNESS_ROW_BORDER, py: 1.35, verticalAlign: 'top' as const };

export default function Page() {
  const [debugTechOpen, setDebugTechOpen] = useState(false);

  return (
    <AdminPageShell
      title="Debug"
      description="Optional URL switches to preview special site states. Nothing here changes the real server or data."
      documentTitle="Admin · Debug"
    >
      <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(1) }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Try things in your browser
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
          You never have to use this section. It is only for checking how the site looks in special cases. Nothing here changes the real stuff.
        </Typography>
        <Stack spacing={2}>
          {DEBUG_QUICK_TRIES.map((block) => (
            <Box key={block.key} sx={{ ...GLASS_INNER_PANEL_SX, py: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{block.title}</Typography>
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
                    background: 'linear-gradient(180deg, rgba(36,52,88,0.92) 0%, rgba(24,35,58,0.88) 100%)',
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
    </AdminPageShell>
  );
}
