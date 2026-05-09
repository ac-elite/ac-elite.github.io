import { useMemo, useState, useEffect, useCallback, useRef } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { Icon } from '@iconify/react';

import bundledTrackCatalog from 'src/centralized/track-catalog.json';

import { useToast } from 'src/components/toast/toast-provider';
import { useAuth, hasAtLeastRole } from 'src/lib/auth/auth-context';
import { refreshTrackCatalogFromDb } from 'src/lib/auth/tracks-bridge';
import {
  useTracks,
  upsertTrack,
  deleteTrack,
  uploadTrackImage,
  validateImageFile,
  cleanupReplacedImage,
  removeStorageObjectForUrl,
  ALLOWED_IMAGE_EXTENSIONS,
  type TrackRow,
  type TrackInput,
} from 'src/lib/auth/tracks-db';
import { GLASS_CARD_SX, GLASS_PANEL_COMPACT_SX, GLASS_INNER_PANEL_SX } from 'src/lib/glass';
import { brandAccentBorderSx } from 'src/lib/status-accent';
import { glassCardMotionSx } from 'src/lib/subtle-motion';
import {
  TABLE_HEAD_MUTED_COLOR,
  ACTION_CONTAINED_PRIMARY_SMALL_SX,
} from 'src/lib/page-shell';

// ----------------------------------------------------------------------

type DialogMode =
  | { kind: 'closed' }
  | { kind: 'add' }
  | { kind: 'edit'; row: TrackRow };

const EMPTY_INPUT: TrackInput = { id: '', name: '', imageUrl: null, imageOffsetY: 0, aliases: [] };

const ID_PATTERN = /^[a-z0-9_]+$/;

/**
 * Supabase returns PostgrestError / StorageError, which are plain objects with
 * a `message` field — they are not `Error` instances, so the usual
 * `e instanceof Error ? e.message : fallback` swallowed the real reason. This
 * helper unwraps anything that exposes a string `message`.
 */
function formatError(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return fallback;
}

const bodyCellSx = {
  borderBottom: '1px solid rgba(148,163,184,0.1)',
  py: 1.35,
  verticalAlign: 'top' as const,
};

// ----------------------------------------------------------------------

