import 'src/global.css';

import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { ThemeProvider } from 'src/theme/theme-provider';
import { recordVisitOncePerSession } from 'src/lib/site-visits';

import { SyncCanonicalMeta } from 'src/components/seo/sync-canonical';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();
  useRecordSiteVisit();

  return (
    <ThemeProvider>
      <SyncCanonicalMeta />
      {children}
    </ThemeProvider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function useRecordSiteVisit() {
  useEffect(() => {
    recordVisitOncePerSession();
  }, []);

  return null;
}
