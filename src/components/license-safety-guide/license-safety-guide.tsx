import { useState, useEffect, useContext, useCallback, createContext } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogContent from '@mui/material/DialogContent';

import { GUIDE_LAUNCH_BUTTON_SX } from 'src/lib/page-shell';
import {
  SR_TIERS,
  SR_CONFIG,
  formatNumber,
  getSRBadgeSx,
  LICENSE_TIERS,
  SR_CHIP_WIDTH,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
  LICENSE_TIER_ORDER,
} from 'src/lib/ac-elite-data';

export type GuideTab = 'license' | 'safety';

type LicenseSafetyGuideButtonProps = {
  compact?: boolean;
};

// --------------- Context ---------------

type GuideContextValue = {
  openGuide: (tab?: GuideTab) => void;
};

const GuideContext = createContext<GuideContextValue>({ openGuide: () => {} });

export function useLicenseSafetyGuide() {
  return useContext(GuideContext);
}

export function LicenseSafetyGuideProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<GuideTab>('license');

  const openGuide = useCallback((tab: GuideTab = 'license') => {
    setInitialTab(tab);
    setOpen(true);
  }, []);

  return (
    <GuideContext.Provider value={{ openGuide }}>
      {children}
      <LicenseSafetyGuideDialog open={open} onClose={() => setOpen(false)} initialTab={initialTab} />
    </GuideContext.Provider>
  );
}

// --------------- Standalone dialog ---------------

type LicenseSafetyGuideDialogProps = {
  open: boolean;
  onClose: () => void;
  initialTab?: GuideTab;
};

const GUIDE_LICENSE_CHIP_WIDTH = LICENSE_CHIP_WIDTH;
const GUIDE_SR_CHIP_WIDTH = SR_CHIP_WIDTH;
/** Safety table: wider than chip so “SR License” fits on one line with comfortable padding */
const GUIDE_SR_TABLE_LICENSE_COL_PX = 128;
/** License tier table: room for chip + label column header */
const GUIDE_LICENSE_TABLE_TIER_COL_PX = 112;

const LICENSE_TABLE_GRID = `${GUIDE_LICENSE_TABLE_TIER_COL_PX}px minmax(88px, 1fr) minmax(92px, 1fr) minmax(64px, 1fr)`;

function formatLicenseTableKm(tier: { minKm: number }) {
  return `${formatNumber(tier.minKm)}+`;
}

function formatLicenseTableScore(tierName: string, minScore: number) {
  if (tierName === 'Bronze') return 'Qualified';
  return formatNumber(minScore);
}

function formatLicenseTableTracks(minTracks?: number) {
  if (minTracks == null) return '—';
  return String(minTracks);
}

export function LicenseSafetyGuideButton({ compact = false }: LicenseSafetyGuideButtonProps) {
  const { openGuide } = useLicenseSafetyGuide();

  return (
    <Button
      variant="contained"
      color="primary"
      size={compact ? 'small' : 'medium'}
      onClick={() => openGuide('license')}
      sx={{
        ...GUIDE_LAUNCH_BUTTON_SX,
        minWidth: compact ? 0 : undefined,
        width: compact ? 'auto' : '100%',
        px: compact ? 1.3 : 1.8,
        py: compact ? 0.75 : 1,
      }}
    >
      {compact ? 'License / SR' : 'License / SR (BETA)'}
    </Button>
  );
}

