import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import type { AcServerInfo } from 'src/lib/server-info';
import type { Theme, SxProps } from '@mui/material/styles';
import type { CurrentTrackPayload } from 'src/lib/server-status';

import {
  GLASS_PADDING,
  GLASS_PANEL_SX,
  GLASS_BOXJE_RIM_SHADOW,
  GLASS_BOXJE_RIM_SHADOW_HOVER,
} from 'src/lib/glass';
import { SERVER_ENDPOINTS } from 'src/centralized/server-endpoints';
import { formatTimeAgo } from 'src/lib/sync-utils';
import { BRAND_ACCENT } from 'src/lib/status-accent';
import { getTrackHeroImageSrc, getTrackHeroImageOffsetY } from 'src/lib/track-hero';
import { softFloatWrapperSx } from 'src/lib/subtle-motion';
import { getTrackDisplayName, normalizeServerTrackId } from 'src/lib/ac-elite-data';
import { useTrackCatalogVersion } from 'src/centralized/track-info';
import {
  acCurrentSessionLabel,
  formatTimeLeftSeconds,
  formatSessionDurationsLine,
  sanitizeServerLobbyDisplayName,
} from 'src/lib/server-info';

import { RaceLoader } from 'src/components/race-loader';

export const AC_ELITE_SERVER_JOIN_HREF = SERVER_ENDPOINTS.join;

const ACCENT = BRAND_ACCENT;
const EMPTY = '-';
const CAR_NAME_OVERRIDES: Record<string, string> = {
  tatuusfa1: 'Tatuus FA1',
};
const CAR_NAME_ACRONYMS = new Set([
  'gt',
  'gt2',
  'gt3',
  'gt4',
  'dtm',
  'fa1',
  'f1',
  'rsr',
  'amg',
  'r8',
]);

const statusCopy = {
  loading: { label: 'SYNCING', color: '#93c5fd', bg: 'rgba(147,197,253,0.15)' },
  online: { label: 'ONLINE', color: '#7dd3fc', bg: 'rgba(14,165,233,0.14)' },
  offline: { label: 'OFFLINE', color: 'rgba(226,232,240,0.84)', bg: 'rgba(148,163,184,0.16)' },
} as const;

function hasLiveSessionMetrics(info: AcServerInfo | null | undefined): boolean {
  if (!info || typeof info !== 'object') return false;
  if (typeof info.clients === 'number' && Number.isFinite(info.clients)) return true;
  if (typeof info.maxclients === 'number' && Number.isFinite(info.maxclients)) return true;
  if (Array.isArray(info.sessiontypes) && info.sessiontypes.length > 0) return true;
  if (Array.isArray(info.cars) && info.cars.length > 0) return true;
  return false;
}

