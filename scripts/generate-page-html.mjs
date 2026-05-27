/**
 * Post-build script: generates per-route HTML files with page-specific
 * OG / Twitter meta tags so social crawlers (Discord, Twitter, Facebook)
 * show the correct embed when a specific page URL is shared.
 *
 * Reads dist/index.html as template, replaces title + OG + Twitter tags,
 * writes dist/<route>/index.html for each known route.
 *
 * No extra dependencies — uses only Node built-ins.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const SITE = 'https://ac-elite.github.io';

const PAGES = [
  {
    route: 'dashboard',
    title: 'Stats - AC Elite',
    description: 'AC Elite community stats: driver counts, lap totals, and track activity.',
  },
  {
    route: 'leaderboard',
    title: 'Leaderboard - AC Elite',
    description: 'AC Elite leaderboard by track. Compare lap times and find the fastest drivers.',
  },
  {
    route: 'rankings',
    title: 'Rankings - AC Elite',
    description: 'AC Elite rankings by overall, license tier, and safety tier.',
  },
  {
    route: 'hall-of-fame',
    title: 'Hall of Fame - AC Elite',
    description: 'AC Elite Hall of Fame with standout drivers and team members.',
  },
  {
    route: 'livery-showcase',
    title: 'Livery Showcase - AC Elite',
    description:
      'Browse the AC Elite ACE skin pack: previews and download. Click any image for a full-size view.',
  },
  {
    route: 'setup-store',
    title: 'Setup Store - AC Elite',
    description:
      'AC Elite setup store: community Assetto Corsa car setups (preview). Browse qualy, race and wet baselines.',
  },
  {
    route: 'results',
    title: 'Results - AC Elite',
    description:
      'AC Elite session results: review every race, qualify and practice with full classification, laps and incidents.',
  },
];

function replaceTag(html, attr, value) {
  const re = new RegExp(
    `(<meta\\s[^>]*${attr.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')}\\s[^>]*content=")[^"]*(")`
  );
  return html.replace(re, `$1${value}$2`);
}

function replaceCanonical(html, href) {
  return html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${href}" />`
  );
}

const template = readFileSync(join(DIST, 'index.html'), 'utf-8');

for (const page of PAGES) {
  let html = template;
  const url = `${SITE}/${page.route}`;

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);

  html = replaceTag(html, 'property="og:title"', page.title);
  html = replaceTag(html, 'property="og:description"', page.description);
  html = replaceTag(html, 'property="og:url"', url);
  html = replaceTag(html, 'name="twitter:title"', page.title);
  html = replaceTag(html, 'name="twitter:description"', page.description);
  html = replaceTag(html, 'name="twitter:url"', url);
  html = replaceTag(html, 'name="description"', page.description);
  html = replaceCanonical(html, url);

  const dir = join(DIST, page.route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`  ✓ ${page.route}/index.html`);
}

console.log(`\nGenerated ${PAGES.length} page-specific HTML files.\n`);
