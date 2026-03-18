import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import { keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { CONFIG } from 'src/config-global';

type RankDriver = {
  guid: string;
  name?: string;
  kilometers?: number;
};

type Metadata = {
  lastSync?: string;
  status?: string;
  error?: string;
};

const APP_BASE_URL = import.meta.env.BASE_URL;

async function fetchJson<T>(url: string): Promise<T> {
  const requestUrl = url.startsWith('/') ? `${APP_BASE_URL}${url.replace(/^\//, '')}` : url;
  const res = await fetch(requestUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

const gridMove = keyframes`
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 48px 48px, 48px 48px; }
`;

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rankData, setRankData] = useState<RankDriver[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<Record<string, any>>({});
  const [metadata, setMetadata] = useState<Metadata>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rank, leaderboard, meta] = await Promise.all([
          fetchJson<RankDriver[]>('/data/rank.json'),
          fetchJson<Record<string, any>>('/data/leaderboard.json'),
          fetchJson<Metadata>('/data/metadata.json'),
        ]);

        if (!mounted) return;
        setRankData(rank);
        setLeaderboardData(leaderboard);
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

  const quickStats = useMemo(() => {
    const totalDrivers = rankData.length;
    const totalTracks = Object.keys(leaderboardData || {}).length;

    let totalLaps = 0;
    let totalKm = 0;

    for (const d of rankData) totalKm += d.kilometers || 0;

    for (const track of Object.values(leaderboardData || {})) {
      // track -> { [carId]: arrayOfRows }
      if (!track || typeof track !== 'object') continue;
      for (const carRows of Object.values(track as Record<string, any>)) {
        if (Array.isArray(carRows)) totalLaps += carRows.length;
      }
    }

    return {
      totalDrivers,
      totalTracks,
      totalLaps,
      totalKm: Math.round(totalKm),
    };
  }, [leaderboardData, rankData]);

  const lastSync = metadata?.lastSync;
  const lastSyncText = lastSync ? new Date(lastSync).toLocaleString() : '—';

  return (
    <>
      <title>{`Stats - ${CONFIG.appName}`}</title>

      <meta name="description" content="AC Elite Stats (v2)" />
      <meta name="keywords" content="react,material,kit,stats,ac elite" />

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
            opacity: 0.45,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px),' +
              'repeating-linear-gradient(45deg, transparent, transparent 92px, rgba(147,197,253,0.16) 92px, rgba(147,197,253,0.16) 94px)',
            backgroundSize: '48px 48px, 48px 48px, 100% 100%',
            animation: `${gridMove} 20s linear infinite`,
            mixBlendMode: 'screen',
          }}
        />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Stack spacing={3}>
          <Stack spacing={0.75}>
            <Typography variant="h4" fontWeight={800} sx={{ letterSpacing: 0.5 }}>
              Stats
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Live data from <code>/data</code>. Last sync: {lastSyncText}
            </Typography>
          </Stack>

          {loading && (
            <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.3)' }}>
              <Typography>Loading data…</Typography>
            </Paper>
          )}

          {!loading && error && (
            <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.3)' }}>
              <Typography color="error" fontWeight={700}>
                Failed to load data
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {error}
              </Typography>
              <Button
                sx={{
                  mt: 2,
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.22)',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(173,216,255,0.1) 100%)',
                  backdropFilter: 'blur(12px)',
                  boxShadow:
                    '0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.22)',
                  '&:hover': {
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(173,216,255,0.16) 100%)',
                    borderColor: 'rgba(255,255,255,0.3)',
                  },
                }}
                variant="contained"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </Paper>
          )}

          {!loading && !error && (
            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Drivers
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalDrivers)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Tracks
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalTracks)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total Laps
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalLaps)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.3)' }}>
                  <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.78)' }}>
                    Total KM
                  </Typography>
                  <Typography variant="h2" sx={{ fontSize: 40, fontWeight: 900, mt: 0.5 }}>
                    {formatNumber(quickStats.totalKm)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Next: implement Leaderboard/Rankings/Hall of Fame pages.
            </Typography>
          </Box>
        </Stack>
      </Container>
      </Box>
    </>
  );
}
