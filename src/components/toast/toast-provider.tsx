import { useState, useContext, useCallback, createContext } from 'react';
import { Icon } from '@iconify/react';

import Alert from '@mui/material/Alert';
import { alpha } from '@mui/material/styles';
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

/** Per-severity accent for the glass toast (icon, rim, colour bloom). */
const VARIANT_ACCENT: Record<ToastVariant, string> = {
  success: '#4ade80',
  error: '#fb7185',
  info: '#93c5fd',
  warning: '#fbbf24',
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
          variant="outlined"
          onClose={handleClose}
          icon={<Icon icon={VARIANT_ICON[state.variant]} width={20} />}
          sx={{
            minWidth: 280,
            maxWidth: 480,
            fontWeight: 600,
            alignItems: 'center',
            borderRadius: 2.5,
            // Dark vibrancy glass + a per-severity accent rim/bloom — matches every
            // other surface on the site (the old filled alert was the one outlier).
            color: 'rgba(255,255,255,0.95)',
            border: `1px solid ${alpha(VARIANT_ACCENT[state.variant], 0.5)}`,
            backgroundColor: 'rgba(16,24,44,0.82)',
            backgroundImage: `linear-gradient(180deg, ${alpha(VARIANT_ACCENT[state.variant], 0.14)} 0%, ${alpha(VARIANT_ACCENT[state.variant], 0.04)} 100%)`,
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px ${alpha(VARIANT_ACCENT[state.variant], 0.12)}, 0 2px 6px -2px rgba(0,0,0,0.4), 0 18px 40px -16px rgba(0,0,0,0.6)`,
            '& .MuiAlert-icon': { color: VARIANT_ACCENT[state.variant], alignItems: 'center' },
            '& .MuiAlert-message': { color: 'rgba(255,255,255,0.95)' },
            // Make the dismiss/close button match the alert weight.
            '& .MuiAlert-action': { alignItems: 'center', pt: 0, color: 'rgba(255,255,255,0.7)' },
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
