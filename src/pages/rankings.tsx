import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import {
  GLASS_PANEL_SX,
  GLASS_TABLE_WRAPPER_SX,
  GLASS_TABLE_PAGINATION_SX,
  getPodiumRowSx,
} from 'src/lib/glass';
import {
  SR_TIERS,
  getDriverSR,
  getSRBadgeSx,
  SR_CHIP_WIDTH,
  getPodiumChipSx,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_CHIP_WIDTH,
  LICENSE_TIER_ORDER,
  getOverallCombinedScore,
} from 'src/lib/ac-elite-data';

import { ErrorPanel } from 'src/components/data-state/error-panel';
import { LoadingPanel } from 'src/components/data-state/loading-panel';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

const RANKINGS_PER_PAGE = 20;

type RankingsTab = 'overall' | 'license' | 'safety';

type DriverRankData = {
  driver: RankDriver;
  license: string;
  paceScore: number;
  sr: number;
  srTier: string;
  combined: number;
};

function getVisiblePages(current: number, total: number) {
  const pages: (number | '...')[] = [];
  for (let i = 1; i <= total; i += 1) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
      pages.push(i);
    } else if (i === current - 2 || i === current + 2) {
      pages.push('...');
    }
  }
  return pages;
}

function Paginate({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (newPage: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = getVisiblePages(page, totalPages);

  return (
    <Paper sx={GLASS_TABLE_PAGINATION_SX}>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ minWidth: 78, fontWeight: 800 }}
        >
          Prev
        </Button>
        {pages.map((p, idx) =>
          p === '...' ? (
            <Typography key={`dots-${idx}`} sx={{ px: 1.25, py: 0.75 }}>
              ...
            </Typography>
          ) : (
            <Button
              key={p}
              onClick={() => onChange(p)}
              size="small"
              variant={p === page ? 'contained' : 'outlined'}
              color={p === page ? 'primary' : 'secondary'}
            >
              {p}
            </Button>
          )
        )}
        <Button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ minWidth: 78, fontWeight: 800 }}
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);

  const [tab, setTab] = useState<RankingsTab>('overall');
  const [licenseTier, setLicenseTier] = useState<string>('Elite');
  const [safetyTier, setSafetyTier] = useState<string>('S');
  const [pageOverall, setPageOverall] = useState(1);
  const [pageLicense, setPageLicense] = useState(1);
  const [pageSafety, setPageSafety] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rank = await fetchJson<RankDriver[]>('/data/rank.json');
        if (!mounted) return;
        setRankData(rank);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const enriched = useMemo<DriverRankData[]>(() => {
    const licenseMap = computeLicenseMap(rankData);
    const maxPaceScore = Math.max(1, ...rankData.map((d) => getDriverLicense(d, licenseMap).paceScore));

    return rankData.map((driver) => {
      const license = getDriverLicense(driver, licenseMap);
      const sr = getDriverSR(driver);
      return {
        driver,
        license: license.license,
        paceScore: license.paceScore,
        sr: sr.sr,
        srTier: sr.tier,
        combined: getOverallCombinedScore(license.paceScore, sr.sr, maxPaceScore),
      };
    });
  }, [rankData]);

  const licenseTiers = useMemo(() => [...LICENSE_TIER_ORDER, 'Rookie'], []);
  const safetyTiers = useMemo(() => [...SR_TIERS.map((t) => t.name), 'F'], []);

  const licenseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    licenseTiers.forEach((tier) => {
      counts[tier] = enriched.filter((x) => x.license === tier).length;
    });
    return counts;
  }, [enriched, licenseTiers]);

  const safetyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    safetyTiers.forEach((tier) => {
      counts[tier] = enriched.filter((x) => x.srTier === tier).length;
    });
    return counts;
  }, [enriched, safetyTiers]);

  useEffect(() => {
    if (!licenseCounts[licenseTier]) {
      const firstWithDrivers = licenseTiers.find((tier) => licenseCounts[tier] > 0);
      if (firstWithDrivers) setLicenseTier(firstWithDrivers);
    }
  }, [licenseCounts, licenseTier, licenseTiers]);

  useEffect(() => {
    if (!safetyCounts[safetyTier]) {
      const firstWithDrivers = safetyTiers.find((tier) => safetyCounts[tier] > 0);
      if (firstWithDrivers) setSafetyTier(firstWithDrivers);
    }
  }, [safetyCounts, safetyTier, safetyTiers]);

  const overall = useMemo(
    () =>
      [...enriched].sort((a, b) => {
        if (b.combined !== a.combined) return b.combined - a.combined;
        return b.paceScore - a.paceScore;
      }),
    [enriched]
  );

  const byLicense = useMemo(
    () => enriched.filter((x) => x.license === licenseTier).sort((a, b) => b.paceScore - a.paceScore),
    [enriched, licenseTier]
  );

  const bySafety = useMemo(
    () => enriched.filter((x) => x.srTier === safetyTier).sort((a, b) => b.sr - a.sr),
    [enriched, safetyTier]
  );

  function getSlice(items: DriverRankData[], page: number) {
    const totalPages = Math.max(1, Math.ceil(items.length / RANKINGS_PER_PAGE));
    const clamped = Math.min(Math.max(1, page), totalPages);
    const start = (clamped - 1) * RANKINGS_PER_PAGE;
    return {
      page: clamped,
      totalPages,
      start,
      slice: items.slice(start, start + RANKINGS_PER_PAGE),
    };
  }

  const overallPaged = getSlice(overall, pageOverall);
  const licensePaged = getSlice(byLicense, pageLicense);
  const safetyPaged = getSlice(bySafety, pageSafety);

  const activeData =
    tab === 'overall'
      ? { rows: overallPaged.slice, start: overallPaged.start, page: overallPaged.page, totalPages: overallPaged.totalPages }
      : tab === 'license'
        ? { rows: licensePaged.slice, start: licensePaged.start, page: licensePaged.page, totalPages: licensePaged.totalPages }
        : { rows: safetyPaged.slice, start: safetyPaged.start, page: safetyPaged.page, totalPages: safetyPaged.totalPages };

  return (
    <>
      <title>{`Rankings - ${CONFIG.appName}`}</title>
      <meta name="description" content="AC Elite rankings by overall, license tier, and safety tier." />

      <Box
        sx={{
          position: 'relative',
          py: 4,
          background:
            'radial-gradient(circle at 20% 0%, rgba(23,33,59,0.24) 0, transparent 50%),' +
            'linear-gradient(180deg, #17213B 0%, #1f2c49 100%)',
          overflow: 'hidden',
        }}
      >
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="h4" fontWeight={800}>
                Rankings
              </Typography>
              <Typography color="text.secondary">
                Compare drivers by overall performance, or filter directly by license tier and Safety Rating tier.
              </Typography>
            </Stack>

            {loading && <LoadingPanel message="Loading rankings data..." />}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Paper
                  sx={{
                    ...GLASS_PANEL_SX,
                    textAlign: { xs: 'center', md: 'left' },
                  }}
                >
                  <Stack direction="row" gap={1} flexWrap="wrap" justifyContent={{ xs: 'center', md: 'flex-start' }}>
                    {[
                      { key: 'overall', label: 'Overall' },
                      { key: 'license', label: 'By License' },
                      { key: 'safety', label: 'By Safety Rating' },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        size="small"
                        variant={tab === item.key ? 'contained' : 'outlined'}
                        color={tab === item.key ? 'primary' : 'secondary'}
                        onClick={() => setTab(item.key as RankingsTab)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Stack>

                  {tab === 'license' && (
                    <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3 }}>
                        License tier
                      </Typography>
                      <FormControl size="small" sx={{ maxWidth: 360, width: '100%' }}>
                        <Select
                          value={licenseTier}
                          onChange={(event) => {
                            setLicenseTier(event.target.value);
                            setPageLicense(1);
                          }}
                          sx={{
                            borderRadius: 2,
                            color: '#fff',
                            bgcolor: 'rgba(10,22,47,0.88)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.4)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.65)',
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(173, 216, 255, 0.22)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.95)',
                              borderWidth: 2,
                            },
                            '& .MuiSelect-select': {
                              fontWeight: 700,
                            },
                            '& .MuiSvgIcon-root': {
                              color: '#dbeafe',
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: '#132447',
                                color: '#fff',
                                border: '1px solid rgba(191,225,255,0.3)',
                                mt: 0.5,
                              },
                            },
                          }}
                        >
                          {licenseTiers.map((tier) => (
                            <MenuItem
                              key={tier}
                              value={tier}
                              sx={{
                                color: '#fff',
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(191,225,255,0.2)',
                                  color: '#fff',
                                  fontWeight: 700,
                                },
                                '&.Mui-selected:hover': {
                                  bgcolor: 'rgba(191,225,255,0.28)',
                                },
                              }}
                            >
                              {tier} ({licenseCounts[tier] || 0})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}

                  {tab === 'safety' && (
                    <Stack spacing={1.2} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.78)', letterSpacing: 0.3 }}>
                        Safety Rating tier
                      </Typography>
                      <FormControl size="small" sx={{ maxWidth: 360, width: '100%' }}>
                        <Select
                          value={safetyTier}
                          onChange={(event) => {
                            setSafetyTier(event.target.value);
                            setPageSafety(1);
                          }}
                          sx={{
                            borderRadius: 2,
                            color: '#fff',
                            bgcolor: 'rgba(10,22,47,0.88)',
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.4)',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.65)',
                            },
                            '&.Mui-focused': {
                              boxShadow: '0 0 0 3px rgba(173, 216, 255, 0.22)',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.95)',
                              borderWidth: 2,
                            },
                            '& .MuiSelect-select': {
                              fontWeight: 700,
                            },
                            '& .MuiSvgIcon-root': {
                              color: '#dbeafe',
                            },
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: '#132447',
                                color: '#fff',
                                border: '1px solid rgba(191,225,255,0.3)',
                                mt: 0.5,
                              },
                            },
                          }}
                        >
                          {safetyTiers.map((tier) => (
                            <MenuItem
                              key={tier}
                              value={tier}
                              sx={{
                                color: '#fff',
                                '&.Mui-selected': {
                                  bgcolor: 'rgba(191,225,255,0.2)',
                                  color: '#fff',
                                  fontWeight: 700,
                                },
                                '&.Mui-selected:hover': {
                                  bgcolor: 'rgba(191,225,255,0.28)',
                                },
                              }}
                            >
                              {tier} ({safetyCounts[tier] || 0})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </Paper>

                <Paper
                  sx={{
                    ...GLASS_TABLE_WRAPPER_SX,
                  }}
                >
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{
                        '& .MuiTableBody-root .MuiTableRow-root:hover': {
                          backgroundColor: 'rgba(255,255,255,0.04)',
                        },
                      }}
                    >
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Driver</TableCell>
                          <TableCell>License</TableCell>
                          <TableCell>Safety Rating</TableCell>
                          <TableCell align="right">Total KM</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activeData.rows.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                              No drivers in this ranking yet.
                            </TableCell>
                          </TableRow>
                        )}

                        {activeData.rows.map((item, idx) => {
                          const pos = activeData.start + idx + 1;
                          return (
                            <TableRow
                              key={`${item.driver.guid}-${pos}`}
                              onClick={() => {
                                window.location.href = getDriverProfileHref(item.driver.guid);
                              }}
                              sx={{
                                cursor: 'pointer',
                                ...(pos >= 1 && pos <= 3 ? getPodiumRowSx(pos as 1 | 2 | 3) : {}),
                              }}
                            >
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={pos}
                                  sx={{
                                    minWidth: 38,
                                    fontWeight: 700,
                                    ...getPodiumChipSx(pos),
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{item.driver.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    size="small"
                                    label={item.license}
                                    sx={{
                                      minWidth: LICENSE_CHIP_WIDTH,
                                      fontWeight: 700,
                                      justifyContent: 'center',
                                      ...getLicenseBadgeSx(item.license),
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    {Math.round(item.paceScore).toLocaleString()}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    size="small"
                                    label={item.srTier}
                                    sx={{
                                      minWidth: SR_CHIP_WIDTH,
                                      fontWeight: 700,
                                      justifyContent: 'center',
                                      ...getSRBadgeSx(item.srTier),
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    {item.sr.toFixed(2)}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">{(item.driver.kilometers || 0).toLocaleString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>

                <Paginate
                  page={activeData.page}
                  totalPages={activeData.totalPages}
                  onChange={(newPage) => {
                    if (tab === 'overall') setPageOverall(newPage);
                    if (tab === 'license') setPageLicense(newPage);
                    if (tab === 'safety') setPageSafety(newPage);
                  }}
                />
              </>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
