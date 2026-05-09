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
export function SessionBar() {
  const auth = useAuth();

  if (auth.loading || !auth.user) return null;

  const role = auth.profile?.role;
  const accent = role ? ROLE_ACCENT[role] : 'rgba(148,163,184,0.6)';

  return (
    <Box
      sx={{
        ...GLASS_CARD_INNER_SX,
        position: 'relative',
        overflow: 'hidden',
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
                bgcolor: `${accent}26`,
                border: `1px solid ${accent}66`,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Icon icon={ROLE_ICON[role]} width={20} />
            </Box>
          )}

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
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
