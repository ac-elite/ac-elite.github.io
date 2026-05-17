import { useMemo, useState, useEffect, type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/config-global';
import { APP_ROUTES } from 'src/centralized/app-routes';
import { DATA_FILES } from 'src/centralized/data-files';
import { fetchJson } from 'src/lib/fetch-json';
import { getDriverProfileHref } from 'src/lib/routes';
import { getSiteUrl } from 'src/centralized/site-urls';
import { getSyncHealth, type SiteMetadata } from 'src/lib/sync-utils';
import { ACE_SKIN_PACK_DOWNLOAD_URL } from 'src/lib/ace-skin-pack-download';
import { glassCardMotionSx, softFloatWrapperSx } from 'src/lib/subtle-motion';
import { GLASS_PANEL_TIGHT_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { liveriesAssetUrl, promoLiveryAssetUrl, TEAM_LIVERY_ENTRIES } from 'src/lib/driver-liveries';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { DATA_PAGE_SHELL_SX, OUTLINED_GLASS_WHITE_SX, HERO_FOOTNOTE_CAPTION_SX } from 'src/lib/page-shell';
import {
  getAceSkinPackAuthorForEntryId,
  flattenAceSkinPackOrderedEntries,
} from 'src/lib/ace-skin-pack-teams';

import { LiveryEnlargeDialog } from 'src/components/livery/livery-enlarge-dialog';
import { DataPageHeader } from 'src/components/data-page-header/data-page-header';
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
    image: promoLiveryAssetUrl('car1.jpg'),
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

type AceSkinPackEntry = {
  id: string;
  title: string;
  previewUrl: string;
};

type AceSkinPackManifest = {
  generatedAt?: string;
  entries: AceSkinPackEntry[];
};

type LiveryShowcaseSectionsConfig = {
  officialPack: boolean;
  aceSkinPack: boolean;
  teamLiveries: boolean;
};

const DEFAULT_SECTIONS_CONFIG: LiveryShowcaseSectionsConfig = {
  officialPack: true,
  aceSkinPack: true,
  teamLiveries: true,
};

function capitalizeFirst(s: string) {
  return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s;
}

/** Hero + SEO lines derived from which galleries are enabled (see `public/data/livery-showcase-sections.json`). */
function buildShowcasePageCopy(sections: LiveryShowcaseSectionsConfig | null): {
  heroSubtitle: string;
  metaDescription: string;
  ogDescription: string;
} {
  if (!sections) {
    return {
      heroSubtitle:
        'Browse highlighted liveries from AC Elite; which galleries appear is configured for this deployment.',
      metaDescription:
        'AC Elite livery showcase — previews and download links. Click any image for a full-size view.',
      ogDescription: 'Livery previews for the AC Elite simracing community.',
    };
  }

  const { officialPack, aceSkinPack, teamLiveries } = sections;
  const count = Number(officialPack) + Number(aceSkinPack) + Number(teamLiveries);

  if (count === 0) {
    return {
      heroSubtitle: 'No livery galleries are enabled on this page right now.',
      metaDescription: 'AC Elite livery showcase.',
      ogDescription: 'AC Elite livery showcase.',
    };
  }

  if (count === 1) {
    if (aceSkinPack) {
      return {
        heroSubtitle:
          'This page lists the ACE skin pack — optional paints you can install for Assetto Corsa.',
        metaDescription:
          'Browse the AC Elite ACE skin pack: previews and download. Click any image for a full-size view.',
        ogDescription: 'ACE skin pack liveries for the AC Elite simracing community.',
      };
    }
    if (officialPack) {
      return {
        heroSubtitle:
          'This page lists the official default-pack paints included with the AC Elite livery pack.',
        metaDescription:
          'Browse the AC Elite official default-pack liveries. Click any image for a full-size view.',
        ogDescription: 'Official AC Elite default-pack liveries.',
      };
    }
    return {
      heroSubtitle: 'This page lists AC Elite team liveries.',
      metaDescription: 'Browse AC Elite team liveries. Click any image for a full-size view.',
      ogDescription: 'AC Elite team liveries.',
    };
  }

  const phrases: string[] = [];
  if (officialPack) phrases.push('official default-pack paints');
  if (aceSkinPack) phrases.push('the ACE skin pack');
  if (teamLiveries) phrases.push('AC Elite team liveries');

  const heroFirst = capitalizeFirst(phrases[0] ?? '');
  const heroSubtitle =
    phrases.length === 2
      ? `${heroFirst} and ${phrases[1]}.`
      : `${heroFirst}, ${phrases[1]}, and ${phrases[2]}.`;

  const metaList =
    phrases.length === 2
      ? `${capitalizeFirst(phrases[0]!)} and ${phrases[1]}`
      : `${capitalizeFirst(phrases[0]!)}, ${phrases[1]}, and ${phrases[2]}`;
  const metaDescription = `Browse AC Elite liveries: ${metaList}. Click any image for a full-size view.`;
  const ogDescription = `Livery previews on AC Elite — ${metaList}.`;

  return { heroSubtitle, metaDescription, ogDescription };
}

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
  const [aceSkinPack, setAceSkinPack] = useState<AceSkinPackEntry[] | null>(null);
  /** `null` until `/data/livery-showcase-sections.json` loads — avoids flashing defaults (all `true`) before fetch. */
  const [sectionsConfig, setSectionsConfig] = useState<LiveryShowcaseSectionsConfig | null>(null);
  const [metadata, setMetadata] = useState<SiteMetadata>({});

  const syncHealth = useMemo(() => getSyncHealth(metadata?.lastSync), [metadata?.lastSync]);

  useEffect(() => {
    let mounted = true;
    fetchJson<AceSkinPackManifest>(DATA_FILES.aceSkinPack)
      .then((data) => {
        if (mounted) setAceSkinPack(Array.isArray(data.entries) ? data.entries : []);
      })
      .catch(() => {
        if (mounted) setAceSkinPack([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchJson<SiteMetadata>(DATA_FILES.metadata)
      .then((data) => {
        if (mounted) setMetadata(data && typeof data === 'object' ? data : {});
      })
      .catch(() => {
        if (mounted) setMetadata({});
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchJson<Partial<LiveryShowcaseSectionsConfig>>(DATA_FILES.liveryShowcaseSections)
      .then((data) => {
        if (!mounted || !data) return;
        setSectionsConfig({
          officialPack: typeof data.officialPack === 'boolean' ? data.officialPack : DEFAULT_SECTIONS_CONFIG.officialPack,
          aceSkinPack: typeof data.aceSkinPack === 'boolean' ? data.aceSkinPack : DEFAULT_SECTIONS_CONFIG.aceSkinPack,
          teamLiveries: typeof data.teamLiveries === 'boolean' ? data.teamLiveries : DEFAULT_SECTIONS_CONFIG.teamLiveries,
        });
      })
      .catch(() => {
        if (mounted) setSectionsConfig(DEFAULT_SECTIONS_CONFIG);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const aceSkinPackOrdered = useMemo(() => {
    if (!aceSkinPack?.length) return [];
    return flattenAceSkinPackOrderedEntries(aceSkinPack);
  }, [aceSkinPack]);

  const showcaseCopy = useMemo(() => buildShowcasePageCopy(sectionsConfig), [sectionsConfig]);

  return (
    <>
      <title>{`Livery Showcase - ${CONFIG.appName}`}</title>
      <meta name="description" content={showcaseCopy.metaDescription} />
      <meta property="og:title" content="Livery Showcase - AC Elite" />
      <meta property="og:description" content={showcaseCopy.ogDescription} />
      <meta property="og:url" content={getSiteUrl(APP_ROUTES.liveryShowcase)} />

      <Box sx={{ ...DATA_PAGE_SHELL_SX }}>
        <PageGridOverlay />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Stack spacing={3}>
            <DataPageHeader
              title="Livery Showcase"
              description={showcaseCopy.heroSubtitle}
              syncHealth={syncHealth}
            >
              <Typography variant="caption" sx={{ ...HERO_FOOTNOTE_CAPTION_SX }}>
                Click any image for a full-size view.
              </Typography>
            </DataPageHeader>

            <Stack spacing={3}>
              {sectionsConfig?.officialPack && (
                <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
                <Box sx={softFloatWrapperSx()}>
                  <Box sx={{ ...GLASS_PANEL_TIGHT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                    <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        Official pack
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Included with the standard AC Elite livery pack.
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
                <Grid container spacing={2} sx={{ width: 1 }}>
                  {generalLiveries.map((livery, i) => (
                    <Grid key={livery.name} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        sx={{
                          ...GLASS_PANEL_TIGHT_SX,
                          ...brandAccentBorderSx(),
                          ...glassCardMotionSx(1 + i),
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
              )}

              {sectionsConfig?.aceSkinPack && aceSkinPack && aceSkinPack.length > 0 && (
                <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
                  <Box sx={softFloatWrapperSx()}>
                    <Box sx={{ ...GLASS_PANEL_TIGHT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={1.5}
                        alignItems={{ xs: 'flex-start', md: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack spacing={0.5} sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            ACE Skin Pack
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            The full ACE Skin Pack for Assetto Corsa: install it in your game to drive these liveries. Each card shows the author (linked to their driver profile).
                          </Typography>
                        </Stack>
                        <Button
                          component="a"
                          href={ACE_SKIN_PACK_DOWNLOAD_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="outlined"
                          size="small"
                          sx={{ ...OUTLINED_GLASS_WHITE_SX, flexShrink: 0 }}
                        >
                          Download ACE skin pack
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                  <Grid container spacing={2} sx={{ width: 1 }}>
                    {aceSkinPackOrdered.map((entry, i) => {
                      const src = publicAsset(entry.previewUrl);
                      const alt = `AC Elite skin pack preview · ${entry.title}`;
                      const author = getAceSkinPackAuthorForEntryId(entry.id);
                      return (
                        <Grid key={entry.id} size={{ xs: 12, sm: 6, md: 4 }}>
                          <Paper
                            sx={{
                              ...GLASS_PANEL_TIGHT_SX,
                              ...brandAccentBorderSx(),
                              ...glassCardMotionSx(4 + i),
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
                                    src,
                                    alt,
                                    title: entry.title,
                                    subtitle: entry.id,
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
                                    src={src}
                                    alt={alt}
                                    loading="lazy"
                                    sx={liveryThumbImageSx}
                                  />
                                </LiveryThumbButton>
                              </Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 0.25 }}>
                                {entry.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.25, display: 'block' }}>
                                Author:{' '}
                                {author ? (
                                  <Link
                                    component={RouterLink}
                                    href={getDriverProfileHref(author.guid)}
                                    variant="caption"
                                    underline="hover"
                                    color="inherit"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    {author.displayName}
                                  </Link>
                                ) : (
                                  '—'
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', px: 0.25, display: 'block' }}
                              >
                                {entry.id}
                              </Typography>
                            </Stack>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Stack>
              )}

              {sectionsConfig?.teamLiveries && (
                <Stack spacing={2} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: 'stretch' }}>
                <Box sx={softFloatWrapperSx()}>
                  <Box sx={{ ...GLASS_PANEL_TIGHT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
                    <Stack spacing={0.5} sx={{ textAlign: { xs: 'center', md: 'left' }, alignItems: { xs: 'center', md: 'flex-start' } }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        AC Elite Team
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Team and collaborator liveries.
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
                <Grid container spacing={2} sx={{ width: 1 }}>
                  {TEAM_LIVERY_ENTRIES.map((livery, i) => {
                    const image = liveriesAssetUrl(livery.steamGuid);
                    return (
                      <Grid key={livery.steamGuid} size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper
                          sx={{
                            ...GLASS_PANEL_TIGHT_SX,
                            ...brandAccentBorderSx(),
                            ...glassCardMotionSx(6 + aceSkinPackOrdered.length + i),
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
              )}
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
