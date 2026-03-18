import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import { keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
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
          <Stack spacing={2.5}>
            <Stack spacing={0.75}>
              <Typography variant="h4" fontWeight={800}>
                Rankings
              </Typography>
              <Typography color="text.secondary">
                Ranked by overall (70% pace + 30% SR), by licence tier, or by safety tier.
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
                    p: 2,
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
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                      {licenseTiers.map((tier) => (
                        <Button
                          key={tier}
                          size="small"
                          variant={tier === licenseTier ? 'contained' : 'outlined'}
                          onClick={() => {
                            setLicenseTier(tier);
                            setPageLicense(1);
                          }}
                          sx={
                            tier === licenseTier
                              ? { ...getLicenseBadgeSx(tier), fontWeight: 700 }
                              : {
                                  color: 'rgba(255,255,255,0.9)',
                                  borderColor: 'rgba(255,255,255,0.3)',
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                }
                          }
                        >
                          {tier} ({licenseCounts[tier] || 0})
                        </Button>
                      ))}
                    </Stack>
                  )}

                  {tab === 'safety' && (
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                      {safetyTiers.map((tier) => (
                        <Button
                          key={tier}
                          size="small"
                          variant={tier === safetyTier ? 'contained' : 'outlined'}
                          onClick={() => {
                            setSafetyTier(tier);
                            setPageSafety(1);
                          }}
                          sx={
                            tier === safetyTier
                              ? { ...getSRBadgeSx(tier), fontWeight: 700 }
                              : {
                                  color: 'rgba(255,255,255,0.9)',
                                  borderColor: 'rgba(255,255,255,0.3)',
                                  backgroundColor: 'rgba(255,255,255,0.03)',
                                }
                          }
                        >
                          {tier} ({safetyCounts[tier] || 0})
                        </Button>
                      ))}
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
                          <TableCell>SR</TableCell>
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
                                window.location.href = `${APP_BASE_URL}?driver=${encodeURIComponent(item.driver.guid)}#driver-search`;
                              }}
                              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}
                            >
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={pos}
                                  sx={{
                                    minWidth: 38,
                                    fontWeight: 700,
                                    bgcolor: 'rgba(255,255,255,0.12)',
                                    color: '#fff',
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>{item.driver.name || 'Unknown'}</TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${item.license} | ${Math.round(item.paceScore).toLocaleString()}`}
                                  sx={{ fontWeight: 700, ...getLicenseBadgeSx(item.license) }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${item.srTier} | ${item.sr.toFixed(2)}`}
                                  sx={{ fontWeight: 700, ...getSRBadgeSx(item.srTier) }}
                                />
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