export function TrackCatalogManager() {
  const auth = useAuth();
  const toast = useToast();
  const { tracks, loading, error, reload } = useTracks();

  const canEdit = hasAtLeastRole(auth.profile, 'admin');
  const canDelete = hasAtLeastRole(auth.profile, 'owner');

  const [dialog, setDialog] = useState<DialogMode>({ kind: 'closed' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bundledOpen, setBundledOpen] = useState(false);

  const closeDialog = useCallback(() => setDialog({ kind: 'closed' }), []);

  // Result-bearing version handed to the form dialog so it can decide which
  // toast to fire after the save lands. Keeps all "success/error" copy in one
  // component instead of scattering toast calls through the form.
  const onSaved = useCallback(
    async (result: { kind: 'add' | 'edit'; name: string }) => {
      await reload();
      // Sync the public-site catalog cache so other pages (leaderboard, driver
      // profile, etc.) immediately see the new name / aliases / image.
      void refreshTrackCatalogFromDb();
      closeDialog();
      toast.success(
        result.kind === 'add'
          ? `Track "${result.name}" added.`
          : `Track "${result.name}" saved.`
      );
    },
    [reload, closeDialog, toast]
  );

  const onDelete = useCallback(async () => {
    if (!confirmDeleteId) return;
    const target = tracks.find((t) => t.id === confirmDeleteId);
    const label = target?.name || confirmDeleteId;
    setDeleting(true);
    try {
      // Best-effort: clean up the storage object before removing the row so
      // we never end up with orphan files in the bucket.
      if (target?.imageUrl) await removeStorageObjectForUrl(target.imageUrl);
      await deleteTrack(confirmDeleteId);
      setConfirmDeleteId(null);
      await reload();
      void refreshTrackCatalogFromDb();
      toast.success(`Track "${label}" deleted.`);
    } catch (e) {
      console.error('[track-catalog-manager] delete failed:', e);
      toast.error(formatError(e, `Could not delete "${label}".`));
    } finally {
      setDeleting(false);
    }
  }, [confirmDeleteId, tracks, reload, toast]);

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
            Track catalog (database)
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.4 }}>
            Live list of tracks from the database. Look up new track IDs in the KMR dashboard
            (e.g. <code>ks_brands_hatch_gp</code>) before adding them here.
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => setDialog({ kind: 'add' })}
            sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
            startIcon={<Icon icon="mingcute:add-line" />}
          >
            Add track
          </Button>
        )}
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
          bgcolor: 'rgba(15,23,42,0.35)',
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
                  bgcolor: 'rgba(15,23,42,0.92)',
                  borderBottom: '1px solid rgba(148,163,184,0.28)',
                  py: 1.1,
                  px: 1.25,
                },
              }}
            >
              <TableCell sx={{ width: '24%' }}>Name</TableCell>
              <TableCell sx={{ width: '26%' }}>Track ID</TableCell>
              <TableCell sx={{ width: '22%' }}>Alias</TableCell>
              <TableCell sx={{ width: '10%' }}>Image</TableCell>
              <TableCell sx={{ width: '8%' }}>Offset Y</TableCell>
              <TableCell sx={{ width: '10%' }} align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracks.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }}>{row.name || '—'}</TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.78rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {row.id}
                </TableCell>
                <TableCell
                  sx={{
                    ...bodyCellSx,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.78rem',
                    color: row.aliases.length ? 'text.primary' : 'text.secondary',
                    wordBreak: 'break-all',
                  }}
                >
                  {row.aliases.length > 0 ? row.aliases.join(', ') : '—'}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx }}>
                  {row.imageUrl ? (
                    <Box
                      sx={{
                        width: 56,
                        height: 36,
                        borderRadius: 1,
                        border: '1px solid rgba(148,163,184,0.28)',
                        backgroundImage: `url("${row.imageUrl}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                      role="img"
                      aria-label={`${row.name} image`}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label="No"
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        color: 'rgba(226,232,240,0.92)',
                        bgcolor: 'rgba(148,163,184,0.15)',
                        border: '1px solid rgba(148,163,184,0.35)',
                      }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx, fontVariantNumeric: 'tabular-nums' }}>
                  {row.imageOffsetY}
                </TableCell>
                <TableCell sx={{ ...bodyCellSx }} align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {canEdit && (
                      <IconButton
                        size="small"
                        onClick={() => setDialog({ kind: 'edit', row })}
                        aria-label={`Edit ${row.id}`}
                      >
                        <Icon icon="solar:pen-bold" width={16} />
                      </IconButton>
                    )}
                    {canDelete && (
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDeleteId(row.id)}
                        aria-label={`Delete ${row.id}`}
                        sx={{ color: '#fca5a5' }}
                      >
                        <Icon icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!loading && tracks.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ ...bodyCellSx, color: 'text.secondary' }} align="center">
                  No tracks yet. Click <strong>Add track</strong> to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Bundled-JSON read-only fallback view. Useful when comparing the live DB
          to the deployed seed (offline backup). Hidden by default to keep the
          DB-managed catalog the visual focus. */}
      <Box sx={{ mt: 1.5 }}>
        <Button
          type="button"
          size="small"
          variant="text"
          onClick={() => setBundledOpen((v) => !v)}
          startIcon={
            <Icon
              icon={bundledOpen ? 'solar:alt-arrow-down-linear' : 'solar:alt-arrow-right-linear'}
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
          Bundled JSON catalog ({bundledTrackCatalog.length})
        </Button>

        <Collapse in={bundledOpen} unmountOnExit>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
              Read-only snapshot of the bundled <code>track-catalog.json</code>. Used as the
              instant fallback before the live DB load lands and when offline.
            </Typography>
            <TableContainer
              sx={{
                maxHeight: 320,
                borderRadius: 1,
                border: '1px solid rgba(148,163,184,0.14)',
                bgcolor: 'rgba(15,23,42,0.35)',
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
                        bgcolor: 'rgba(15,23,42,0.92)',
                        borderBottom: '1px solid rgba(148,163,184,0.28)',
                        py: 1.1,
                        px: 1.25,
                      },
                    }}
                  >
                    <TableCell sx={{ width: '45%' }}>Track name</TableCell>
                    <TableCell sx={{ width: '40%' }}>Track ID</TableCell>
                    <TableCell sx={{ width: '15%' }}>Alias</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bundledTrackCatalog.map((track) => (
                    <TableRow key={track.id} hover>
                      <TableCell sx={{ ...bodyCellSx, fontWeight: 700 }}>{track.name || '—'}</TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellSx,
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.78rem',
                          wordBreak: 'break-all',
                        }}
                      >
                        {track.id}
                      </TableCell>
                      <TableCell
                        sx={{
                          ...bodyCellSx,
                          fontFamily: 'ui-monospace, monospace',
                          fontSize: '0.78rem',
                          color: track.aliases?.length ? 'text.primary' : 'text.secondary',
                          wordBreak: 'break-all',
                        }}
                      >
                        {track.aliases?.length ? track.aliases.join(', ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </Box>

      <TrackFormDialog
        mode={dialog}
        existingIds={tracks.map((t) => t.id)}
        onCancel={closeDialog}
        onSaved={onSaved}
      />

      <Dialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
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
          Delete track
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Permanently delete{' '}
            <Box
              component="code"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 0.75,
                bgcolor: 'rgba(15,23,42,0.6)',
                border: '1px solid rgba(148,163,184,0.25)',
                fontFamily: 'ui-monospace, monospace',
                color: '#fff',
              }}
            >
              {confirmDeleteId}
            </Box>
            ? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDeleteId(null)}
            disabled={deleting}
            sx={{ color: 'text.primary', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

// ----------------------------------------------------------------------

type TrackFormDialogProps = {
  mode: DialogMode;
  existingIds: string[];
  onCancel: () => void;
  onSaved: (result: { kind: 'add' | 'edit'; name: string }) => Promise<void> | void;
};

function rowToInput(row: TrackRow): TrackInput {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.imageUrl,
    imageOffsetY: row.imageOffsetY,
    aliases: [...row.aliases],
  };
}

type ImageAction =
  | { kind: 'unchanged' }
  | { kind: 'replaced'; file: File; previewUrl: string }
  | { kind: 'removed' };

const ACCEPT_IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/avif';

function TrackFormDialog({ mode, existingIds, onCancel, onSaved }: TrackFormDialogProps) {
  const editing = mode.kind === 'edit';
  const initial = useMemo<TrackInput>(
    () => (mode.kind === 'edit' ? rowToInput(mode.row) : { ...EMPTY_INPUT }),
    [mode]
  );

  const [form, setForm] = useState<TrackInput>(initial);
  // The DB stores `aliases` as text[] for forward-compat, but in practice every
  // track has at most one alias (the trailing-`_` variant of its ID). The form
  // surfaces it as a single optional field; on save we wrap it in `[]` or `[alias]`.
  const [alias, setAlias] = useState<string>(initial.aliases[0] ?? '');
  const [imageAction, setImageAction] = useState<ImageAction>({ kind: 'unchanged' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resync the form whenever the dialog opens for a different track / mode.
  useEffect(() => {
    setForm(initial);
    setAlias(initial.aliases[0] ?? '');
    setImageAction({ kind: 'unchanged' });
    setError(null);
  }, [initial]);

  // Revoke object URLs we created for previews so we don't leak memory.
  useEffect(() => {
    if (imageAction.kind !== 'replaced') return undefined;
    const url = imageAction.previewUrl;
    return () => URL.revokeObjectURL(url);
  }, [imageAction]);

  if (mode.kind === 'closed') return null;

  const idCollision =
    !editing && form.id.trim() !== '' && existingIds.includes(form.id.trim());
  const idInvalid = !editing && form.id.trim() !== '' && !ID_PATTERN.test(form.id.trim());

  const canSubmit =
    form.id.trim() !== '' && form.name.trim() !== '' && !idCollision && !idInvalid && !saving;

  const pickFile = (file: File) => {
    setError(null);
    const validation = validateImageFile(file);
    if (validation === 'unsupported-type') {
      setError(`Unsupported image type. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ').toUpperCase()}.`);
      return;
    }
    if (validation === 'too-large') {
      setError('Image is larger than 8 MB.');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setImageAction({ kind: 'replaced', file, previewUrl });
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    // Reset so picking the same file again still triggers onChange.
    e.target.value = '';
  };

  const previewSrc =
    imageAction.kind === 'replaced'
      ? imageAction.previewUrl
      : imageAction.kind === 'removed'
        ? null
        : (form.imageUrl ?? null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    // Tracks an image we uploaded *before* the row was upserted, so we can
    // roll it back on failure and never leave an orphan in the bucket.
    let uploadedNewUrl: string | null = null;

    try {
      const trackId = form.id.trim();
      const oldUrl = editing ? mode.row.imageUrl : null;

      let nextImageUrl: string | null = form.imageUrl;
      if (imageAction.kind === 'replaced') {
        nextImageUrl = await uploadTrackImage(trackId, imageAction.file);
        uploadedNewUrl = nextImageUrl;
      } else if (imageAction.kind === 'removed') {
        nextImageUrl = null;
      }

      const trackName = form.name.trim();
      const trimmedAlias = alias.trim().toLowerCase();
      await upsertTrack({
        ...form,
        id: trackId,
        name: trackName,
        imageUrl: nextImageUrl,
        aliases: trimmedAlias ? [trimmedAlias] : [],
      });

      // Best-effort cleanup of the previous storage object when it differs.
      // Bundled `/images/tracks/...` paths are skipped automatically.
      void cleanupReplacedImage(oldUrl, nextImageUrl);

      await onSaved({ kind: editing ? 'edit' : 'add', name: trackName });
    } catch (err) {
      // Roll back the freshly uploaded image so the bucket stays in sync with
      // the DB (no row pointing to it = it should not exist).
      if (uploadedNewUrl) void removeStorageObjectForUrl(uploadedNewUrl);
      console.error('[track-catalog-manager] save failed:', err);
      setError(formatError(err, 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            ...GLASS_CARD_SX,
            ...brandAccentBorderSx(),
            // Override the default MUI overlay backgroundImage so our gradient shows through.
            backgroundImage: 'none',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 800,
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          pb: 1.5,
          borderBottom: '1px solid rgba(148,163,184,0.18)',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 1,
            bgcolor: 'rgba(96,165,250,0.14)',
            border: '1px solid rgba(96,165,250,0.4)',
            color: '#bfdbfe',
          }}
        >
          <Icon icon={editing ? 'solar:pen-bold' : 'mingcute:add-line'} width={18} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ fontWeight: 800, lineHeight: 1.2 }}>{editing ? 'Edit track' : 'Add track'}</Box>
          {editing && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontFamily: 'ui-monospace, monospace',
                display: 'block',
                mt: 0.25,
              }}
            >
              {mode.row.id}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <Box component="form" onSubmit={onSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}

            <TextField
              label="Track ID"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              required
              fullWidth
              disabled={editing}
              error={idCollision || idInvalid}
              helperText={
                editing
                  ? 'Track ID is permanent and cannot be changed.'
                  : idCollision
                    ? 'A track with this ID already exists.'
                    : idInvalid
                      ? 'Use only lowercase letters, digits, and underscores.'
                      : 'Look this up in the KMR dashboard. Example: ks_brands_hatch_gp'
              }
              inputProps={{ autoCapitalize: 'none', spellCheck: false }}
              sx={{ '& input': { fontFamily: 'ui-monospace, monospace' } }}
            />

            <TextField
              label="Display name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
              helperText="Shown to players, e.g. 'Brands Hatch - GP'."
            />

            <TextField
              label="Alias (optional)"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              fullWidth
              helperText="Secondary track ID — used when the same track shows up with a trailing _ variant in the data. Example: monza for monza_."
              placeholder="e.g. monza"
              inputProps={{ autoCapitalize: 'none', spellCheck: false }}
              sx={{ '& input': { fontFamily: 'ui-monospace, monospace' } }}
            />

            <TextField
              label="Image vertical offset (px)"
              type="number"
              value={form.imageOffsetY}
              onChange={(e) =>
                setForm((f) => ({ ...f, imageOffsetY: Number.parseInt(e.target.value, 10) || 0 }))
              }
              fullWidth
              helperText="Negative pulls the image up, positive pushes it down."
            />

            <Box sx={{ ...GLASS_INNER_PANEL_SX, py: 1.5 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                alignItems={{ xs: 'stretch', sm: 'flex-start' }}
              >
                {/* Preview / placeholder thumbnail */}
                <Box
                  sx={{
                    width: { xs: '100%', sm: 140 },
                    height: 90,
                    borderRadius: 1.5,
                    border: '1px solid rgba(148,163,184,0.28)',
                    bgcolor: 'rgba(15,23,42,0.55)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: previewSrc ? `url("${previewSrc}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {!previewSrc && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      No image
                    </Typography>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Track image
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25, mb: 1, color: 'text.secondary' }}>
                    JPEG / PNG / WebP / AVIF · max 8&nbsp;MB.
                  </Typography>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_IMAGE_TYPES}
                    onChange={onFileInputChange}
                    style={{ display: 'none' }}
                  />

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      type="button"
                      variant="outlined"
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      startIcon={<Icon icon="solar:upload-linear" />}
                    >
                      {previewSrc ? 'Replace' : 'Upload image'}
                    </Button>
                    {imageAction.kind === 'replaced' && (
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        onClick={() => setImageAction({ kind: 'unchanged' })}
                      >
                        Undo
                      </Button>
                    )}
                    {imageAction.kind === 'removed' && (
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        onClick={() => setImageAction({ kind: 'unchanged' })}
                      >
                        Undo remove
                      </Button>
                    )}
                    {form.imageUrl && imageAction.kind === 'unchanged' && (
                      <Button
                        type="button"
                        variant="text"
                        size="small"
                        onClick={() => setImageAction({ kind: 'removed' })}
                        sx={{ color: '#fca5a5' }}
                        startIcon={<Icon icon="solar:trash-bin-trash-linear" />}
                      >
                        Remove
                      </Button>
                    )}
                  </Stack>

                  {imageAction.kind === 'replaced' && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        icon={<Icon icon="solar:check-circle-bold" width={14} />}
                        label="Saves on submit"
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: '#fbbf24',
                          bgcolor: 'rgba(251,191,36,0.12)',
                          border: '1px solid rgba(251,191,36,0.4)',
                          '& .MuiChip-icon': { color: '#fbbf24', ml: 0.5 },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'ui-monospace, monospace' }}>
                        {imageAction.file.name} · {(imageAction.file.size / 1024 / 1024).toFixed(2)}&nbsp;MB
                      </Typography>
                    </Stack>
                  )}
                  {imageAction.kind === 'removed' && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.25 }}>
                      <Chip
                        size="small"
                        icon={<Icon icon="solar:trash-bin-trash-bold" width={14} />}
                        label="Will be removed on submit"
                        sx={{
                          height: 22,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          color: '#fca5a5',
                          bgcolor: 'rgba(252,165,165,0.12)',
                          border: '1px solid rgba(252,165,165,0.4)',
                          '& .MuiChip-icon': { color: '#fca5a5', ml: 0.5 },
                        }}
                      />
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 2,
            pt: 1.5,
            borderTop: '1px solid rgba(148,163,184,0.18)',
            gap: 1,
          }}
        >
          <Button onClick={onCancel} disabled={saving} sx={{ color: 'text.primary', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!canSubmit}
            sx={{ ...ACTION_CONTAINED_PRIMARY_SMALL_SX }}
            startIcon={
              !saving ? <Icon icon={editing ? 'solar:diskette-bold' : 'mingcute:add-line'} /> : null
            }
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add track'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
