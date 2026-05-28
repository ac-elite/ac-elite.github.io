import { useState, useEffect, useCallback } from 'react';

import { fetchAdminSyncStatus, type AdminSyncStatus } from 'src/lib/admin/sync-status';

/** Shared Supabase sync probes for the admin Overview panel and data freshness table. */
export function useAdminSyncStatus() {
  const [status, setStatus] = useState<AdminSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminSyncStatus();
    setStatus(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    void fetchAdminSyncStatus().then((result) => {
      if (!mounted) return;
      setStatus(result);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { status, loading, refresh };
}
