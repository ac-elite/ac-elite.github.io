import { useRef, useState, useEffect } from 'react';

import { fetchJson } from 'src/lib/fetch-json';
import { DATA_FILES as DATA_FILE_PATHS } from 'src/centralized/data-files';
import {
  pickNewerCurrentTrack,
  toCurrentTrackPayload,
  type CurrentTrackPayload,
  LIVE_SERVER_STATUS_POLL_MS,
  shouldPollLiveServerStatus,
  canAttemptLiveServerStatusFetch,
  fetchLiveServerStatusFromSupabase,
} from 'src/lib/server-status';

export type AdminMetadata = {
  lastSync?: string;
  status?: string;
  error?: string;
  rank24hSnapshotAt?: string;
};

export type AdminLiveData = {
  metadata: AdminMetadata | null;
  currentTrack: CurrentTrackPayload | null;
};

/**
 * Shared hook used by every admin sub-page that needs `metadata.json` and the
 * live current-track snapshot. Each page mounts its own copy — fetches are
 * cheap and this avoids dragging a context across the layout.
 */
export function useAdminLiveData(): AdminLiveData {
  const [data, setData] = useState<AdminLiveData>({ metadata: null, currentTrack: null });
  const staticCurrentTrackRef = useRef<CurrentTrackPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetchJson<AdminMetadata>(DATA_FILE_PATHS.metadata),
      fetchJson<CurrentTrackPayload>(DATA_FILE_PATHS.currentTrack),
    ]).then((results) => {
      if (!mounted) return;
      const staticTrack = results[1].status === 'fulfilled' ? results[1].value : null;
      staticCurrentTrackRef.current = staticTrack;
      setData({
        metadata: results[0].status === 'fulfilled' ? results[0].value : null,
        currentTrack: toCurrentTrackPayload(staticTrack),
      });
      if (canAttemptLiveServerStatusFetch()) {
        void fetchLiveServerStatusFromSupabase().then((live) => {
          if (!mounted || !live) return;
          const base = toCurrentTrackPayload(staticCurrentTrackRef.current);
          setData((prev) => ({
            ...prev,
            currentTrack: pickNewerCurrentTrack(base ?? toCurrentTrackPayload(prev.currentTrack), live),
          }));
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!shouldPollLiveServerStatus()) return undefined;
    let mounted = true;
    const id = window.setInterval(() => {
      void fetchLiveServerStatusFromSupabase().then((live) => {
        if (!mounted || !live) return;
        const base = toCurrentTrackPayload(staticCurrentTrackRef.current);
        setData((prev) => ({
          ...prev,
          currentTrack: pickNewerCurrentTrack(base ?? toCurrentTrackPayload(prev.currentTrack), live),
        }));
      });
    }, LIVE_SERVER_STATUS_POLL_MS);
    return () => {
      mounted = false;
      window.clearInterval(id);
    };
  }, [data.currentTrack?.fetchedAt]);

  return data;
}
