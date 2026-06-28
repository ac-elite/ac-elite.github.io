import type { ReactNode } from 'react';
import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';

export type RaceLoaderVariant = 'timing' | 'status' | 'spotlight' | 'page';

type RaceLoaderProps = {
  title?: string;
  message?: string;
  compact?: boolean;
  variant?: RaceLoaderVariant;
  sx?: SxProps<Theme>;
};

const scanSweep = keyframes`
  0% {
    transform: translateX(-135%);
    opacity: 0;
  }
  14%, 76% {
    opacity: 1;
  }
  100% {
    transform: translateX(135%);
    opacity: 0;
  }
`;

const glowPulse = keyframes`
  0%, 100% {
    opacity: 0.45;
    transform: scale(0.92);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
`;

const rowSignal = keyframes`
  0%, 100% {
    opacity: 0.58;
  }
  50% {
    opacity: 0.96;
  }
`;

const liftPulse = keyframes`
  0%, 100% {
    transform: translateY(0);
    opacity: 0.74;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
`;

const routeScan = keyframes`
  0% {
    transform: translateX(-18%);
  }
  100% {
    transform: translateX(118%);
  }
`;

const timingRows = [
  { position: '01', driver: '72%', sector: '42%', gap: '30%' },
  { position: '02', driver: '54%', sector: '58%', gap: '44%' },
  { position: '03', driver: '64%', sector: '36%', gap: '38%' },
  { position: '04', driver: '48%', sector: '50%', gap: '26%' },
] as const;

const statusRows = [
  { label: 'LIVE', detail: 'LOBBY', width: '76%' },
  { label: 'API', detail: 'PING', width: '58%' },
  { label: 'SYNC', detail: 'DATA', width: '68%' },
] as const;

const spotlightCards = [
  { label: 'P2', height: '64%', width: '54%', delay: 0.12 },
  { label: 'P1', height: '88%', width: '74%', delay: 0 },
  { label: 'P3', height: '52%', width: '46%', delay: 0.24 },
] as const;

const pageSteps = [
  { label: 'DATA', width: '68%' },
  { label: 'UI', width: '52%' },
  { label: 'CHARTS', width: '74%' },
  { label: 'READY', width: '44%' },
] as const;

function DataBar({
  width,
  delay = 0,
  height = 8,
  color = 'rgba(148, 163, 184, 0.18)',
}: {
  width: string;
  delay?: number;
  height?: number;
  color?: string;
}) {
  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: 999,
        bgcolor: color,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: `${rowSignal} 1.9s ease-in-out infinite`,
        animationDelay: `${delay}s`,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    />
  );
}

