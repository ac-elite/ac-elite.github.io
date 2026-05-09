import type { ReactNode } from 'react';
import type { AcServerInfo } from 'src/lib/server-info';
import type { Theme, SxProps } from '@mui/material/styles';
import type { CurrentTrackPayload } from 'src/lib/server-status';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { GLASS_PADDING } from 'src/lib/glass';
import { SERVER_ENDPOINTS } from 'src/centralized/server-endpoints';
import { formatTimeAgo } from 'src/lib/sync-utils';
import { BRAND_ACCENT } from 'src/lib/status-accent';
import { getTrackHeroImageOffsetY, getTrackHeroImageSrc } from 'src/lib/track-hero';
import { softFloatWrapperSx } from 'src/lib/subtle-motion';
import { getTrackDisplayName, normalizeServerTrackId } from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import {
  acCurrentSessionLabel,
  formatTimeLeftSeconds,
  formatSessionDurationsLine,
  sanitizeServerLobbyDisplayName,
} from 'src/lib/server-info';

/** Content Manager deep link (same host/query as admin / workflows). */
export const AC_ELITE_SERVER_JOIN_HREF = SERVER_ENDPOINTS.join;

/** Zelfde accent als `brandAccentBorderSx()` / glass panels (geen lime LFM-kleur). */
const ACCENT = BRAND_ACCENT;
const ACCENT_SOFT = 'rgba(147, 197, 253, 0.14)';
const ACCENT_BORDER = 'rgba(147, 197, 253, 0.42)';
const ACCENT_BORDER_STRONG = 'rgba(147, 197, 253, 0.58)';
const ACCENT_INNER = 'rgba(147, 197, 253, 0.09)';
const ACCENT_GLOW = 'rgba(147, 197, 253, 0.11)';

const badgeSx = {
  height: 20,
  fontSize: '0.64rem',
  fontWeight: 800,
  borderRadius: 1,
  '& .MuiChip-label': { px: 0.8 },
} as const;

const infoBlockSx = {
  borderRadius: 1.1,
  px: { xs: 1, md: 0.75 },
  /** Equal top/bottom padding; inner Stack uses fixed gap + lineHeight so content looks balanced. */
  py: { xs: 1.5, md: 1.15 },
  bgcolor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: 0,
} as const;

const infoLabelSx = {
  color: 'rgba(255,255,255,0.55)',
  lineHeight: 1.2,
} as const;

const infoValueSx = {
  fontWeight: 800,
  lineHeight: 1.25,
  fontSize: { xs: '0.875rem', md: '0.8125rem' },
} as const;

function ServerInfoBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={infoBlockSx}>
      <Stack spacing={0.55} sx={{ width: '100%' }}>
        <Typography variant="caption" sx={infoLabelSx}>
          {label}
        </Typography>
        {children}
      </Stack>
    </Box>
  );
}

export type ServerJoinCardProps = {
  currentTrack: CurrentTrackPayload | null;
  joinHref?: string;
  sx?: SxProps<Theme>;
};

/** Minstens één veld uit /INFO dat we echt kunnen tonen (lege `{}` telt niet mee). */
function hasLiveSessionMetrics(info: AcServerInfo | null | undefined): boolean {
  if (!info || typeof info !== 'object') return false;
  if (typeof info.clients === 'number' && Number.isFinite(info.clients)) return true;
  if (typeof info.maxclients === 'number' && Number.isFinite(info.maxclients)) return true;
  if (Array.isArray(info.sessiontypes) && info.sessiontypes.length > 0) return true;
  if (Array.isArray(info.cars) && info.cars.length > 0) return true;
  return false;
}

function formatSessionKicker(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d
    .toLocaleString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .toUpperCase();
}

/** Minimal "arrow into bracket" join mark (no extra icon package). */
function JoinGlyphIcon() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden
      sx={{ width: 20, height: 20, display: 'block', color: ACCENT }}
    >
      <path
        fill="currentColor"
        d="M14 4h6v16h-6v-2h4V6h-4V4zM4 12l6 5v-3h6v-4h-6V9L4 12z"
      />
    </Box>
  );
}

