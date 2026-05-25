import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { Icon } from '@iconify/react';

import { useToast } from 'src/components/toast/toast-provider';
import { ROLE_CHIP_SX } from 'src/lib/ac-elite-data';
import {
  useAuth,
  ROLE_LABEL,
  type AppRole,
  hasAtLeastRole,
  ROLE_TO_CHIP_STYLE,
} from 'src/lib/auth/auth-context';
import {
  addBan,
  useBans,
  removeBan,
  clearBanAudit,
  fetchBanAudit,
  type BanEntry,
  type BanAuditRow,
  useDriverDirectory,
  type DriverDirectory,
  type DriverDirectoryEntry,
} from 'src/lib/auth/bans-db';
import { GLASS_CARD_SX, GLASS_PANEL_COMPACT_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import { TABLE_HEAD_MUTED_COLOR, ACTION_CONTAINED_PRIMARY_SMALL_SX } from 'src/lib/page-shell';

// ----------------------------------------------------------------------

const GUID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function formatError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const bodyCellSx = {
  borderBottom: '1px solid rgba(148,163,184,0.1)',
  py: 1.35,
  verticalAlign: 'top' as const,
};

// ----------------------------------------------------------------------

export function DriverBansManager() {
  const auth = useAuth();
  const toast = useToast();
  const { bans, audit, loading, error, reload, setBans } = useBans();
  const directory = useDriverDirectory();
  const [auditRows, setAuditRows] = useState<BanAuditRow[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);

  const canEdit = hasAtLeastRole(auth.profile, 'moderator');
  const canClearAudit = hasAtLeastRole(auth.profile, 'owner');
  const showActionsColumn = canEdit;

  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<BanEntry | null>(null);
  const [removeContext, setRemoveContext] = useState('');
  const [confirmClearAudit, setConfirmClearAudit] = useState(false);
  const [working, setWorking] = useState(false);

  // Reset the unban context whenever the confirm dialog opens for a new row.
  useEffect(() => {
    if (confirmRemove) setRemoveContext('');
  }, [confirmRemove]);

  // The hook seeds `audit` on first load; mirror it into local state so we can
  // re-fetch after each ban/unban without forcing a full `reload` (which would
  // re-download the FTP file unnecessarily).
  useEffect(() => {
    setAuditRows(audit);
  }, [audit]);

  const refreshAudit = useCallback(async () => {
    try {
      const rows = await fetchBanAudit();
      setAuditRows(rows);
    } catch (e) {
      toast.error(formatError(e, 'Could not load ban history.'));
    }
  }, [toast]);

  const onAdded = useCallback(
    async (result: { guid: string; replaced: boolean; nextEntries: BanEntry[] }) => {
      setBans(result.nextEntries);
      setAddOpen(false);
      const label = directory.byGuid.get(result.guid) ?? result.guid;
      toast.success(
        result.replaced
          ? `Updated context for "${label}".`
          : `Banned "${label}" — effective on next driver join.`
      );
      void refreshAudit();
    },
    [setBans, toast, refreshAudit, directory]
  );

  const onRemove = useCallback(async () => {
    if (!confirmRemove) return;
    const target = confirmRemove;
    const label = directory.byGuid.get(target.guid) ?? target.guid;
    setWorking(true);
    try {
      const next = await removeBan(target.guid, removeContext);
      setBans(next);
      setConfirmRemove(null);
      toast.success(`Unbanned "${label}".`);
      void refreshAudit();
    } catch (e) {
      toast.error(formatError(e, `Could not unban ${label}.`));
    } finally {
      setWorking(false);
    }
  }, [confirmRemove, removeContext, setBans, toast, refreshAudit, directory]);

  const onClearAudit = useCallback(async () => {
    setWorking(true);
    try {
      await clearBanAudit();
      setAuditRows([]);
      setConfirmClearAudit(false);
      toast.success('Ban history cleared.');
    } catch (e) {
      toast.error(formatError(e, 'Could not clear ban history.'));
    } finally {
      setWorking(false);
    }
  }, [toast]);

  return (
    <Paper sx={{ ...GLASS_PANEL_COMPACT_SX, ...brandAccentBorderSx(), ...glassCardMotionSx(0) }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Driver bans
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            Reads and writes <code>blocklist.json</code> on the AC server. New bans take effect the
            next time the driver tries to join. Add a Steam GUID and an optional reason.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => void reload()}
            disabled={loading}
            startIcon={<Icon icon="solar:refresh-bold" width={16} />}
            sx={{
              fontWeight: 700,
              borderColor: 'rgba(148,163,184,0.35)',
              color: 'text.primary',
              '&:hover': { borderColor: 'rgba(148,163,184,0.6)', bgcolor: 'rgba(148,163,184,0.08)' },
            }}
          >
            Refresh
          </Button>
          {canEdit && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={() => setAddOpen(true)}
              startIcon={<Icon icon="solar:add-square-linear" />}
              sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
            >
              Ban driver
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" variant="outlined" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 1.5 }} />}

      <TableContainer
        sx={{
          maxHeight: 480,
          borderRadius: 1,
          border: '1px solid rgba(148,163,184,0.14)',
          bgcolor: 'rgba(16,31,61,0.35)',
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow
              sx={{
                '& th': {
                  fontSize: '0.68rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 800,
                  color: TABLE_HEAD_MUTED_COLOR,
                  bgcolor: 'rgba(16,31,61,0.92)',
                  borderBottom: '1px solid rgba(148,163,184,0.28)',
                  py: 1.1,
                  px: 1.25,
                },
              }}
            >
              <TableCell sx={{ width: '22%' }}>Driver</TableCell>
              <TableCell sx={{ width: '28%' }}>GUID</TableCell>
              <TableCell sx={{ width: showActionsColumn ? '36%' : '50%' }}>Context</TableCell>
              {showActionsColumn && (
                <TableCell sx={{ width: '14%' }} align="right">
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Newest first — the edge function appends to blocklist.json, so
                reversing the array surfaces the most recent ban at the top. */}
            {[...bans].reverse().map((row) => {
              const name = directory.byGuid.get(row.guid);
              return (
                <TableRow key={row.guid} hover>
                  <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }}>
                    {name ?? (
                      <Typography component="span" variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        {directory.loading ? '…' : 'Unknown'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellSx,
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.78rem',
                      wordBreak: 'break-all',
                      color: 'text.secondary',
                    }}
                  >
                    {row.guid}
                  </TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellSx,
                      color: row.context ? 'text.primary' : 'text.secondary',
                      wordBreak: 'break-word',
                    }}
                  >
                    {row.context || '—'}
                  </TableCell>
                  {showActionsColumn && (
                    <TableCell sx={{ ...bodyCellSx }} align="right">
                      <IconButton
                        size="small"
                        onClick={() => setConfirmRemove(row)}
                        aria-label={`Unban ${name ?? row.guid}`}
                        sx={{ color: '#86efac' }}
                      >
                        <Icon icon="solar:user-check-bold" width={18} />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!loading && bans.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showActionsColumn ? 4 : 3}
                  sx={{ ...bodyCellSx, color: 'text.secondary' }}
                  align="center"
                >
                  No drivers are currently banned.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Audit log — collapsible. Source of truth is the FTP file; this is the
          accountability trail of who issued / revoked which ban. */}
      <Box sx={{ mt: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
          <Button
            type="button"
            size="small"
            variant="text"
            onClick={() => {
              setAuditOpen((v) => !v);
              if (!auditOpen) void refreshAudit();
            }}
            startIcon={
              <Icon
                icon={auditOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
                width={16}
              />
            }
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { color: 'text.primary', bgcolor: 'rgba(148,163,184,0.06)' },
            }}
          >
            Ban history ({auditRows.length})
          </Button>
          {canClearAudit && auditOpen && auditRows.length > 0 && (
            <Button
              type="button"
              size="small"
              variant="text"
              onClick={() => setConfirmClearAudit(true)}
              startIcon={<Icon icon="solar:trash-bin-trash-bold" width={14} />}
              sx={{
                color: 'rgba(252,165,165,0.85)',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { color: '#fca5a5', bgcolor: 'rgba(252,165,165,0.06)' },
              }}
            >
              Clear history
            </Button>
          )}
        </Stack>
        <Collapse in={auditOpen} unmountOnExit>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Most recent ban / unban actions. The live blocklist above is always authoritative —
              this is just the audit trail.
            </Typography>
            <TableContainer
              sx={{
                maxHeight: 320,
                borderRadius: 1,
                border: '1px solid rgba(148,163,184,0.14)',
                bgcolor: 'rgba(16,31,61,0.35)',
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': {
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        fontWeight: 800,
                        color: TABLE_HEAD_MUTED_COLOR,
                        bgcolor: 'rgba(16,31,61,0.92)',
                        borderBottom: '1px solid rgba(148,163,184,0.28)',
                        py: 1.1,
                        px: 1.25,
                      },
                    }}
                  >
                    <TableCell sx={{ width: '16%' }}>When</TableCell>
                    <TableCell sx={{ width: '10%' }}>Action</TableCell>
                    <TableCell sx={{ width: '16%' }}>Driver</TableCell>
                    <TableCell sx={{ width: '20%' }}>GUID</TableCell>
                    <TableCell sx={{ width: '24%' }}>Context</TableCell>
                    <TableCell sx={{ width: '14%' }}>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditRows.map((row) => {
                    const name = directory.byGuid.get(row.guid);
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell
                          sx={{ ...bodyCellSx, color: 'text.secondary', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                        >
                          {formatTimestamp(row.createdAt)}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx }}>
                          <Chip
                            size="small"
                            label={row.action === 'ban' ? 'Ban' : 'Unban'}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              color: row.action === 'ban' ? '#fca5a5' : '#86efac',
                              bgcolor:
                                row.action === 'ban' ? 'rgba(252,165,165,0.12)' : 'rgba(134,239,172,0.12)',
                              border:
                                row.action === 'ban'
                                  ? '1px solid rgba(252,165,165,0.35)'
                                  : '1px solid rgba(134,239,172,0.35)',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }}>
                          {name ?? (
                            <Typography component="span" variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                              {directory.loading ? '…' : 'Unknown'}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCellSx,
                            fontFamily: 'ui-monospace, monospace',
                            fontSize: '0.78rem',
                            wordBreak: 'break-all',
                            color: 'text.secondary',
                          }}
                        >
                          {row.guid}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...bodyCellSx,
                            color: row.context ? 'text.primary' : 'text.secondary',
                            wordBreak: 'break-word',
                          }}
                        >
                          {row.context || '—'}
                        </TableCell>
                        <TableCell sx={{ ...bodyCellSx }}>
                          {row.actorRole && (row.actorRole === 'owner' || row.actorRole === 'admin' || row.actorRole === 'moderator') ? (
                            <Chip
                              size="small"
                              label={ROLE_LABEL[row.actorRole as AppRole]}
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                height: 22,
                                ...ROLE_CHIP_SX[ROLE_TO_CHIP_STYLE[row.actorRole as AppRole]],
                              }}
                            />
                          ) : (
                            <Typography component="span" variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {auditRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ ...bodyCellSx, color: 'text.secondary' }} align="center">
                        No ban history yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </Box>

      <BanFormDialog
        open={addOpen}
        existingGuids={bans.map((b) => b.guid)}
        directory={directory}
        onCancel={() => setAddOpen(false)}
        onSaved={onAdded}
      />

      <Dialog
        open={Boolean(confirmRemove)}
        onClose={() => setConfirmRemove(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              ...GLASS_CARD_SX,
              ...brandAccentBorderSx(),
              backgroundImage: 'none',
              borderColor: 'rgba(134,239,172,0.35)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#86efac',
          }}
        >
          <Icon icon="solar:user-check-bold" width={20} />
          Remove ban
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Remove the ban for{' '}
              {confirmRemove && directory.byGuid.has(confirmRemove.guid) ? (
                <Box component="strong" sx={{ color: 'text.primary' }}>
                  {directory.byGuid.get(confirmRemove.guid)}
                </Box>
              ) : null}
              {confirmRemove && directory.byGuid.has(confirmRemove.guid) ? ' ' : null}
              <Box
                component="code"
                sx={{
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.75,
                  bgcolor: 'rgba(16,31,61,0.6)',
                  border: '1px solid rgba(148,163,184,0.25)',
                  fontFamily: 'ui-monospace, monospace',
                  color: '#fff',
                }}
              >
                {confirmRemove?.guid}
              </Box>
              ? They will be able to join the server again immediately.
            </Typography>
            <TextField
              label="Reason (optional)"
              value={removeContext}
              onChange={(e) => setRemoveContext(e.target.value)}
              placeholder="e.g. driver said sorry"
              helperText="Saved to the audit log alongside this unban — max 500 characters."
              slotProps={{ htmlInput: { maxLength: 500 } }}
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              disabled={working}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmRemove(null)}
            disabled={working}
            sx={{ color: 'text.primary', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button color="success" variant="contained" onClick={onRemove} disabled={working}>
            {working ? 'Removing…' : 'Remove ban'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmClearAudit}
        onClose={() => (!working ? setConfirmClearAudit(false) : undefined)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              ...GLASS_CARD_SX,
              ...brandAccentBorderSx(),
              backgroundImage: 'none',
              borderColor: 'rgba(252,165,165,0.35)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            fontSize: '1.05rem',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: '#fca5a5',
          }}
        >
          <Icon icon="solar:trash-bin-trash-bold" width={20} />
          Clear ban history
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Permanently delete <strong>all</strong> ban / unban audit rows. Active bans on the
            AC server are not affected — only the accountability log is wiped. This cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmClearAudit(false)}
            disabled={working}
            sx={{ color: 'text.primary', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={onClearAudit} disabled={working}>
            {working ? 'Clearing…' : 'Clear history'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

// ----------------------------------------------------------------------

type BanFormDialogProps = {
  open: boolean;
  existingGuids: string[];
  directory: DriverDirectory;
  onCancel: () => void;
  onSaved: (result: { guid: string; replaced: boolean; nextEntries: BanEntry[] }) => void;
};

function BanFormDialog({ open, existingGuids, directory, onCancel, onSaved }: BanFormDialogProps) {
  const [guid, setGuid] = useState('');
  const [context, setContext] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset whenever the dialog re-opens.
  useEffect(() => {
    if (open) {
      setGuid('');
      setContext('');
      setError(null);
    }
  }, [open]);

  const trimmedGuid = guid.trim();
  const guidInvalid = trimmedGuid !== '' && !GUID_PATTERN.test(trimmedGuid);
  const guidExists = existingGuids.includes(trimmedGuid);
  const canSubmit = trimmedGuid !== '' && !guidInvalid && !saving;
  const resolvedName = trimmedGuid ? directory.byGuid.get(trimmedGuid) : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const next = await addBan({ guid: trimmedGuid, context: context.trim() });
      onSaved({ guid: trimmedGuid, replaced: guidExists, nextEntries: next });
    } catch (err) {
      setError(formatError(err, 'Could not add ban.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => (!saving ? onCancel() : undefined)}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { ...GLASS_CARD_SX, ...brandAccentBorderSx(), backgroundImage: 'none' },
        },
      }}
    >
      <Box component="form" onSubmit={onSubmit}>
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="solar:hammer-bold-duotone" width={22} />
          Ban driver
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Adds an entry to <code>blocklist.json</code> on the AC server. Find the
              driver&rsquo;s Steam GUID in the KMR dashboard or on their Steam profile.
            </Typography>

            <Autocomplete<DriverDirectoryEntry, false, false, true>
              freeSolo
              autoHighlight
              clearOnBlur={false}
              options={directory.entries}
              loading={directory.loading}
              inputValue={guid}
              onInputChange={(_e, value) => setGuid(value)}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.guid
              }
              filterOptions={(opts, { inputValue }) => {
                const q = inputValue.trim().toLowerCase();
                if (!q) return opts.slice(0, 100);
                return opts
                  .filter(
                    (o) =>
                      o.name.toLowerCase().includes(q) ||
                      o.guid.toLowerCase().includes(q)
                  )
                  .slice(0, 100);
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.guid}>
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {option.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '0.72rem',
                      }}
                    >
                      {option.guid}
                    </Typography>
                  </Stack>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  autoFocus
                  required
                  label="Driver (name or Steam GUID)"
                  error={guidInvalid}
                  helperText={
                    guidInvalid
                      ? 'Use only letters, digits, dashes or underscores (max 64 chars).'
                      : resolvedName
                        ? `Will ban ${resolvedName} (${trimmedGuid}).`
                        : guidExists
                          ? 'This driver is already banned. Submitting will update the context.'
                          : 'Search by driver name or paste a Steam GUID (e.g. 76561199444011211).'
                  }
                />
              )}
            />

            <TextField
              label="Context (reason)"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              helperText="Optional. Shown to other admins; max 500 characters."
              slotProps={{ htmlInput: { maxLength: 500 } }}
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
            />

            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onCancel} disabled={saving} sx={{ color: 'text.primary', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={!canSubmit}
            startIcon={<Icon icon="solar:hammer-bold-duotone" width={18} />}
          >
            {saving ? 'Saving…' : guidExists ? 'Update ban' : 'Ban driver'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
