import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';

function DashboardGlyph({
  children,
  size = 25.5,
  x = 0,
  y = 0,
}: {
  children: React.ReactNode;
  size?: number;
  x?: number;
  y?: number;
}) {
  return (
    <Box
      component="span"
      className="nav-glyph"
      sx={
        {
          '--nav-icon-x': `${x}px`,
          '--nav-icon-y': `${y}px`,
          '--nav-icon-size': `${size}px`,
        } as React.CSSProperties
      }
    >
      <SvgIcon
        viewBox="0 0 24 24"
        sx={{
          fill: 'none',
          '& *': {
            vectorEffect: 'non-scaling-stroke',
          },
        }}
      >
        {children}
      </SvgIcon>
    </Box>
  );
}

const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.95,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const dashboardIcons = {
  home: (
    <DashboardGlyph>
      <path {...strokeProps} d="M4.75 11.15 12 5.25l7.25 5.9" />
      <path {...strokeProps} d="M6.75 10.6v6.2c0 1.45.8 2.25 2.25 2.25h6c1.45 0 2.25-.8 2.25-2.25v-6.2" />
      <path {...strokeProps} d="M10 14.8h4" />
    </DashboardGlyph>
  ),
  stats: (
    <DashboardGlyph>
      <path {...strokeProps} d="M5.25 18.75h13.5" />
      <path {...strokeProps} d="M7.5 15.75v-4" />
      <path {...strokeProps} d="M12 15.75v-7.5" />
      <path {...strokeProps} d="M16.5 15.75v-10" />
    </DashboardGlyph>
  ),
  leaderboard: (
    <DashboardGlyph>
      <circle {...strokeProps} cx="12" cy="9.35" r="3.35" />
      <path {...strokeProps} d="m10.15 12.2-1.05 5.55L12 16.1l2.9 1.65-1.05-5.55" />
      <path {...strokeProps} d="m10.85 9.35.8.8 1.5-1.65" />
    </DashboardGlyph>
  ),
  rankings: (
    <DashboardGlyph>
      <path {...strokeProps} d="M5.25 18.75h13.5" />
      <path {...strokeProps} d="M8.25 18.75v-5.5h-2v5.5" />
      <path {...strokeProps} d="M13 18.75v-9h-2v9" />
      <path {...strokeProps} d="M17.75 18.75v-7h-2v7" />
      <path {...strokeProps} d="M12 4.95v1.9" />
    </DashboardGlyph>
  ),
  trophy: (
    <DashboardGlyph>
      <path {...strokeProps} d="M8 5.75h8v4.2c0 2.55-1.55 4.65-4 4.65s-4-2.1-4-4.65z" />
      <path {...strokeProps} d="M8 7.25H5.75c0 2.9 1.15 4.55 3 4.8" />
      <path {...strokeProps} d="M16 7.25h2.25c0 2.9-1.15 4.55-3 4.8" />
      <path {...strokeProps} d="M12 14.6v3" />
      <path {...strokeProps} d="M9.25 18.75h5.5" />
    </DashboardGlyph>
  ),
  livery: (
    <DashboardGlyph size={26.5} y={0.1}>
      <path {...strokeProps} d="M4.8 14.55h1.05l1.34-3.48c.3-.78.86-1.13 1.68-1.13h5.08c.7 0 1.21.27 1.6.82l1.72 2.42 1.18.33c.6.17 1 .72 1 1.35v1.08c0 .62-.43 1.06-1.04 1.06h-.46" />
      <path {...strokeProps} d="M8.82 10.02 7.9 13.1h8.46l-1.46-2.1c-.25-.36-.56-.5-1-.5H8.82" />
      <path {...strokeProps} d="M10.96 10.02 10.5 13.1" />
      <path {...strokeProps} d="M8.8 17h6.45" />
      <circle {...strokeProps} cx="7.35" cy="17" r="1.45" />
      <circle {...strokeProps} cx="16.7" cy="17" r="1.45" />
      <path {...strokeProps} d="m13.95 7.35 1.18-1.18" />
      <path {...strokeProps} d="M16.12 8.32h1.55" />
      <path {...strokeProps} d="m11.92 7.78-.5-1.42" />
    </DashboardGlyph>
  ),
  setup: (
    <DashboardGlyph>
      <path {...strokeProps} d="M5.25 7.25h7.25" />
      <path {...strokeProps} d="M15.75 7.25h3" />
      <circle {...strokeProps} cx="14" cy="7.25" r="1.5" />
      <path {...strokeProps} d="M5.25 16.75h3" />
      <path {...strokeProps} d="M11.5 16.75h7.25" />
      <circle {...strokeProps} cx="10" cy="16.75" r="1.5" />
    </DashboardGlyph>
  ),
};

export const dataPageHeaderIcons: Record<string, React.ReactNode> = {
  Stats: dashboardIcons.stats,
  Rankings: dashboardIcons.rankings,
  Leaderboard: dashboardIcons.leaderboard,
  'Hall of Fame': dashboardIcons.trophy,
  'Livery Showcase': dashboardIcons.livery,
};