function LoaderFrame({
  compact,
  children,
  glow = 'rgba(56,189,248,0.72)',
}: {
  compact: boolean;
  children: ReactNode;
  glow?: string;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 1.5,
        px: compact ? 1.25 : 1.6,
        py: compact ? 1.15 : 1.35,
        bgcolor: 'rgba(15, 23, 42, 0.42)',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 42px -34px ${glow}`,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(56,189,248,0.05), rgba(45,212,191,0.12), rgba(56,189,248,0.05), transparent)',
          width: '58%',
          animation: `${scanSweep} 2.2s cubic-bezier(0.42, 0, 0.16, 1) infinite`,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.035), transparent 42%), radial-gradient(circle at 14% 0%, rgba(56,189,248,0.12), transparent 32%)',
          pointerEvents: 'none',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '&::before': {
            animation: 'none',
            opacity: 0.45,
          },
        },
      }}
    >
      {children}
    </Box>
  );
}

function SignalHeader({
  compact,
  label,
  tone = '#2dd4bf',
}: {
  compact: boolean;
  label: string;
  tone?: string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ position: 'relative', zIndex: 1, mb: compact ? 0.9 : 1.1 }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: tone,
            boxShadow: `0 0 14px ${tone}`,
            animation: `${glowPulse} 1.4s ease-in-out infinite`,
            '@media (prefers-reduced-motion: reduce)': {
              animation: 'none',
            },
          }}
        />
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(226, 242, 255, 0.82)',
            fontSize: compact ? '0.64rem' : '0.68rem',
            fontWeight: 850,
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={0.45} sx={{ color: 'rgba(125,211,252,0.52)' }}>
        {[0, 1, 2, 3].map((index) => (
          <Box
            key={index}
            sx={{
              width: compact ? 10 : 12,
              height: 3,
              borderRadius: 999,
              bgcolor: 'currentColor',
              opacity: 0.35 + index * 0.14,
            }}
          />
        ))}
      </Stack>
    </Stack>
  );
}

function TimingBoard({ compact }: { compact: boolean }) {
  const rows = compact ? timingRows.slice(0, 3) : timingRows;

  return (
    <LoaderFrame compact={compact}>
      <SignalHeader compact={compact} label="Timing sync" />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: compact ? '34px 1fr 52px' : '44px minmax(110px, 1fr) 82px 72px',
          gap: compact ? 0.8 : 1.2,
          alignItems: 'center',
          px: compact ? 0.5 : 0.75,
          py: 0.6,
          color: 'rgba(148, 163, 184, 0.78)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 850 }}>
          POS
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 850 }}>
          DRIVER
        </Typography>
        {!compact && (
          <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 850 }}>
            SECTOR
          </Typography>
        )}
        <Typography variant="caption" sx={{ fontSize: '0.62rem', fontWeight: 850 }}>
          GAP
        </Typography>
      </Box>

      <Stack spacing={0.55} sx={{ position: 'relative', zIndex: 1, mt: 0.55 }}>
        {rows.map((row, index) => (
          <Box
            key={row.position}
            sx={{
              display: 'grid',
              gridTemplateColumns: compact ? '34px 1fr 52px' : '44px minmax(110px, 1fr) 82px 72px',
              gap: compact ? 0.8 : 1.2,
              alignItems: 'center',
              minHeight: compact ? 25 : 28,
              px: compact ? 0.5 : 0.75,
              borderRadius: 1,
              bgcolor: index % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.018)',
              border: '1px solid rgba(255,255,255,0.035)',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(226,242,255,0.76)',
                fontWeight: 850,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {row.position}
            </Typography>
            <DataBar width={row.driver} delay={index * 0.08} />
            {!compact && <DataBar width={row.sector} delay={index * 0.1 + 0.08} />}
            <DataBar width={row.gap} delay={index * 0.1 + 0.16} />
          </Box>
        ))}
      </Stack>
    </LoaderFrame>
  );
}

function StatusBoard({ compact }: { compact: boolean }) {
  return (
    <LoaderFrame compact={compact} glow="rgba(34,224,122,0.66)">
      <SignalHeader compact={compact} label="Server status" tone="#22e07a" />

      <Stack spacing={0.65} sx={{ position: 'relative', zIndex: 1 }}>
        {statusRows.map((row, index) => (
          <Box
            key={row.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: compact ? '48px 1fr 44px' : '62px minmax(120px, 1fr) 70px',
              gap: 1,
              alignItems: 'center',
              minHeight: compact ? 28 : 32,
              px: compact ? 0.65 : 0.8,
              borderRadius: 1,
              bgcolor: 'rgba(34, 224, 122, 0.04)',
              border: '1px solid rgba(34, 224, 122, 0.08)',
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'rgba(187,247,208,0.82)', fontWeight: 850, letterSpacing: 0 }}
            >
              {row.label}
            </Typography>
            <DataBar width={row.width} delay={index * 0.12} color="rgba(34, 224, 122, 0.18)" />
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(226,242,255,0.58)',
                fontSize: '0.58rem',
                fontWeight: 850,
                textAlign: 'right',
              }}
            >
              {row.detail}
            </Typography>
          </Box>
        ))}
      </Stack>
    </LoaderFrame>
  );
}

function SpotlightBoard({ compact }: { compact: boolean }) {
  return (
    <LoaderFrame compact={compact} glow="rgba(250,204,21,0.54)">
      <SignalHeader compact={compact} label="Spotlight sync" tone="#facc15" />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: compact ? 0.8 : 1.1,
          alignItems: 'end',
          minHeight: compact ? 104 : 132,
          px: compact ? 0.25 : 0.5,
        }}
      >
        {spotlightCards.map((card, index) => (
          <Stack
            key={card.label}
            spacing={0.75}
            alignItems="stretch"
            justifyContent="flex-end"
            sx={{
              height: card.height,
              minHeight: compact ? 68 : 84,
              borderRadius: 1.2,
              p: compact ? 0.75 : 1,
              bgcolor: index === 1 ? 'rgba(250,204,21,0.12)' : 'rgba(148,163,184,0.075)',
              border:
                index === 1
                  ? '1px solid rgba(250,204,21,0.24)'
                  : '1px solid rgba(148,163,184,0.12)',
              animation: `${liftPulse} 1.9s ease-in-out infinite`,
              animationDelay: `${card.delay}s`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 900, textAlign: 'center' }}
            >
              {card.label}
            </Typography>
            <DataBar
              width={card.width}
              delay={card.delay}
              color={index === 1 ? 'rgba(250,204,21,0.2)' : 'rgba(148,163,184,0.16)'}
            />
            <DataBar
              width="42%"
              height={6}
              delay={card.delay + 0.1}
              color="rgba(255,255,255,0.13)"
            />
          </Stack>
        ))}
      </Box>
    </LoaderFrame>
  );
}

function PageBoard({ compact }: { compact: boolean }) {
  return (
    <LoaderFrame compact={compact} glow="rgba(96,165,250,0.66)">
      <SignalHeader compact={compact} label="Grid warmup" tone="#60a5fa" />

      <Stack spacing={1} sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            position: 'relative',
            height: compact ? 42 : 54,
            borderRadius: 1.2,
            overflow: 'hidden',
            bgcolor: 'rgba(96,165,250,0.055)',
            border: '1px solid rgba(96,165,250,0.1)',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: '8%',
              right: '8%',
              top: '50%',
              height: 4,
              borderRadius: 999,
              bgcolor: 'rgba(148,163,184,0.18)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(50% - 5px)',
              width: 28,
              height: 10,
              borderRadius: 999,
              bgcolor: '#7db3ff',
              boxShadow: '0 0 18px rgba(125,179,255,0.52)',
              animation: `${routeScan} 2s linear infinite`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                transform: 'translateX(45%)',
              },
            }}
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: compact
              ? 'repeat(2, minmax(0, 1fr))'
              : 'repeat(4, minmax(0, 1fr))',
            gap: 0.75,
          }}
        >
          {pageSteps.map((step, index) => (
            <Stack
              key={step.label}
              spacing={0.55}
              sx={{
                minHeight: compact ? 42 : 48,
                borderRadius: 1,
                p: 0.85,
                bgcolor: 'rgba(255,255,255,0.035)',
                border: '1px solid rgba(255,255,255,0.055)',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'rgba(226,242,255,0.66)', fontSize: '0.58rem', fontWeight: 850 }}
              >
                {step.label}
              </Typography>
              <DataBar width={step.width} delay={index * 0.1} color="rgba(96,165,250,0.18)" />
            </Stack>
          ))}
        </Box>
      </Stack>
    </LoaderFrame>
  );
}

function renderBoard(variant: RaceLoaderVariant, compact: boolean) {
  if (variant === 'status') return <StatusBoard compact={compact} />;
  if (variant === 'spotlight') return <SpotlightBoard compact={compact} />;
  if (variant === 'page') return <PageBoard compact={compact} />;
  return <TimingBoard compact={compact} />;
}

function RaceLoader({
  title = 'Loading data...',
  message = 'Building the next lap.',
  compact = false,
  variant = 'timing',
  sx,
}: RaceLoaderProps) {
  return (
    <Stack
      role="status"
      aria-live="polite"
      spacing={compact ? 1 : 1.25}
      sx={{
        width: 1,
        maxWidth: 1,
        minWidth: 0,
        mx: 'auto',
        alignItems: 'stretch',
        ...sx,
      }}
    >
      {renderBoard(variant, compact)}

      {(title || message) && (
        <Stack spacing={0.35} sx={{ textAlign: 'center', px: 1 }}>
          {title && (
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.94)',
                fontSize: compact ? '0.85rem' : '0.95rem',
                fontWeight: 850,
                lineHeight: 1.2,
              }}
            >
              {title}
            </Typography>
          )}
          {message && (
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(226,242,255,0.62)',
                fontSize: compact ? '0.76rem' : '0.84rem',
                lineHeight: 1.45,
              }}
            >
              {message}
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}

export { RaceLoader };
