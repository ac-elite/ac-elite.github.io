import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { GLASS_CARD_INNER_SX } from 'src/lib/glass';
import { ROLE_CHIP_SX } from 'src/lib/ac-elite-data';

import { useAuth, ROLE_LABEL, type AppRole, ROLE_TO_CHIP_STYLE } from './auth-context';

// ----------------------------------------------------------------------

/**
 * Solid accent colour per role — used for the left-edge stripe and the avatar
 * tile. Picked to match the hue of `ROLE_CHIP_SX` without copying the gradient.
 */
const ROLE_ACCENT: Record<AppRole, string> = {
  owner: '#ED4245',     // red
  admin: '#A855F7',     // purple
  moderator: '#22C55E', // green
};

const ROLE_ICON: Record<AppRole, string> = {
  owner: 'solar:crown-bold',
  admin: 'solar:shield-keyhole-bold',
  moderator: 'solar:user-id-bold',
};

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

  if (auth.loading || !auth.user) return null;

  const role = auth.profile?.role;
  const accent = role ? ROLE_ACCENT[role] : 'rgba(148,163,184,0.6)';

  if (compact) {
    return (
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          // Sits in the sidebar's flex column — never let it shrink when the
          // viewport is short, or the content squishes out of centre.
          flexShrink: 0,
          mx: 1,
          my: 1,
          px: 1.25,
          py: 1,
          borderRadius: 1.25,
          bgcolor: 'rgba(15,23,42,0.55)',
          border: '1px solid rgba(148,163,184,0.18)',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: '0 auto 0 0',
            width: 3,
            background: accent,
            opacity: 0.9,
          },
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          {role && (
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  `radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 46%, transparent 72%), ${accent}24`,
                border: `1px solid ${accent}66`,
                color: '#fff',
                flexShrink: 0,
                backdropFilter: 'blur(14px) saturate(165%)',
                WebkitBackdropFilter: 'blur(14px) saturate(165%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)',
              }}
            >
              <Icon icon={ROLE_ICON[role]} width={16} />
            </Box>
          )}
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="span"
              variant="caption"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 18,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                fontSize: '0.6rem',
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Signed in as
            </Typography>
            {role && (
              <Chip
                size="small"
                label={ROLE_LABEL[role]}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.62rem',
                  height: 18,
                  '& .MuiChip-label': { px: 0.6 },
                  ...ROLE_CHIP_SX[ROLE_TO_CHIP_STYLE[role]],
                }}
              />
            )}
          </Stack>
          <Box
            component="button"
            type="button"
            onClick={() => void auth.signOut()}
            aria-label="Sign out"
            title="Sign out"
            sx={{
              border: '1px solid rgba(148,163,184,0.32)',
              bgcolor: 'transparent',
              color: 'rgba(226,232,240,0.85)',
              cursor: 'pointer',
              p: 0.65,
              borderRadius: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
              '&:hover': {
                color: '#fca5a5',
                borderColor: 'rgba(252,165,165,0.6)',
                bgcolor: 'rgba(252,165,165,0.08)',
              },
            }}
          >
            <Icon icon="solar:logout-3-linear" width={15} />
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        ...GLASS_CARD_INNER_SX,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        py: 1.5,
        pl: 2.5,
        pr: 2,
        // Coloured stripe along the left edge so the role is unmissable.
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: '0 auto 0 0',
          width: 4,
          background: accent,
          opacity: 0.85,
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.25, sm: 1.5 }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
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
                background:
                  `radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0.04) 46%, transparent 72%), ${accent}24`,
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

          <Stack direction="row" spacing={1} alignItems="center">
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
            {role && (
              <Chip
                size="small"
                label={ROLE_LABEL[role]}
                sx={{
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  height: 24,
                  ...ROLE_CHIP_SX[ROLE_TO_CHIP_STYLE[role]],
                }}
              />
            )}
          </Stack>
        </Stack>

        <Button
          variant="outlined"
          size="small"
          onClick={() => void auth.signOut()}
          startIcon={<Icon icon="solar:logout-3-linear" width={16} />}
          sx={{
            fontWeight: 700,
            borderColor: 'rgba(148,163,184,0.4)',
            color: 'text.primary',
            '&:hover': {
              borderColor: 'rgba(252,165,165,0.6)',
              color: '#fca5a5',
              bgcolor: 'rgba(252,165,165,0.06)',
            },
          }}
        >
          Sign out
        </Button>
      </Stack>
    </Box>
  );
}
