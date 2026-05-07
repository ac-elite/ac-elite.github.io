import { SITE_ORIGIN } from 'src/lib/seo';

export { SITE_ORIGIN };
export const SITE_REPO_URL = 'https://github.com/ac-elite/ac-elite.github.io' as const;

export function getSiteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}
