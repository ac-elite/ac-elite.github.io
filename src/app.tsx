import 'src/global.css';

import { useEffect } from 'react';

import { usePathname } from 'src/routes/hooks';

import { ThemeProvider } from 'src/theme/theme-provider';
import { AuthProvider } from 'src/lib/auth/auth-context';
import { refreshTrackCatalogFromDb } from 'src/lib/auth/tracks-bridge';
import {
  recordSiteVisitIfDue,
  recordSitePageStat,
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
          <SyncCanonicalMeta />
          {children}
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
