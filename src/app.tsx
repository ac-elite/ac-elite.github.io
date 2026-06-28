import 'src/global.css';
// Cross-platform fallback for San Francisco (Apple devices use system SF via
// -apple-system in the theme font stack; Inter covers Windows / Android).
import '@fontsource-variable/inter';

import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { ThemeProvider } from 'src/theme/theme-provider';
import { AuthProvider } from 'src/lib/auth/auth-context';
import { refreshTrackCatalogFromDb } from 'src/lib/auth/tracks-bridge';
import { TrendWindowProvider } from 'src/lib/trend-window/trend-window-context';
import {
  recordSitePageStat,
  recordSiteVisitIfDue,
  isPathExcludedFromSiteVisitCount,
} from 'src/lib/site-visits';

import { ToastProvider } from 'src/components/toast/toast-provider';
import { SyncCanonicalMeta } from 'src/components/seo/sync-canonical';

// ----------------------------------------------------------------------

type AppProps = {
  children: React.ReactNode;
};

export default function App({ children }: AppProps) {
  useScrollToTop();
  useRecordSiteVisit();
  useLoadTrackCatalogFromDb();

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <TrendWindowProvider>
            <SyncCanonicalMeta />
            {children}
          </TrendWindowProvider>
        </ToastProvider>
      </AuthProvider>
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
  const pathname = usePathname();

  useEffect(() => {
    if (isPathExcludedFromSiteVisitCount(pathname)) return;
    recordSitePageStat(pathname);
    recordSiteVisitIfDue(pathname);
  }, [pathname]);

  return null;
}

// Bundled JSON renders instantly; this swaps in the live DB catalog once it
// arrives. Silent failure keeps the public site fully functional offline.
function useLoadTrackCatalogFromDb() {
  useEffect(() => {
    void refreshTrackCatalogFromDb();
  }, []);
  return null;
}