function LicenseSafetyGuideDialog({ open, onClose, initialTab = 'license' }: LicenseSafetyGuideDialogProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: 'calc(100% - 20px)', sm: 760 },
            maxWidth: 'calc(100% - 20px)',
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.12)',
            // Apple vibrancy glass: top sheen + frosted navy + saturated blur.
            backgroundImage:
              'radial-gradient(120% 80% at 18% -10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 30%, rgba(255,255,255,0) 56%),' +
              'linear-gradient(180deg, rgba(34,48,80,0.94) 0%, rgba(17,26,48,0.96) 100%)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 8px rgba(0,0,0,0.4), 0 40px 90px -20px rgba(0,0,0,0.72)',
            color: '#fff',
          },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1.5, gap: 1.25 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: '#fff',
              letterSpacing: 0,
              lineHeight: 1.25,
              pr: 1,
            }}
          >
            AC Elite License / Safety Rating
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              width: { xs: 34, sm: 36 },
              height: { xs: 34, sm: 36 },
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.72)',
              border: '1px solid rgba(255,255,255,0.18)',
              background:
                'radial-gradient(120% 120% at 24% 0%, rgba(255,255,255,0.11), rgba(255,255,255,0.02) 46%, transparent 70%), rgba(255,255,255,0.035)',
              backdropFilter: 'blur(16px) saturate(165%)',
              WebkitBackdropFilter: 'blur(16px) saturate(165%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
              '&:hover': {
                color: '#fff',
                borderColor: 'rgba(226,242,255,0.38)',
                bgcolor: 'rgba(255,255,255,0.075)',
              },
            }}
          >
            <Box
              component="svg"
              viewBox="0 0 24 24"
              aria-hidden
              sx={{ width: 16, height: 16, display: 'block' }}
            >
              <path
                d="M6 6L18 18M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Box>
          </IconButton>
        </Stack>

        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 1 }}>
          <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'rgba(255,255,255,0.72)' }}>
            How it works
          </Typography>
          <Tabs
            value={activeTab}
            onChange={(_, value: GuideTab) => setActiveTab(value)}
            variant="fullWidth"
            sx={{
              minHeight: 46,
              p: 0.5,
              borderRadius: 2.5,
              background:
                'radial-gradient(120% 120% at 16% -30%, rgba(255,255,255,0.12), rgba(255,255,255,0.025) 42%, transparent 66%), rgba(11,19,38,0.48)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(18px) saturate(165%)',
              WebkitBackdropFilter: 'blur(18px) saturate(165%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.11)',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTabs-flexContainer': { gap: 0.5 },
            }}
          >
            {(['license', 'safety'] as const).map((value) => (
              <Tab
                key={value}
                value={value}
                label={value === 'license' ? 'License' : 'Safety Rating'}
                disableRipple
                sx={{
                  minHeight: 38,
                  borderRadius: 1.8,
                  textTransform: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 700,
                  transition:
                    'color 240ms cubic-bezier(0.32,0.72,0,1), background 240ms cubic-bezier(0.32,0.72,0,1), transform 240ms cubic-bezier(0.32,0.72,0,1), box-shadow 240ms cubic-bezier(0.32,0.72,0,1)',
                  '&.Mui-selected': {
                    color: '#fff',
                    background:
                      'radial-gradient(120% 120% at 18% -20%, rgba(255,255,255,0.18), rgba(255,255,255,0.045) 42%, transparent 68%),' +
                      'linear-gradient(180deg, rgba(96,165,250,0.24) 0%, rgba(59,130,246,0.12) 100%)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(15,23,42,0.2), 0 10px 24px -20px rgba(59,130,246,0.3)',
                  },
                  '&:hover': {
                    color: '#fff',
                    transform: 'translateY(-1px)',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                }}
              />
            ))}
          </Tabs>
        </Box>

        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 1, pb: { xs: 2.25, sm: 3 }, maxHeight: '72vh' }}>
          {activeTab === 'license' && (
            <Stack spacing={2.2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#dbeafe' }}>
                Your license (pace/skill) is based on your leaderboard pace and total distance driven.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                We do not use race results (wins or podiums) for license progression. Pace is built from leaderboard
                position per track, laps-based confidence (low laps = lower impact), participation scaling by number of
                tracks, and a consistency factor that rewards frequent top finishes.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                Track requirement means unique circuits where you set a valid lap. You need to meet both km and score,
                plus the required number of tracks where shown.
              </Typography>

              <Box
                sx={{
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                  maxWidth: '100%',
                  overflowX: 'auto',
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: LICENSE_TABLE_GRID,
                    gap: 1,
                    px: 2,
                    py: 1.1,
                    minWidth: { xs: 320, sm: 0 },
                    bgcolor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}
                  >
                    License
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
                    Min km
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
                    Min score
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
                    Tracks
                  </Typography>
                </Box>

                <Stack divider={<Box sx={{ borderTop: '1px solid rgba(148,163,184,0.12)' }} />}>
                  {LICENSE_TIER_ORDER.map((name) => {
                    const tier = LICENSE_TIERS[name];
                    return (
                      <Box
                        key={name}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: LICENSE_TABLE_GRID,
                          gap: 1,
                          px: 2,
                          py: 1.2,
                          alignItems: 'center',
                          minWidth: { xs: 320, sm: 0 },
                          bgcolor: 'rgba(23,33,59,0.36)',
                        }}
                      >
                        <Chip
                          size="small"
                          label={name}
                          sx={{
                            fontWeight: 800,
                            width: GUIDE_LICENSE_CHIP_WIDTH,
                            justifyContent: 'center',
                            ...getLicenseBadgeSx(name),
                          }}
                        />
                        <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                          {formatLicenseTableKm(tier)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                          {formatLicenseTableScore(name, tier.minScore)}
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                          {formatLicenseTableTracks(tier.minTracks)}
                        </Typography>
                      </Box>
                    );
                  })}

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: LICENSE_TABLE_GRID,
                      gap: 1,
                      px: 2,
                      py: 1.2,
                      alignItems: 'center',
                      minWidth: { xs: 320, sm: 0 },
                      bgcolor: 'rgba(23,33,59,0.36)',
                    }}
                  >
                    <Chip
                      size="small"
                      label="Rookie"
                      sx={{
                        fontWeight: 800,
                        width: GUIDE_LICENSE_CHIP_WIDTH,
                        justifyContent: 'center',
                        ...getLicenseBadgeSx('Rookie'),
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        gridColumn: '2 / -1',
                        color: 'rgba(219,234,254,0.92)',
                        fontWeight: 600,
                      }}
                    >
                      Under 100 km driven — no formal tier until you reach the Bronze threshold.
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}

          {activeTab === 'safety' && (
            <Stack spacing={2.2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#dbeafe' }}>
                Safety Rating is calculated from incidents per distance, not race finishing position.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                Formula input uses collisions and infractions per 100 km. Lower incident density means a higher raw
                rating. Drivers start at {SR_CONFIG.SR_START.toFixed(1)} and SR confidence scales with total distance,
                so very low-km drivers stay closer to the start value until enough clean km is logged.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                To unlock a tier you need both the minimum SR value and minimum total km for that tier.
              </Typography>

              <Box sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${GUIDE_SR_TABLE_LICENSE_COL_PX}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                    gap: 1,
                    px: 2,
                    py: 1.1,
                    bgcolor: 'rgba(255,255,255,0.06)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)', whiteSpace: 'nowrap' }}
                  >
                    SR License
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
                    Min SR
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
                    Min KM
                  </Typography>
                </Box>

                <Stack divider={<Box sx={{ borderTop: '1px solid rgba(148,163,184,0.12)' }} />}>
                  {SR_TIERS.map((tier) => (
                    <Box
                      key={tier.name}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: `${GUIDE_SR_TABLE_LICENSE_COL_PX}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                        gap: 1,
                        px: 2,
                        py: 1.2,
                        alignItems: 'center',
                        bgcolor: 'rgba(23,33,59,0.36)',
                      }}
                    >
                      <Chip
                        size="small"
                        label={tier.name}
                        sx={{
                          width: GUIDE_SR_CHIP_WIDTH,
                          justifyContent: 'center',
                          fontWeight: 800,
                          ...getSRBadgeSx(tier.name),
                        }}
                      />
                      <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                        {tier.minSR.toFixed(1)}+
                      </Typography>
                      <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                        {formatNumber(tier.minKm)}
                      </Typography>
                    </Box>
                  ))}

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `${GUIDE_SR_TABLE_LICENSE_COL_PX}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                      gap: 1,
                      px: 2,
                      py: 1.2,
                      alignItems: 'center',
                      bgcolor: 'rgba(23,33,59,0.36)',
                    }}
                  >
                    <Chip
                      size="small"
                      label="F"
                      sx={{
                        width: GUIDE_SR_CHIP_WIDTH,
                        justifyContent: 'center',
                        fontWeight: 800,
                        ...getSRBadgeSx('F'),
                      }}
                    />
                    <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                      &lt; {SR_TIERS[SR_TIERS.length - 1].minSR.toFixed(1)}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 700 }}>
                      Under 100
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
  );
}
