import Box from '@mui/material/Box';

import { useTrackCatalogVersion } from 'src/centralized/track-info';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';
import { TrackCatalogManager } from 'src/components/track-catalog-manager/track-catalog-manager';

export default function Page() {
  useTrackCatalogVersion();

  return (
    <AdminPageShell
      title="Tracks"
      description="Manage the track catalog the website uses for display names, ratings, and metadata."
      documentTitle="Admin · Tracks"
    >
      <Box>
        <TrackCatalogManager />
      </Box>
    </AdminPageShell>
  );
}