export function ServerJoinCard({ currentTrack, joinHref = AC_ELITE_SERVER_JOIN_HREF, sx }: ServerJoinCardProps) {
  useTrackCatalogVersion();
  const online = Boolean(currentTrack?.online);
  /** When offline, do not surface merged static fallback (last track / lobby) — card must read as down. */
  const rawTrack = online ? (currentTrack?.track?.trim() ?? '') : '';
  const fetchedAt = currentTrack?.fetchedAt;
  const info = online ? currentTrack?.info : undefined;
  const liveDataAvailable = Boolean(online && fetchedAt && hasLiveSessionMetrics(info));
  const trackTitle = !online
    ? 'Server offline'
    : rawTrack
      ? getTrackDisplayName(normalizeServerTrackId(rawTrack))
      : 'No session';
  const updatedLine = fetchedAt ? `Updated ${formatTimeAgo(fetchedAt)}` : '—';
  const updatedTitle = formatSessionKicker(fetchedAt);

  const clients = typeof info?.clients === 'number' ? info.clients : null;
  const maxclients = typeof info?.maxclients === 'number' ? info.maxclients : null;
  const slotsLabel = !online
    ? '—'
    : liveDataAvailable
      ? clients != null && maxclients != null
        ? `${clients} / ${maxclients}`
        : clients != null
          ? `${clients}`
          : '-'
      : 'Data unavailable';
  const cars = Array.isArray(info?.cars)
    ? (info.cars as unknown[]).filter((c): c is string => typeof c === 'string' && Boolean(c))
    : [];

  const phase = acCurrentSessionLabel(info);
  const timeLeft = formatTimeLeftSeconds(info?.timeleft);
  const schedule = formatSessionDurationsLine(info?.sessiontypes, info?.durations, info?.timed, {
    inverted: typeof info?.inverted === 'number' ? info.inverted : undefined,
    lobbyName: typeof info?.name === 'string' ? info.name : undefined,
  });

  const phaseSummary = !online
    ? '—'
    : liveDataAvailable
      ? [phase, timeLeft].filter((v) => v && v !== '-').join(' · ') || '-'
      : 'Data unavailable';

  const rawLobbyName = typeof info?.name === 'string' ? info.name.trim() : '';
  const lobbyName = rawLobbyName ? sanitizeServerLobbyDisplayName(rawLobbyName) : '';

  const heroSrc = rawTrack ? getTrackHeroImageSrc(rawTrack) : null;
  const heroOffsetY = rawTrack ? getTrackHeroImageOffsetY(rawTrack) : 0;
  const cardBackground = heroSrc
    ? undefined
    : `linear-gradient(180deg, rgba(16,18,25,0.98) 0%, rgba(10,12,17,0.98) 100%), radial-gradient(circle at 88% 5%, ${ACCENT_GLOW}, transparent 45%)`;

  return (
    <Box sx={softFloatWrapperSx()}>
      <Box
        sx={{
          width: '100%',
          borderRadius: 2,
          border: `1px solid ${online ? ACCENT_BORDER : 'rgba(148,163,184,0.38)'}`,
          background: cardBackground,
          boxShadow: `0 14px 30px rgba(0,0,0,0.4), inset 0 0 0 1px ${online ? ACCENT_INNER : 'rgba(148,163,184,0.08)'}`,
          overflow: 'hidden',
          ...sx,
        }}
      >
        <Box sx={{ position: 'relative', lineHeight: 0, overflow: 'hidden' }}>
          {heroSrc ? (
            <Box
              component="img"
              src={heroSrc}
              alt=""
              width={800}
              height={450}
              sx={{
                width: '100%',
                height: { xs: 148, sm: 168 },
                objectFit: 'cover',
                objectPosition: heroOffsetY === 0 ? 'center' : `center calc(50% + ${heroOffsetY}px)`,
                display: 'block',
              }}
            />
          ) : (
            <Box
              aria-hidden
              sx={{
                width: '100%',
                height: { xs: 148, sm: 168 },
                background:
                  'radial-gradient(circle at 85% 10%, rgba(147, 197, 253, 0.12), transparent 45%), linear-gradient(180deg, rgba(16,20,32,0.92) 0%, rgba(10,14,24,0.95) 100%), repeating-linear-gradient(0deg, rgba(148,163,184,0.08) 0px, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(148,163,184,0.08) 0px, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 28px)',
              }}
            />
          )}
          <Box
            aria-hidden
            sx={{
              pointerEvents: 'none',
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(10,12,17,0.05) 0%, rgba(10,12,17,0.55) 55%, rgba(10,12,17,0.96) 100%)',
            }}
          />
        </Box>

        <Stack
          spacing={1.75}
          sx={{
            /** Same gutter as {@link GLASS_PANEL_SX} / Race Intelligence — one token for all glass cards. */
            p: GLASS_PADDING.panel,
            bgcolor: heroSrc ? 'rgba(12,14,20,0.98)' : 'transparent',
          }}
        >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700, letterSpacing: 0.5 }}>
            AC ELITE SERVER
          </Typography>
          <Chip
            size="small"
            label={online ? 'ONLINE' : 'OFFLINE'}
            sx={{
              ...badgeSx,
              bgcolor: online ? ACCENT_SOFT : 'rgba(148,163,184,0.18)',
              color: online ? ACCENT : 'rgba(203,213,225,0.9)',
              border: `1px solid ${online ? ACCENT_BORDER : 'rgba(148,163,184,0.35)'}`,
            }}
          />
        </Stack>

        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
          {trackTitle}
        </Typography>
        <Typography
          variant="caption"
          title={updatedTitle !== '-' ? updatedTitle : undefined}
          sx={{ color: 'rgba(255,255,255,0.56)', fontWeight: 600, letterSpacing: 0.06 }}
        >
          {updatedLine}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            color: 'rgba(255,255,255,0.88)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            lineHeight: 1.35,
            minHeight: 38,
          }}
          title={lobbyName || undefined}
        >
          {!online
            ? 'No live lobby while the server is down.'
            : lobbyName
              ? lobbyName
              : liveDataAvailable
                ? 'AC Elite official server'
                : 'Live data unavailable'}
        </Typography>

        <Grid container spacing={0.85}>
          <Grid size={{ xs: 6, md: 2 }} sx={{ minWidth: 0 }}>
            <ServerInfoBlock label="Players">
              <Typography variant="body2" sx={infoValueSx} noWrap title={slotsLabel}>
                {slotsLabel}
              </Typography>
            </ServerInfoBlock>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }} sx={{ minWidth: 0 }}>
            <ServerInfoBlock label="Phase">
              <Typography variant="body2" sx={infoValueSx} noWrap title={phaseSummary}>
                {phaseSummary}
              </Typography>
            </ServerInfoBlock>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }} sx={{ minWidth: 0 }}>
            <ServerInfoBlock label="Cars">
              <Typography variant="body2" sx={infoValueSx} noWrap title={cars.join(', ')}>
                {!online ? '—' : liveDataAvailable ? (cars.length ? cars.join(', ') : '-') : 'Data unavailable'}
              </Typography>
            </ServerInfoBlock>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} sx={{ minWidth: 0 }}>
            <ServerInfoBlock label="Schedule">
              <Typography variant="body2" sx={infoValueSx} noWrap title={schedule ?? '-'}>
                {!online ? '—' : liveDataAvailable ? (schedule ?? '-') : 'Data unavailable'}
              </Typography>
            </ServerInfoBlock>
          </Grid>
        </Grid>

        <Button
          component="a"
          href={joinHref}
          target="_blank"
          rel="noreferrer"
          fullWidth
          size="small"
          aria-label="Join official server in Content Manager"
          startIcon={<JoinGlyphIcon />}
          sx={{
            minHeight: 40,
            borderRadius: 1.2,
            border: `1px solid ${ACCENT_BORDER_STRONG}`,
            bgcolor: ACCENT_SOFT,
            color: ACCENT,
            fontWeight: 800,
            '& .MuiButton-startIcon': { mr: 0.75 },
            '&:hover': {
              bgcolor: 'rgba(147, 197, 253, 0.22)',
              borderColor: 'rgba(147, 197, 253, 0.72)',
            },
          }}
        >
          Join in Content Manager
        </Button>
        </Stack>
      </Box>
    </Box>
  );
}
