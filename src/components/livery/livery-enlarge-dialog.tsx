import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

export type LiveryEnlargeDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  src: string;
  alt: string;
  /** Optional line under the image (e.g. subtitle). */
  subtitle?: string;
  footer?: ReactNode;
};

export function LiveryEnlargeDialog({
  open,
  onClose,
  title,
  src,
  alt,
  subtitle,
  footer,
}: LiveryEnlargeDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="livery-enlarge-dialog-title"
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15,23,42,0.98)',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 2.5,
          maxHeight: '96vh',
          backgroundImage: 'none',
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ px: 2, pt: 2, pb: 1, gap: 1 }}
      >
        <Typography id="livery-enlarge-dialog-title" variant="subtitle1" sx={{ fontWeight: 800, pr: 1, color: '#fff' }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            color: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(255,255,255,0.18)',
            '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
          }}
        >
          <Box component="span" sx={{ fontSize: 22, lineHeight: 1 }}>
            ×
          </Box>
        </IconButton>
      </Stack>
      <DialogContent sx={{ px: 2, pb: 2, pt: 0 }}>
        <Box
          component="img"
          src={src}
          alt={alt}
          sx={{
            width: '100%',
            maxHeight: { xs: 'calc(85vh - 120px)', sm: 'calc(90vh - 120px)' },
            objectFit: 'contain',
            display: 'block',
            mx: 'auto',
            borderRadius: 1,
          }}
        />
        {subtitle ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5, textAlign: 'center' }}>
            {subtitle}
          </Typography>
        ) : null}
        {footer ? (
          <Box sx={{ mt: subtitle ? 1.25 : 1.5, display: 'flex', justifyContent: 'center' }}>{footer}</Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
