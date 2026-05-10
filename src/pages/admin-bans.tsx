import Box from '@mui/material/Box';

import { AdminPageShell } from 'src/components/admin/admin-page-shell';
import { DriverBansManager } from 'src/components/driver-bans-manager/driver-bans-manager';

export default function Page() {
  return (
    <AdminPageShell
      title="Bans"
      description="Manage which drivers are hidden from the public leaderboard and rankings."
      documentTitle="Admin · Bans"
    >
      <Box>
        <DriverBansManager />
      </Box>
    </AdminPageShell>
  );
}
