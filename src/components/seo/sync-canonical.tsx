import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { getCanonicalPageUrl } from 'src/lib/seo';

/**
 * SPA: keep `<link rel="canonical">`, `og:url`, and `twitter:url` in sync after client navigations
 * (initial HTML from `/dashboard/index.html` etc. is correct for crawlers that only fetch static files).
 */
export function SyncCanonicalMeta() {
  const pathname = usePathname();

  useEffect(() => {
    const url = getCanonicalPageUrl();

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);

    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
    document.querySelector('meta[name="twitter:url"]')?.setAttribute('content', url);
  }, [pathname]);

  return null;
}
