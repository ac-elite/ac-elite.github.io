/** Public site origin (GitHub Pages). Used for canonical / OG when not in browser. */
export const SITE_ORIGIN = 'https://ac-elite.github.io' as const;

/**
 * Current page URL without query or hash — matches what we want for `rel="canonical"`.
 * Uses `window.location` so `basename` is included correctly on GitHub Pages.
 */
export function getCanonicalPageUrl(): string {
  if (typeof window === 'undefined') return `${SITE_ORIGIN}/`;
  const { protocol, host, pathname } = window.location;
  return `${protocol}//${host}${pathname}`;
}
