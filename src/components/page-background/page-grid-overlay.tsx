import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const gridDrift = keyframes`
  0% {
    background-position: 0 0, 0 0, 0 0;
  }
  100% {
    background-position: 56px 56px, 56px 56px, 112px 112px;
  }
`;

export function PageGridOverlay({ opacity = 0.32 }: { opacity?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage:
          'linear-gradient(rgba(226,242,255,0.11) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(226,242,255,0.11) 1px, transparent 1px),' +
          'linear-gradient(135deg, transparent calc(50% - 0.6px), rgba(226,242,255,0.07) calc(50% - 0.6px), rgba(226,242,255,0.07) calc(50% + 0.6px), transparent calc(50% + 0.6px))',
        backgroundSize: '56px 56px, 56px 56px, 112px 112px',
        animation: `${gridDrift} 20s linear infinite`,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    />
  );
}