function formatSessionKicker(iso?: string): string {
  if (!iso) return EMPTY;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return EMPTY;
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

function isUsefulValue(value: string | null | undefined): value is string {
  if (!value) return false;
  return value !== '-' && value !== '—' && value !== 'â€”';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatCarName(raw: string): string {
  const value = raw.trim();
  if (!value) return EMPTY;

  const override = CAR_NAME_OVERRIDES[value.toLowerCase()];
  if (override) return override;

  return value
    .replace(/^ks_/i, '')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      if (CAR_NAME_ACRONYMS.has(lower) || /^\d+[a-z]*$/i.test(part)) {
        return part.toUpperCase();
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function TelemetryCell({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <Box
      sx={{
        minWidth: 0,
        py: 1.05,
        px: { xs: 1, sm: 1.15 },
        borderRight: '1px solid rgba(226,242,255,0.1)',
        borderBottom: '1px solid rgba(226,242,255,0.1)',
        '&:nth-of-type(2n)': {
          borderRight: 'none',
        },
        '&:nth-of-type(n+3)': {
          borderBottom: 'none',
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'rgba(226,232,240,0.54)',
          fontWeight: 800,
          lineHeight: 1.15,
          textTransform: 'uppercase',
          fontSize: '0.64rem',
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        title={title ?? value}
        noWrap
        sx={{
          mt: 0.45,
          color: '#fff',
          fontWeight: 900,
          lineHeight: 1.2,
          fontSize: 'clamp(0.78rem, 0.69rem + 0.34vw, 0.92rem)',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export type ServerJoinCardProps = {
  currentTrack: CurrentTrackPayload | null;
  joinHref?: string;
  loading?: boolean;
  sx?: SxProps<Theme>;
};

export function ServerJoinCard({
  currentTrack,
  joinHref = AC_ELITE_SERVER_JOIN_HREF,
  loading = false,
  sx,
}: ServerJoinCardProps) {
  useTrackCatalogVersion();

  const online = !loading && Boolean(currentTrack?.online);
  const rawTrack = online ? (currentTrack?.track?.trim() ?? '') : '';
  const fetchedAt = currentTrack?.fetchedAt;
  const info = online ? currentTrack?.info : undefined;
  const liveDataAvailable = Boolean(online && fetchedAt && hasLiveSessionMetrics(info));

  const heroSrc = rawTrack ? getTrackHeroImageSrc(rawTrack) : null;
  const heroOffsetY = rawTrack ? getTrackHeroImageOffsetY(rawTrack) : 0;

  const trackTitle = loading
    ? 'Checking server'
    : !online
      ? 'Server offline'
      : rawTrack
        ? getTrackDisplayName(normalizeServerTrackId(rawTrack))
        : 'Session pending';
  const updatedLine = loading
    ? 'Reading live status'
    : fetchedAt
      ? `Updated ${formatTimeAgo(fetchedAt)}`
      : 'Awaiting timing';
  const updatedTitle = formatSessionKicker(fetchedAt);

  const clients = typeof info?.clients === 'number' ? info.clients : null;
  const maxclients = typeof info?.maxclients === 'number' ? info.maxclients : null;
  const occupancy =
    clients != null && maxclients != null && maxclients > 0
      ? clampPercent((clients / maxclients) * 100)
      : 0;
  const playerValue = loading
    ? EMPTY
    : !online
      ? EMPTY
      : liveDataAvailable
        ? clients != null && maxclients != null
          ? `${clients}/${maxclients}`
          : clients != null
            ? `${clients}`
            : EMPTY
        : 'No data';

  const phase = acCurrentSessionLabel(info);
  const timeLeft = formatTimeLeftSeconds(info?.timeleft);
  const phaseValue = loading
    ? EMPTY
    : !online
      ? EMPTY
      : liveDataAvailable
        ? [phase, timeLeft].filter(isUsefulValue).join(' / ') || EMPTY
        : 'No data';

  const cars = Array.isArray(info?.cars)
    ? (info.cars as unknown[]).filter((c): c is string => typeof c === 'string' && Boolean(c))
    : [];
  const carNames = cars.map(formatCarName).filter((name) => name !== EMPTY);
  const carValue = loading
    ? EMPTY
    : !online
      ? EMPTY
      : liveDataAvailable
        ? carNames.length
          ? carNames.join(', ')
          : EMPTY
        : 'No data';

  const schedule = formatSessionDurationsLine(info?.sessiontypes, info?.durations, info?.timed, {
    inverted: typeof info?.inverted === 'number' ? info.inverted : undefined,
    lobbyName: typeof info?.name === 'string' ? info.name : undefined,
  });
  const scheduleValue = loading
    ? EMPTY
    : !online
      ? EMPTY
      : liveDataAvailable
        ? (schedule ?? EMPTY)
        : 'No data';

  const rawLobbyName = typeof info?.name === 'string' ? info.name.trim() : '';
  const lobbyName = rawLobbyName ? sanitizeServerLobbyDisplayName(rawLobbyName) : '';
  const statusTone = loading ? statusCopy.loading : online ? statusCopy.online : statusCopy.offline;

  return (
    <Box sx={softFloatWrapperSx()}>
      <Box
        sx={
          [
            GLASS_PANEL_SX,
            {
              width: '100%',
              p: 0,
              overflow: 'hidden',
              borderColor: online ? 'rgba(125,211,252,0.2)' : 'rgba(226,242,255,0.11)',
            },
            sx,
          ] as SxProps<Theme>
        }
      >
        <Box
          sx={{
            position: 'relative',
            minHeight: { xs: 256, sm: 286, md: 318 },
            overflow: 'hidden',
            background: 'linear-gradient(180deg, rgba(12,18,34,0.96) 0%, rgba(18,29,54,0.94) 100%)',
          }}
        >
          {heroSrc ? (
            <Box
              component="img"
              src={heroSrc}
              alt=""
              width={900}
              height={560}
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition:
                  heroOffsetY === 0 ? 'center' : `center calc(50% + ${heroOffsetY}px)`,
                filter: online ? 'saturate(1.08) contrast(1.03)' : 'saturate(0.55) contrast(0.92)',
                transform: 'scale(1.012)',
              }}
            />
          ) : (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(135deg, rgba(147,197,253,0.12) 0%, rgba(147,197,253,0.025) 34%, rgba(8,13,25,0.12) 68%), repeating-linear-gradient(135deg, rgba(226,242,255,0.055) 0 1px, transparent 1px 44px)',
              }}
            />
          )}

          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, rgba(6,10,20,0.18) 0%, rgba(6,10,20,0.22) 30%, rgba(7,12,24,0.78) 76%, rgba(7,12,24,0.94) 100%), linear-gradient(90deg, rgba(7,12,24,0.92) 0%, rgba(7,12,24,0.55) 46%, rgba(7,12,24,0.16) 100%)',
            }}
          />

          <Stack
            spacing={2.1}
            justifyContent="space-between"
            sx={{
              position: 'relative',
              zIndex: 1,
              minHeight: { xs: 256, sm: 286, md: 318 },
              p: { xs: 2, sm: 2.35, md: 2.6 },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.2}>
              <Stack direction="row" alignItems="center" spacing={0.9} sx={{ minWidth: 0 }}>
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: statusTone.color,
                    boxShadow: `0 0 0 4px ${statusTone.bg}`,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    color: 'rgba(226,232,240,0.78)',
                    fontWeight: 900,
                    lineHeight: 1,
                    textTransform: 'uppercase',
                    fontSize: '0.68rem',
                  }}
                >
                  AC Elite server
                </Typography>
              </Stack>

              <Chip
                size="small"
                label={statusTone.label}
                sx={{
                  height: 23,
                  borderRadius: 1,
                  bgcolor: statusTone.bg,
                  color: statusTone.color,
                  border: `1px solid ${online || loading ? 'rgba(186,230,253,0.36)' : 'rgba(226,232,240,0.22)'}`,
                  fontWeight: 900,
                  fontSize: '0.64rem',
                  '& .MuiChip-label': { px: 0.85 },
                }}
              />
            </Stack>

            <Stack spacing={1.2} sx={{ maxWidth: 430 }}>
              <Typography
                variant="caption"
                title={loading ? undefined : updatedTitle !== EMPTY ? updatedTitle : undefined}
                sx={{
                  color: ACCENT,
                  fontWeight: 900,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  fontSize: '0.68rem',
                }}
              >
                {updatedLine}
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 950,
                  lineHeight: 0.98,
                  fontSize: {
                    xs: 'clamp(1.65rem, 7vw, 2.35rem)',
                    md: 'clamp(1.9rem, 2.5vw, 2.55rem)',
                  },
                  maxWidth: 1,
                  textWrap: 'balance',
                  textShadow: '0 12px 28px rgba(0,0,0,0.52)',
                }}
              >
                {trackTitle}
              </Typography>
              <Typography
                variant="body2"
                title={lobbyName || undefined}
                sx={{
                  color: 'rgba(255,255,255,0.78)',
                  fontWeight: 750,
                  lineHeight: 1.35,
                  minHeight: 38,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: 390,
                }}
              >
                {loading
                  ? 'Collecting lobby state.'
                  : !online
                    ? 'No active lobby while the server is down.'
                    : lobbyName || 'Official AC Elite lobby'}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        <Stack
          spacing={1.35}
          sx={{
            p: GLASS_PADDING.panel,
            pt: { xs: 1.65, sm: 1.85 },
            background: 'linear-gradient(180deg, rgba(23,33,59,0.94) 0%, rgba(18,28,52,0.98) 100%)',
            borderTop: '1px solid rgba(226,242,255,0.12)',
          }}
        >
          {loading ? (
            <RaceLoader
              variant="status"
              compact
              title="Checking server..."
              message="Reading live lobby status."
              sx={{ maxWidth: 1 }}
            />
          ) : (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  border: '1px solid rgba(226,242,255,0.12)',
                  borderRadius: 1.35,
                  overflow: 'hidden',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 100%)',
                  boxShadow: GLASS_BOXJE_RIM_SHADOW,
                }}
              >
                <TelemetryCell label="Grid" value={playerValue} />
                <TelemetryCell label="Phase" value={phaseValue} />
                <TelemetryCell
                  label="Car"
                  value={carValue}
                  title={carNames.join(', ') || cars.join(', ') || carValue}
                />
                <TelemetryCell label="Format" value={scheduleValue} title={scheduleValue} />
              </Box>

              <Stack spacing={0.75}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'rgba(226,232,240,0.55)',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      fontSize: '0.64rem',
                    }}
                  >
                    Slot load
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'rgba(255,255,255,0.74)', fontWeight: 850 }}
                  >
                    {online && clients != null && maxclients != null ? `${occupancy}%` : EMPTY}
                  </Typography>
                </Stack>
                <Box
                  aria-hidden
                  sx={{
                    height: 7,
                    borderRadius: 999,
                    overflow: 'hidden',
                    bgcolor: 'rgba(15,23,42,0.62)',
                    border: '1px solid rgba(226,242,255,0.1)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <Box
                    sx={{
                      width: `${online ? occupancy : 0}%`,
                      height: 1,
                      borderRadius: 'inherit',
                      background:
                        'linear-gradient(90deg, rgba(56,189,248,0.92), rgba(147,197,253,0.82))',
                      transition: 'width 420ms cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  />
                </Box>
              </Stack>
            </>
          )}

          <Button
            component="a"
            href={joinHref}
            target="_blank"
            rel="noreferrer"
            variant="contained"
            fullWidth
            aria-label="Join official server in Content Manager"
            startIcon={<Icon icon="solar:login-3-bold" width={20} height={20} />}
            sx={{
              minHeight: { xs: 42, sm: 46 },
              borderRadius: 1.35,
              color: '#fff',
              fontWeight: 950,
              textShadow: '0 1px 0 rgba(15,23,42,0.38)',
              background:
                'linear-gradient(180deg, rgba(96,165,250,0.66) 0%, rgba(37,99,235,0.58) 100%)',
              border: '1px solid rgba(219,234,254,0.26)',
              boxShadow: `${GLASS_BOXJE_RIM_SHADOW}, 0 16px 30px -18px rgba(59,130,246,0.86)`,
              '& .MuiButton-startIcon': { mr: 0.85 },
              '&:hover': {
                background:
                  'linear-gradient(180deg, rgba(125,211,252,0.72) 0%, rgba(59,130,246,0.62) 100%)',
                boxShadow: `${GLASS_BOXJE_RIM_SHADOW_HOVER}, 0 18px 34px -18px rgba(59,130,246,0.96)`,
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
