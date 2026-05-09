import { useState, useContext, useCallback, createContext } from 'react';
import { Icon } from '@iconify/react';

import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

// ----------------------------------------------------------------------

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastState = {
  open: boolean;
  variant: ToastVariant;
  message: string;
  // Bumped on each notify() call so a rapid-fire second toast restarts the timer.
  key: number;
};

type ToastContextValue = {
  notify: (variant: ToastVariant, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_ICON: Record<ToastVariant, string> = {
  success: 'solar:check-circle-bold',
  error: 'solar:close-circle-bold',
  info: 'solar:info-circle-bold',
  warning: 'solar:danger-triangle-bold',
};

// Errors deserve more reading time than success confirmations.
const VARIANT_DURATION_MS: Record<ToastVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 6000,
  error: 8000,
};

/**
 * App-wide toast notifications. Mounts a single MUI `<Snackbar>` and exposes
 * a `useToast()` hook to fire success/error/info messages from anywhere in
 * the React tree. Designed for action feedback (admin saves, deletes, etc.) —
 * not a logger, not a queue: a second toast replaces the first to keep the
 * UI focused on the most recent result.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false,
    variant: 'info',
    message: '',
    key: 0,
  });

  const notify = useCallback<ToastContextValue['notify']>((variant, message) => {
    setState((prev) => ({ open: true, variant, message, key: prev.key + 1 }));
  }, []);

  const handleClose = (_event?: unknown, reason?: string) => {
    // Ignore click-away so the user does not lose feedback by clicking elsewhere.
    if (reason === 'clickaway') return;
    setState((prev) => ({ ...prev, open: false }));
  };

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <Snackbar
        key={state.key}
        open={state.open}
        autoHideDuration={VARIANT_DURATION_MS[state.variant]}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: (theme) => theme.zIndex.snackbar + 1 }}
      >
        <Alert
          severity={state.variant}
          variant="filled"
          onClose={handleClose}
          icon={<Icon icon={VARIANT_ICON[state.variant]} width={20} />}
          sx={{
            minWidth: 280,
            maxWidth: 480,
            fontWeight: 600,
            alignItems: 'center',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
            // Make the dismiss/close button match the alert weight.
            '& .MuiAlert-action': { alignItems: 'center', pt: 0 },
          }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

/**
 * Convenience hook: gives `success` / `error` / `info` / `warning` shortcuts
 * over the underlying `notify`. Throws if called outside a ToastProvider so
 * misuse is caught at render time, not silently swallowed.
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  const { notify } = ctx;
  return {
    success: useCallback((message: string) => notify('success', message), [notify]),
    error: useCallback((message: string) => notify('error', message), [notify]),
    info: useCallback((message: string) => notify('info', message), [notify]),
    warning: useCallback((message: string) => notify('warning', message), [notify]),
  };
}
