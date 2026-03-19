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
import { keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { CONFIG } from 'src/config-global';
import {
  SR_TIERS,
  getDriverSR,
  getSRBadgeSx,
  type RankDriver,
  getDriverLicense,
  computeLicenseMap,
  getLicenseBadgeSx,
  LICENSE_TIER_ORDER,
  getOverallCombinedScore,
} from 'src/lib/ac-elite-data';

const RANKINGS_PER_PAGE = 20;
const APP_BASE_URL = import.meta.env.BASE_URL;

type RankingsTab = 'overall' | 'license' | 'safety';

type DriverRankData = {
  driver: RankDriver;
  license: string;
  paceScore: number;
  sr: number;
  srTier: string;
  combined: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 48px 48px, 48px 48px, 96px 0; }
`;

function getPodiumChipSx(position: number) {
  if (position === 1) {
    return {
      color: '#fef3c7',
      border: '1px solid rgba(245, 158, 11, 0.55)',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.38), rgba(245,158,11,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)',
    };
  }
  if (position === 2) {
    return {
      color: '#e2e8f0',
      border: '1px solid rgba(148, 163, 184, 0.55)',
      background: 'linear-gradient(135deg, rgba(148,163,184,0.35), rgba(148,163,184,0.12))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  if (position === 3) {
    return {
      color: '#ffedd5',
      border: '1px solid rgba(194, 101, 31, 0.6)',
      background: 'linear-gradient(135deg, rgba(194,101,31,0.36), rgba(194,101,31,0.14))',
      backdropFilter: 'blur(10px)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)',
    };
  }
  return {
    bgcolor: 'rgba(255,255,255,0.12)',
    color: '#fff',
  };
}

function getPodiumRowSx(position: number) {
  if (position === 1) {
    return {
      background:
        'linear-gradient(90deg, rgba(245,158,11,0.22) 0%, rgba(245,158,11,0.08) 60%, rgba(245,158,11,0.04) 100%)',
      borderLeft: '2px solid rgba(245, 158, 11, 0.7)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    };
  }
  if (position === 2) {
    return {
      background:
        'linear-gradient(90deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.08) 60%, rgba(148,163,184,0.03) 100%)',
      borderLeft: '2px solid rgba(148, 163, 184, 0.75)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
    };
  }
  if (position === 3) {
    return {
      background:
        'linear-gradient(90deg, rgba(194,101,31,0.22) 0%, rgba(194,101,31,0.08) 60%, rgba(194,101,31,0.03) 100%)',
      borderLeft: '2px solid rgba(194, 101, 31, 0.75)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
    };
  }
  return {};
}

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
    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
      <Button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        variant="outlined"
        size="small"
        sx={{
          color: 'rgba(255,255,255,0.9)',
          borderColor: 'rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
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
            sx={
              p === page
                ? {
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.22)',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                  }
                : {
                    color: 'rgba(255,255,255,0.9)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }
            }
          >
            {p}
          </Button>
        )
      )}
      <Button
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        variant="outlined"
        size="small"
        sx={{
          color: 'rgba(255,255,255,0.9)',
          borderColor: 'rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        Next
      </Button>
    </Stack>
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
      <meta name="description" content="AC Elite rankings by overall, licence tier, and safety tier." />

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
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.22,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),' +
              'repeating-linear-gradient(45deg, transparent, transparent 88px, rgba(147,197,253,0.15) 88px, rgba(147,197,253,0.15) 90px)',
            backgroundSize: '48px 48px, 48px 48px, 100% 100%',
            animation: `${gridMove} 22s linear infinite`,
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <Stack spacing={1}>
              <Typography variant="h4" fontWeight={800}>
                Rankings
              </Typography>
              <Typography color="text.secondary">
                Compare drivers by overall performance, or filter directly by licence tier and Safety Rating tier.
              </Typography>
            </Stack>

            {loading && (
              <Paper sx={{ p: 3 }}>
                <Typography>Loading rankings data...</Typography>
              </Paper>
            )}

            {!loading && error && (
              <Paper sx={{ p: 3 }}>
                <Typography color="error" fontWeight={700}>
                  Failed to load data
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              </Paper>
            )}

            {!loading && !error && (
              <>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
                    backdropFilter: 'blur(14px)',
                  }}
                >
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {[
                      { key: 'overall', label: 'Overall' },
                      { key: 'license', label: 'By Licence' },
                      { key: 'safety', label: 'By Safety' },
                    ].map((item) => (
                      <Button
                        key={item.key}
                        size="small"
                        variant={tab === item.key ? 'contained' : 'outlined'}
                        onClick={() => setTab(item.key as RankingsTab)}
                        sx={
                          tab === item.key
                            ? {
                                color: '#fff',
                                border: '1px solid rgba(255,255,255,0.22)',
                                background:
                                  'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                              }
                            : {
                                color: 'rgba(255,255,255,0.9)',
                                borderColor: 'rgba(255,255,255,0.3)',
                                backgroundColor: 'rgba(255,255,255,0.03)',
                              }
                        }
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
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.92)',
                              boxShadow: '0 0 0 3px rgba(173,216,255,0.2)',
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
                        Safety tier
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
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'rgba(191,225,255,0.92)',
                              boxShadow: '0 0 0 3px rgba(173,216,255,0.2)',
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
                    borderRadius: 3,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background:
                      'linear-gradient(135deg, rgba(19,36,71,0.72) 0%, rgba(35,31,32,0.45) 100%)',
                    backdropFilter: 'blur(14px)',
                    overflow: 'hidden',
                  }}
                >
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Driver</TableCell>
                          <TableCell>Licence</TableCell>
                          <TableCell>Safety Rating</TableCell>
                          <TableCell align="right">KM</TableCell>
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
                                window.location.href = `${APP_BASE_URL}driver/${encodeURIComponent(item.driver.guid)}`;
                              }}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                                ...getPodiumRowSx(pos),
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
                                      minWidth: 96,
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
                                      minWidth: 62,
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
