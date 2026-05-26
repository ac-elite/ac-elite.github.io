import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
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
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { fetchPrevRankData } from 'src/lib/delta';
import { useWindowedDriverDeltas } from 'src/lib/trend-window/trend-window-context';
import { getSyncHealth, type SiteMetadata, getEffectiveLastSync } from 'src/lib/sync-utils';
import { subtleRowEnterSx, glassCardMotionSx } from 'src/lib/subtle-motion';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import {
  GLASS_PANEL_SX,
  getPodiumRowSx,
  GLASS_TABLE_WRAPPER_SX,
  GLASS_TABLE_PAGINATION_SX,
} from 'src/lib/glass';
import {
  GLASS_SELECT_SX,
  GLASS_SELECT_MENU_PROPS,
  GLASS_SELECT_MENU_ITEM_SX,
} from 'src/lib/glass-select';
import {
  DATA_PAGE_SHELL_SX,
  PAGINATION_NAV_BUTTON_SX,
  PAGINATION_PAGE_BUTTON_SX,
  ACTION_OUTLINED_SMALL_DENSE_SX,
  FORM_SECTION_KICKER_CAPTION_SX,
} from 'src/lib/page-shell';
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

import { Reveal } from 'src/components/reveal';
import { DeltaChip } from 'src/components/delta-chip/delta-chip';
import { EmptyState, ErrorPanel, LoadingPanel } from 'src/components/data-state';
import { DataPageHeader } from 'src/components/data-page-header/data-page-header';
import { TrendWindowStats } from 'src/components/trend-window/trend-window-stats';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';
import { useLicenseSafetyGuide } from 'src/components/license-safety-guide/license-safety-guide';

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
    <Paper sx={{ ...GLASS_TABLE_PAGINATION_SX, ...glassCardMotionSx(3) }}>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
        <Button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          variant="contained"
          color="secondary"
          size="small"
          sx={{ ...PAGINATION_NAV_BUTTON_SX }}
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
              sx={{ ...PAGINATION_PAGE_BUTTON_SX }}
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
          sx={{ ...PAGINATION_NAV_BUTTON_SX }}
        >
          Next
        </Button>
      </Stack>
    </Paper>
  );
}

