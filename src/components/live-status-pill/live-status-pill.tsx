import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme, type SxProps } from '@mui/material/styles';

import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getSyncHealth, type SiteMetadata } from 'src/lib/sync-utils';

export type LiveStatusPillProps = {
  compact?: boolean;
  sx?: SxProps<Theme>;
};

export function LiveStatusPill({ compact = false, sx }: LiveStatusPillProps) {
  const [metadata, setMetadata] = useState<SiteMetadata | null>(null);

  useEffect(() => {
    let mounted = true;

    void fetchJson<SiteMetadata>(DATA_FILES.metadata)
      .then((data) => {
        if (mounted) setMetadata(data);
      })
      .catch(() => {
        if (mounted) setMetadata(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const health = getSyncHealth(metadata?.lastSync);

  return (
    <Box
      aria-label={`Data status: ${health.label}, ${health.ageText}`}
      sx={
        [
          {
            width: compact ? 'auto' : '100%',
            maxWidth: compact ? 'none' : 230,
            mx: compact ? 0 : 'auto',
            px: compact ? 1 : 1.15,
            py: compact ? 0.45 : 0.6,
            borderRadius: 1.2,
            border: `1px solid ${alpha(health.color, 0.34)}`,
            color: health.color,
            background:
              `linear-gradient(180deg, ${alpha(health.color, 0.12)} 0%, ${alpha(health.color, 0.035)} 100%),` +
              'rgba(255,255,255,0.018)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px ${alpha(health.color, 0.05)}`,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ] as SxProps<Theme>
      }
    >
      <Stack direction="row" spacing={0.65} alignItems="center" justifyContent="center">
        <Box
          aria-hidden
          sx={{
            width: compact ? 6 : 7,
            height: compact ? 6 : 7,
            borderRadius: '50%',
            bgcolor: health.color,
            boxShadow: `0 0 0 3px ${alpha(health.color, 0.14)}`,
            flexShrink: 0,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'inherit',
            fontWeight: 800,
            lineHeight: 1.2,
            fontSize: compact ? '0.68rem' : '0.72rem',
          }}
        >
          {health.label} · {health.ageText}
        </Typography>
      </Stack>
    </Box>
  );
}
