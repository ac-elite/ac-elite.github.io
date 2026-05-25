import { alpha, type Theme, type SxProps } from '@mui/material/styles';

import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { GLASS_PANEL_SX, GLASS_CARD_INNER_SX, getTintedGlassInnerRowSx } from 'src/lib/glass';

/**
 * A small glass "notes" panel — same dark-glass look as the License/SR modal.
 * Holds one or more colour-accented notes (heads-up messages for visitors).
 */
export type InfoNote = {
  /** Iconify icon name (solar set used across the site). */
  icon: string;
  /** Hex accent for the icon tile. */
  accent: string;
  /** Bold lead line. */
  lead: string;
  /** Supporting text. */
  body: React.ReactNode;
};

type InfoNotesPanelProps = {
  notes: InfoNote[];
  sx?: SxProps<Theme>;
};

export function InfoNotesPanel({ notes, sx }: InfoNotesPanelProps) {
  return (
    <Box
      sx={[GLASS_PANEL_SX, { p: 0, overflow: 'hidden' }, sx] as SxProps<Theme>}
    >
      <Stack divider={<Box sx={{ borderTop: '1px solid rgba(226,242,255,0.08)' }} />}>
        {notes.map((note, index) => (
          <Box
            key={note.lead}
            sx={[
              GLASS_CARD_INNER_SX,
              getTintedGlassInnerRowSx(note.accent),
              {
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: { xs: 2, md: 2.5 },
                py: { xs: 1.5, md: 1.75 },
                border: 0,
                borderRadius: 0,
                // Match the container's rounded corners on the first/last note so
                // the inset accent line curves with them.
                borderTopLeftRadius: index === 0 ? '22px' : 0,
                borderTopRightRadius: index === 0 ? '22px' : 0,
                borderBottomLeftRadius: index === notes.length - 1 ? '22px' : 0,
                borderBottomRightRadius: index === notes.length - 1 ? '22px' : 0,
              },
            ] as SxProps<Theme>}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.25,
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: note.accent,
                background:
                  `radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 46%, transparent 72%), ${alpha(note.accent, 0.16)}`,
                border: `1px solid ${note.accent}66`,
                backdropFilter: 'blur(14px) saturate(165%)',
                WebkitBackdropFilter: 'blur(14px) saturate(165%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              <Icon icon={note.icon} width={19} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem', lineHeight: 1.45 }}
              >
                {note.lead}
              </Typography>
              <Typography
                variant="body2"
                sx={{ mt: 0.25, color: 'rgba(226,232,240,0.8)', lineHeight: 1.55 }}
              >
                {note.body}
              </Typography>
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
