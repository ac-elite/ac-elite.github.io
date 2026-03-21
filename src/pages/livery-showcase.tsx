import { useState, type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { getDriverProfileHref } from 'src/lib/routes';
import { GLASS_PANEL_TIGHT_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { liveriesAssetUrl, TEAM_LIVERY_ENTRIES } from 'src/lib/driver-liveries';

import { LiveryEnlargeDialog } from 'src/components/livery/livery-enlarge-dialog';
import { PageGridOverlay } from 'src/components/page-background/page-grid-overlay';

function publicAsset(path: string) {
  const base = import.meta.env.BASE_URL;
  const root = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${root}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Taller frame + slight zoom so showroom-style shots fill the card (source images often have extra padding). */
const LIVERY_THUMB_FRAME_HEIGHT = { xs: 200, sm: 228, md: 252 } as const;

const liveryThumbImageSx = {
  width: 1,
  height: 1,
  objectFit: 'cover' as const,
  objectPosition: '50% 48%',
  display: 'block',
  pointerEvents: 'none' as const,
  transform: 'scale(1.32)',
  transformOrigin: 'center center',
  '@media (prefers-reduced-motion: reduce)': {
    transform: 'none',
  },
};

/** Default pack */
const generalLiveries = [
  {
    name: 'Car 1',
    image: publicAsset('/assets/liveries/car1.jpg'),
    alt: 'AC Elite default pack livery (Car 1)',
    subtitle: 'Default livery pack · Car 1',
  },
] as const;

type ImagePreviewState = {
  src: string;
  alt: string;
  title: string;
  subtitle?: string;
  /** Links to `/driver/:guid` in dialog footer when set. */
  profileGuid?: string;
};

function LiveryThumbButton({
  preview,
  onOpen,
  children,
  sx,
}: {
  preview: ImagePreviewState;
  onOpen: (p: ImagePreviewState) => void;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(preview)}
      aria-label={`Enlarge image: ${preview.title}`}
      sx={{
        border: 'none',
        background: 'none',
        padding: 0,
        margin: 0,
        width: '100%',
        height: '100%',
        minWidth: 0,
        display: 'block',
        cursor: 'zoom-in',
        borderRadius: 'inherit',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'inherit',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        '&:hover': {
          transform: 'scale(1.02)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

export default function Page() {
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);

  return (
    <>
      <title>{`Livery Showcase - ${CONFIG.appName}`}</title>
      <meta
        name="description"
        content="Browse AC Elite liveries: official default pack paints and AC Elite team designs. Click any image for a full-size view."
      />
      <meta property="og:title" content="Livery Showcase - AC Elite" />
      <meta property="og:description" content="Official and team livery designs for the AC Elite simracing community." />
      <meta property="og:url" content="https://ac-elite.github.io/livery-showcase" />

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
            <Stack spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
              <Typography variant="h4" fontWeight={800}>
                Livery Showcase
              </Typography>
              <Typography color="text.secondary">
                Official default-pack paints and AC Elite team liveries.
                view.
              </Typography>
            </Stack>

            <Stack spacing={3}>
              <Stack spacing={1.2} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Official pack
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Included with the standard AC Elite livery pack.
                </Typography>
                <Grid container spacing={2} sx={{ width: 1 }}>
                  {generalLiveries.map((livery) => (
                    <Grid key={livery.name} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        sx={{
                          ...GLASS_PANEL_TIGHT_SX,
                          width: 1,
                        }}
                      >
                        <Stack spacing={1}>
                          <Box
                            sx={{
                              ...GLASS_INNER_PANEL_SX,
                              width: 1,
                              height: LIVERY_THUMB_FRAME_HEIGHT,
                              p: 0,
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                          >
                            <LiveryThumbButton
                              preview={{
                                src: livery.image,
                                alt: livery.alt,
                                title: livery.name,
                                subtitle: livery.subtitle,
                              }}
                              onOpen={setImagePreview}
                              sx={{
                                position: 'relative',
                                minHeight: 0,
                                width: 1,
                                height: 1,
                              }}
                            >
                              <Box component="img" src={livery.image} alt={livery.alt} sx={liveryThumbImageSx} />
                            </LiveryThumbButton>
                          </Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                            {livery.name}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Stack>

              <Stack spacing={1.2} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  AC Elite Team
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Team and collaborator liveries for admins, moderators, and creators.
                </Typography>
                <Grid container spacing={2} sx={{ width: 1 }}>
                  {TEAM_LIVERY_ENTRIES.map((livery) => {
                    const image = liveriesAssetUrl(livery.steamGuid);
                    return (
                      <Grid key={livery.steamGuid} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          sx={{
                            ...GLASS_PANEL_TIGHT_SX,
                            width: 1,
                          }}
                        >
                          <Stack spacing={1}>
                            <Box
                              sx={{
                                ...GLASS_INNER_PANEL_SX,
                                width: 1,
                                height: LIVERY_THUMB_FRAME_HEIGHT,
                                p: 0,
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <LiveryThumbButton
                                preview={{
                                  src: image,
                                  alt: livery.alt,
                                  title: livery.showcaseTitle,
                                  subtitle: livery.owner,
                                  profileGuid: livery.steamGuid,
                                }}
                                onOpen={setImagePreview}
                                sx={{
                                  position: 'relative',
                                  minHeight: 0,
                                  width: 1,
                                  height: 1,
                                }}
                              >
                                <Box
                                  component="img"
                                  src={image}
                                  alt={livery.alt}
                                  loading="lazy"
                                  sx={liveryThumbImageSx}
                                />
                              </LiveryThumbButton>
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 0.25 }}>
                              {livery.showcaseTitle}
                            </Typography>
                            <Link
                              component={RouterLink}
                              href={getDriverProfileHref(livery.steamGuid)}
                              variant="body2"
                              underline="hover"
                              color="text.secondary"
                              sx={{ px: 0.25, display: 'block' }}
                            >
                              {livery.owner}
                            </Link>
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <LiveryEnlargeDialog
        open={imagePreview !== null}
        onClose={() => setImagePreview(null)}
        title={imagePreview?.title ?? ''}
        src={imagePreview?.src ?? ''}
        alt={imagePreview?.alt ?? ''}
        subtitle={imagePreview?.subtitle}
        footer={
          imagePreview?.profileGuid ? (
            <Link
              component={RouterLink}
              href={getDriverProfileHref(imagePreview.profileGuid)}
              variant="body2"
              underline="hover"
              color="text.secondary"
            >
              Driver profile
            </Link>
          ) : null
        }
      />
    </>
  );
}