export default function Page() {
  const { openGuide } = useLicenseSafetyGuide();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [prevRankData, setPrevRankData] = useState<RankDriver[]>([]);
  const [metadata, setMetadata] = useState<SiteMetadata>({});
  // Per-row SR/pace deltas follow the shared trend-window filter.
  const deltas = useWindowedDriverDeltas(rankData, prevRankData);

  const [tab, setTab] = useState<RankingsTab>('overall');
  const [licenseTier, setLicenseTier] = useState<string>('All');
  const [safetyTier, setSafetyTier] = useState<string>('All');
  const [pageOverall, setPageOverall] = useState(1);
  const [pageLicense, setPageLicense] = useState(1);
  const [pageSafety, setPageSafety] = useState(1);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, prevRank, meta] = await Promise.all([
          fetchJson<RankDriver[]>(DATA_FILES.rank),
          fetchPrevRankData(),
          fetchJson<SiteMetadata>(DATA_FILES.metadata).catch(() => ({})),
        ]);
        if (!mounted) return;
        setRankData(rank);
        setPrevRankData(prevRank);
        setMetadata(meta);
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

  const licenseTiers = useMemo(() => ['All', ...LICENSE_TIER_ORDER, 'Rookie'], []);
  const safetyTiers = useMemo(() => ['All', ...SR_TIERS.map((t) => t.name), 'F'], []);

  const licenseCounts = useMemo(() => {
    const counts: Record<string, number> = { All: enriched.length };
    licenseTiers.forEach((tier) => {
      if (tier === 'All') return;
      counts[tier] = enriched.filter((x) => x.license === tier).length;
    });
    return counts;
  }, [enriched, licenseTiers]);

  const safetyCounts = useMemo(() => {
    const counts: Record<string, number> = { All: enriched.length };
    safetyTiers.forEach((tier) => {
      if (tier === 'All') return;
      counts[tier] = enriched.filter((x) => x.srTier === tier).length;
    });
    return counts;
  }, [enriched, safetyTiers]);

  useEffect(() => {
    if (licenseTier !== 'All' && !licenseCounts[licenseTier]) {
      setLicenseTier('All');
    }
  }, [licenseCounts, licenseTier]);

  useEffect(() => {
    if (safetyTier !== 'All' && !safetyCounts[safetyTier]) {
      setSafetyTier('All');
    }
  }, [safetyCounts, safetyTier]);

  const overall = useMemo(
    () =>
      [...enriched].sort((a, b) => {
        if (b.combined !== a.combined) return b.combined - a.combined;
        return b.paceScore - a.paceScore;
      }),
    [enriched]
  );

  const byLicense = useMemo(
    () =>
      (licenseTier === 'All' ? [...enriched] : enriched.filter((x) => x.license === licenseTier)).sort(
        (a, b) => b.paceScore - a.paceScore
      ),
    [enriched, licenseTier]
  );

  const bySafety = useMemo(
    () =>
      (safetyTier === 'All' ? [...enriched] : enriched.filter((x) => x.srTier === safetyTier)).sort(
        (a, b) => b.sr - a.sr
      ),
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

  const syncHealth = useMemo(
    () => getSyncHealth(getEffectiveLastSync(metadata?.lastSync, rankData)),
    [metadata?.lastSync, rankData]
  );

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
      <meta property="og:title" content="Rankings - AC Elite" />
      <meta property="og:description" content="AC Elite rankings by overall, license tier, and safety tier." />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.rankings)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <DataPageHeader
              title="Rankings"
              description="Compare drivers by overall performance, or filter directly by license tier and Safety Rating tier."
              syncHealth={syncHealth}
            >
              {rankData.length > 0 && (
                <Box sx={{ pt: 0.5 }}>
                  <TrendWindowStats variant="community" rankData={rankData} />
                </Box>
              )}
            </DataPageHeader>

            {loading && (
              <LoadingPanel title="Loading rankings…" message="Fetching drivers, licenses, and safety tiers.">
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.06)' }} />
                  <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }} />
                </Stack>
              </LoadingPanel>
            )}

            {!loading && error && <ErrorPanel error={error} />}

            {!loading && !error && (
              <>
                <Paper
                  sx={{
                    ...GLASS_PANEL_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(1),
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
                        sx={{ ...ACTION_OUTLINED_SMALL_DENSE_SX }}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </Stack>

                  {tab === 'license' && (
                    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ ...FORM_SECTION_KICKER_CAPTION_SX }}>
                        License tier
                      </Typography>
                      <FormControl size="small" sx={{ maxWidth: 360, width: '100%' }}>
                        <Select
                          value={licenseTier}
                          onChange={(event) => {
                            setLicenseTier(event.target.value);
                            setPageLicense(1);
                          }}
                          sx={GLASS_SELECT_SX}
                          MenuProps={GLASS_SELECT_MENU_PROPS}
                        >
                          {licenseTiers.map((tier) => (
                            <MenuItem key={tier} value={tier} sx={GLASS_SELECT_MENU_ITEM_SX}>
                              {tier} ({licenseCounts[tier] || 0})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}

                  {tab === 'safety' && (
                    <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                      <Typography variant="caption" sx={{ ...FORM_SECTION_KICKER_CAPTION_SX }}>
                        Safety Rating tier
                      </Typography>
                      <FormControl size="small" sx={{ maxWidth: 360, width: '100%' }}>
                        <Select
                          value={safetyTier}
                          onChange={(event) => {
                            setSafetyTier(event.target.value);
                            setPageSafety(1);
                          }}
                          sx={GLASS_SELECT_SX}
                          MenuProps={GLASS_SELECT_MENU_PROPS}
                        >
                          {safetyTiers.map((tier) => (
                            <MenuItem key={tier} value={tier} sx={GLASS_SELECT_MENU_ITEM_SX}>
                              {tier} ({safetyCounts[tier] || 0})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  )}
                </Paper>

                <Reveal>
                <Paper
                  sx={{
                    ...GLASS_TABLE_WRAPPER_SX,
                    ...brandAccentBorderSx(),
                    ...glassCardMotionSx(2),
                  }}
                >
                  <TableContainer>
                    <Table
                      size="small"
                      sx={{
                        '& .MuiTableBody-root .MuiTableRow-root:hover': {
                          backgroundColor: 'rgba(255,255,255,0.028)',
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
                            <TableCell colSpan={5} sx={{ py: 4, px: 2 }}>
                              <EmptyState
                                title="No drivers in this ranking yet."
                                description="Try another tab or tier filter, or check back after more drivers sync into this view."
                              />
                            </TableCell>
                          </TableRow>
                        )}

                        {activeData.rows.map((item, idx) => {
                          const pos = activeData.start + idx + 1;
                          const delta = deltas.get(item.driver.guid);
                          return (
                            <TableRow
                              key={`${item.driver.guid}-${pos}`}
                              onClick={() => {
                                window.location.href = getDriverProfileHref(item.driver.guid);
                              }}
                              sx={{
                                cursor: 'pointer',
                                ...subtleRowEnterSx(idx, { baseDelayMs: 340 }),
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
                              <TableCell sx={{ fontWeight: 700 }}>
                                <Link
                                  href={getDriverProfileHref(item.driver.guid)}
                                  onClick={(e) => e.stopPropagation()}
                                  underline="none"
                                  color="inherit"
                                  sx={{ fontWeight: 700 }}
                                >
                                  {item.driver.name || 'Unknown'}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    size="small"
                                    label={item.license}
                                    onClick={(e) => { e.stopPropagation(); openGuide('license'); }}
                                    sx={{
                                      minWidth: LICENSE_CHIP_WIDTH,
                                      fontWeight: 700,
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      ...getLicenseBadgeSx(item.license),
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    {Math.round(item.paceScore).toLocaleString()}
                                  </Typography>
                                  {delta ? <DeltaChip value={Math.round(delta.deltaPace)} /> : null}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Chip
                                    size="small"
                                    label={item.srTier}
                                    onClick={(e) => { e.stopPropagation(); openGuide('safety'); }}
                                    sx={{
                                      minWidth: SR_CHIP_WIDTH,
                                      fontWeight: 700,
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      ...getSRBadgeSx(item.srTier),
                                    }}
                                  />
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                                    {item.sr.toFixed(2)}
                                  </Typography>
                                  {delta ? <DeltaChip value={delta.deltaSR} decimals={2} kind="sr" /> : null}
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
                </Reveal>

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
