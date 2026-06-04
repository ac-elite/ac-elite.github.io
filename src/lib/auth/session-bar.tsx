import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { GLASS_CARD_INNER_SX } from 'src/lib/glass';
import { ROLE_CHIP_SX } from 'src/lib/ac-elite-data';
import { OUTLINED_GLASS_WHITE_SX } from 'src/lib/page-shell';
import { getDriverRoute } from 'src/centralized/app-routes';

import { useDriverDirectory } from './bans-db';
import { useAuth, ROLE_LABEL, type AppRole, ROLE_TO_CHIP_STYLE } from './auth-context';

// ----------------------------------------------------------------------

/**
 * Solid accent colour per role — used for the left-edge stripe and the avatar
 * tile. Picked to match the hue of `ROLE_CHIP_SX` without copying the gradient.
 */
const ROLE_ACCENT: Record<AppRole, string> = {
  owner: '#ED4245', // red
  admin: '#A855F7', // purple
  moderator: '#22C55E', // green
  driver: '#94A3B8', // slate (neutral)
};

const ROLE_ICON: Record<AppRole, string> = {
  owner: 'solar:crown-bold',
  admin: 'solar:shield-keyhole-bold',
  moderator: 'solar:user-id-bold',
  driver: 'solar:user-bold',
};

function roleAccentEdgeSx(accent: string, width: number, opacity: number) {
  return {
    boxShadow: [
      `inset ${width}px 0 0 ${alpha(accent, opacity)}`,
      'inset 0 1px 0 rgba(255,255,255,0.09)',
      'inset 0 -1px 0 rgba(0,0,0,0.1)',
    ].join(', '),
  } as const;
}

/**
 * Top-of-page status bar shown on protected routes. Surfaces the signed-in
 * role with a coloured accent and a sign-out shortcut. Intentionally renders
 * nothing while the auth state is still resolving so a brief unauthenticated
 * state never flashes through.
 */
export type SessionBarProps = {
  /**
   * Compact layout for narrow contexts like the sidebar: shrinks the avatar,
   * shows "Signed in as" + role chip on a single line, and trims the sign-out
   * button to an icon. Use this when horizontal space is constrained.
   */
  compact?: boolean;
};

