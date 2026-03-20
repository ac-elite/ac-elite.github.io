import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 50px 50px, 50px 50px, 100px 0; }
`;

export function PageGridOverlay({ opacity = 0.42 }: { opacity?: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),' +
          'repeating-linear-gradient(45deg, transparent, transparent 88px, rgba(255,255,255,0.1) 88px, rgba(255,255,255,0.1) 90px)',
        backgroundSize: '44px 44px, 44px 44px, 100% 100%',
        animation: `${gridMove} 18s linear infinite`,
        mixBlendMode: 'screen',
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
        },
      }}
    />
  );
}
