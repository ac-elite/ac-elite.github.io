import { useState } from 'react';

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

import {
  SR_TIERS,
  SR_CONFIG,
  getSRBadgeSx,
  LICENSE_TIERS,
  getLicenseBadgeSx,
  LICENSE_TIER_ORDER,
} from 'src/lib/ac-elite-data';

type GuideTab = 'licence' | 'safety';

type LicenseSafetyGuideButtonProps = {
  compact?: boolean;
};

const GUIDE_LICENSE_CHIP_WIDTH = 96;
const GUIDE_SR_CHIP_WIDTH = 64;

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatLicenseRequirement(
  tier: { minKm: number; minScore: number; minTracks?: number },
  tierName: string
) {
  if (tierName === 'Bronze') return `${formatNumber(tier.minKm)} km (qualified)`;

  const parts = [`${formatNumber(tier.minKm)} km`];
  if (tier.minScore > 0) {
    parts.push(`score >= ${formatNumber(tier.minScore)}`);
  }
  if (tier.minTracks) {
    parts.push(`${tier.minTracks} tracks`);
  }

  return parts.join(', ');
}

export function LicenseSafetyGuideButton({ compact = false }: LicenseSafetyGuideButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<GuideTab>('licence');

  return (
    <>
      <Button
        variant="contained"
        size={compact ? 'small' : 'medium'}
        onClick={() => setOpen(true)}
        sx={{
          minWidth: compact ? 0 : undefined,
          width: compact ? 'auto' : '100%',
          px: compact ? 1.3 : 1.8,
          py: compact ? 0.75 : 1,
          borderRadius: 2,
          color: '#111827',
          fontWeight: 800,
          textTransform: 'none',
          border: '1px solid rgba(245,196,53,0.8)',
          background: 'linear-gradient(135deg, #f6d365 0%, #f2b431 100%)',
          boxShadow: '0 10px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.45)',
          '&:hover': {
            background: 'linear-gradient(135deg, #f9de87 0%, #f4bf47 100%)',
            borderColor: 'rgba(245,196,53,0.95)',
          },
        }}
      >
        {compact ? 'License / SR' : 'License / SR (BETA)'}
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: { xs: 'calc(100% - 20px)', sm: 760 },
            maxWidth: 'calc(100% - 20px)',
            borderRadius: 3,
            border: '1px solid rgba(148,163,184,0.36)',
            background: 'linear-gradient(150deg, rgba(19,36,71,0.96), rgba(15,27,52,0.96))',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            color: '#fff',
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 3, pt: 2.5, pb: 1.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: 'warning.main',
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            AC Elite License / Safety Rating / How it works
          </Typography>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
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

        <Box sx={{ px: 3, pb: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(_, value: GuideTab) => setActiveTab(value)}
            variant="fullWidth"
            sx={{
              minHeight: 48,
              borderRadius: 2,
              bgcolor: 'rgba(23,33,59,0.5)',
              border: '1px solid rgba(148,163,184,0.22)',
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab
              value="licence"
              label="License"
              sx={{
                minHeight: 48,
                borderRadius: 1.5,
                color: 'text.secondary',
                fontWeight: 800,
                '&.Mui-selected': {
                  color: '#22e98a',
                  bgcolor: 'rgba(18,96,90,0.42)',
                  border: '1px solid rgba(34,233,138,0.22)',
                },
              }}
            />
            <Tab
              value="safety"
              label="Safety Rating"
              sx={{
                minHeight: 48,
                borderRadius: 1.5,
                color: 'text.secondary',
                fontWeight: 800,
                '&.Mui-selected': {
                  color: '#22e98a',
                  bgcolor: 'rgba(18,96,90,0.42)',
                  border: '1px solid rgba(34,233,138,0.22)',
                },
              }}
            />
          </Tabs>
        </Box>

        <DialogContent sx={{ px: 3, pt: 1, pb: 3, maxHeight: '72vh' }}>
          {activeTab === 'licence' && (
            <Stack spacing={2.2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#dbeafe' }}>
                Your license (pace/skill) is based on your leaderboard pace and total distance driven.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                We do not use race results (wins or podiums) for license progression. The pace score is built from
                track position, track participation and consistency bonus over time.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                Track requirement means unique circuits where you set a valid lap. You need to meet both km and score,
                plus the required number of tracks where shown.
              </Typography>

              <Stack spacing={1}>
                {LICENSE_TIER_ORDER.map((name) => (
                  <Box
                    key={name}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: `${GUIDE_LICENSE_CHIP_WIDTH}px 1fr` },
                      gap: 1.25,
                      alignItems: 'center',
                      borderRadius: 1.6,
                      px: 1.2,
                      py: 1.1,
                      border: '1px solid rgba(148,163,184,0.2)',
                      bgcolor: 'rgba(23,33,59,0.38)',
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
                    <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 600 }}>
                      {formatLicenseRequirement(LICENSE_TIERS[name], name)}
                    </Typography>
                  </Box>
                ))}

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: `${GUIDE_LICENSE_CHIP_WIDTH}px 1fr` },
                    gap: 1.25,
                    alignItems: 'center',
                    borderRadius: 1.6,
                    px: 1.2,
                    py: 1.1,
                    border: '1px solid rgba(148,163,184,0.2)',
                    bgcolor: 'rgba(23,33,59,0.38)',
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
                  <Typography variant="body1" sx={{ color: '#dbeafe', fontWeight: 600 }}>
                    Under 100 km driven
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          )}

          {activeTab === 'safety' && (
            <Stack spacing={2.2}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#dbeafe' }}>
                Safety Rating is calculated from incidents per distance, not race finishing position.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                Formula input uses collisions and infractions per 100 km. Lower incident density means a higher
                rating. Drivers start at {SR_CONFIG.SR_START.toFixed(1)} and progress as clean distance grows.
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 880 }}>
                To unlock a tier you need both the minimum SR value and minimum total km for that tier.
              </Typography>

              <Box sx={{ borderRadius: 2, border: '1px solid rgba(148,163,184,0.24)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `${GUIDE_SR_CHIP_WIDTH}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                    gap: 1,
                    px: 1.5,
                    py: 1.1,
                    bgcolor: 'rgba(148,163,184,0.12)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
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
                        gridTemplateColumns: `${GUIDE_SR_CHIP_WIDTH}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                        gap: 1,
                        px: 1.5,
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
                      gridTemplateColumns: `${GUIDE_SR_CHIP_WIDTH}px minmax(110px, 1fr) minmax(100px, 1fr)`,
                      gap: 1,
                      px: 1.5,
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
    </>
  );
}
