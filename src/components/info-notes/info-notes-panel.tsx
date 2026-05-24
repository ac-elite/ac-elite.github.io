import { alpha, type Theme, type SxProps } from '@mui/material/styles';

import { Icon } from '@iconify/react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

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
      sx={{
        borderRadius: 3,
        border: '1px solid rgba(148,163,184,0.3)',
        background: 'linear-gradient(150deg, rgba(19,36,71,0.96), rgba(15,27,52,0.96))',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 20px 56px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        ...sx,
      }}
    >
      <Stack divider={<Box sx={{ borderTop: '1px solid rgba(148,163,184,0.14)' }} />}>
        {notes.map((note, index) => (
          <Box
            key={note.lead}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: { xs: 2, md: 2.5 },
              py: { xs: 1.5, md: 1.75 },
              bgcolor: `${note.accent}14`,
              // Match the container's rounded corners on the first/last note so
              // the inset accent line curves with them.
              borderTopLeftRadius: index === 0 ? '24px' : 0,
              borderTopRightRadius: index === 0 ? '24px' : 0,
              borderBottomLeftRadius: index === notes.length - 1 ? '24px' : 0,
              borderBottomRightRadius: index === notes.length - 1 ? '24px' : 0,
              // The accent is an INSET box-shadow, not a left border: inset
              // shadows are clipped to the rounded border-box, so the 3px line
              // wraps around the rounded corners (a one-sided border is cut square).
              // Second layer is a soft colour glow bleeding inward.
              boxShadow: `inset 3px 0 0 0 ${note.accent}, inset 16px 0 20px -16px ${alpha(note.accent, 0.55)}`,
            }}
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
                bgcolor: `${note.accent}2e`,
                border: `1px solid ${note.accent}66`,
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