export function SessionBar({ compact = false }: SessionBarProps = {}) {
  const auth = useAuth();
  // Driver name as known on the site (rank.json, keyed by SteamID) — must be
  // called unconditionally, before the early return below.
  const driverDir = useDriverDirectory();

  if (auth.loading || !auth.user) return null;

  const role = auth.profile?.role;
  const accent = role ? ROLE_ACCENT[role] : 'rgba(148,163,184,0.6)';

  // Chip shows the name, coloured by role; clickable through to the user's own
  // driver page when we know their SteamID. Prefer the site's driver name over
  // the raw Steam persona so it matches the rest of the site.
  const steamId = auth.profile?.steamId ?? null;
  const siteName = steamId ? driverDir.byGuid.get(steamId)?.trim() : undefined;
  // Only Steam accounts have a real name. The legacy admin accounts store the
  // synthetic email (e.g. `owner@ac-elite.local`) as their display_name, so for
  // those we show the role label instead — never the email.
  const steamName = steamId ? auth.profile?.displayName?.trim() : undefined;
  const chipLabel = siteName || steamName || (role ? ROLE_LABEL[role] : 'Account');
  const chipStyleKey = role ? ROLE_TO_CHIP_STYLE[role] : 'Driver';
  const driverHref = steamId ? getDriverRoute(steamId) : null;

  const renderNameChip = (extraSx: object) => (
    <Chip
      size="small"
      label={
        driverHref ? (
          <Box
            component="span"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, minWidth: 0, maxWidth: '100%' }}
          >
            <Box
              component="span"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {chipLabel}
            </Box>
            <Icon icon="solar:arrow-right-up-linear" width={13} style={{ flexShrink: 0, opacity: 0.85 }} />
          </Box>
        ) : (
          chipLabel
        )
      }
      {...(driverHref
        ? { component: RouterLink, href: driverHref, clickable: true, title: 'View your driver page' }
        : {})}
      sx={{
        fontWeight: 800,
        ...ROLE_CHIP_SX[chipStyleKey],
        ...(driverHref
          ? {
              cursor: 'pointer',
              transition: 'transform 0.15s ease, filter 0.15s ease, box-shadow 0.15s ease',
              '&:hover': {
                filter: 'brightness(1.12)',
                transform: 'translateY(-1px)',
              },
            }
          : {}),
        ...extraSx,
      }}
    />
  );

  if (compact) {
    return (
      <Box
        sx={{
          ...GLASS_CARD_INNER_SX,
          ...roleAccentEdgeSx(accent, 3, 0.9),
          overflow: 'hidden',
          // Sits in the sidebar's flex column — never let it shrink when the
          // viewport is short, or the content squishes out of centre.
          flexShrink: 0,
          mx: 1,
          my: 1,
          px: 1.5,
          py: 1.25,
          borderRadius: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="center">
          {role && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.25,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 46%, transparent 72%), ${accent}24`,
                border: `1px solid ${accent}66`,
                color: '#fff',
                flexShrink: 0,
                backdropFilter: 'blur(14px) saturate(165%)',
                WebkitBackdropFilter: 'blur(14px) saturate(165%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
              }}
            >
              <Icon icon={ROLE_ICON[role]} width={20} />
            </Box>
          )}
          <Box sx={{ minWidth: 0, flex: 1, display: 'flex' }}>
            {renderNameChip({
              fontSize: '0.82rem',
              height: 28,
              minWidth: 0,
              maxWidth: '100%',
              '& .MuiChip-label': {
                px: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
            })}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => void auth.signOut()}
            aria-label="Sign out"
            title="Sign out"
            sx={{
              // Neutral white glass mini-control (mirrors the nav hover boxje); no
              // backdrop-filter — it sits in the already-blurred sidebar chrome.
              border: '1px solid rgba(226,242,255,0.2)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.028) 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14)',
              color: 'rgba(226,232,240,0.85)',
              cursor: 'pointer',
              p: 0.85,
              borderRadius: 1.1,
              flexShrink: 0,
              alignSelf: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
              '&:hover': {
                color: '#fca5a5',
                borderColor: 'rgba(252,165,165,0.6)',
                background: 'rgba(252,165,165,0.1)',
              },
            }}
          >
            <Icon icon="solar:logout-3-linear" width={17} />
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...GLASS_CARD_INNER_SX,
        ...roleAccentEdgeSx(accent, 4, 0.85),
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        py: 1.5,
        pl: 2.5,
        pr: 2,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.25, sm: 1.5 }}
        alignItems={{ xs: 'center', sm: 'center' }}
        justifyContent="space-between"
        sx={{ textAlign: { xs: 'center', sm: 'left' } }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          justifyContent={{ xs: 'center', sm: 'flex-start' }}
          flexWrap="wrap"
          useFlexGap
        >
          {/* Role glyph — pulls the eye and reinforces the colour coding. */}
          {role && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.25,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 46%, transparent 72%), ${accent}24`,
                border: `1px solid ${accent}66`,
                color: '#fff',
                flexShrink: 0,
                backdropFilter: 'blur(14px) saturate(165%)',
                WebkitBackdropFilter: 'blur(14px) saturate(165%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
              }}
            >
              <Icon icon={ROLE_ICON[role]} width={20} />
            </Box>
          )}

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: 'center', sm: 'flex-start' }}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              component="span"
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 24,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Signed in as
            </Typography>
            {renderNameChip({ fontSize: '0.72rem', height: 24 })}
          </Stack>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          onClick={() => void auth.signOut()}
          startIcon={<Icon icon="solar:logout-3-linear" width={16} />}
          sx={{
            ...OUTLINED_GLASS_WHITE_SX,
            alignSelf: { xs: 'center', sm: 'auto' },
            '&:hover': {
              borderColor: 'rgba(252,165,165,0.6)',
              color: '#fca5a5',
              bgcolor: 'rgba(252,165,165,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
            },
          }}
        >
          Sign out
        </Button>
      </Stack>
    </Box>
  );
}
