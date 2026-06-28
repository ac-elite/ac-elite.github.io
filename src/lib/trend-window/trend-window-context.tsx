/**
 * App-wide trend-window state.
 *
 * One selected window (1h / 24h / 7d / 30d) shared across every page: the
 * `TrendWindowStats` selector writes it, the per-row `DeltaChip`s read it, and
 * it is persisted to localStorage so it carries across pages and visits.
 *
 * The provider fetches the matching `rank_history` snapshot once per window
 * change and shares it — pages don't each re-download the ~2 MB payload.
 */
import {
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
  type ReactNode,
} from 'react';

import { computeDeltas, type DriverDelta } from 'src/lib/delta';
import { type RankDriver } from 'src/lib/ac-elite-data';
import {
  HISTORY_WINDOWS,
  type HistoryWindowKey,
  computeWindowedDeltas,
  fetchRankHistoryOldest,
  availableHistoryWindows,
  type RankHistorySnapshot,
  fetchRankHistorySnapshot,
} from 'src/lib/rank-history';

const STORAGE_KEY = 'ace-trend-window';
const DEFAULT_WINDOW: HistoryWindowKey = '24h';
const ALL_WINDOWS = new Set<HistoryWindowKey>(HISTORY_WINDOWS.map((w) => w.key));

function isWindowKey(value: unknown): value is HistoryWindowKey {
  return typeof value === 'string' && HISTORY_WINDOWS.some((w) => w.key === value);
}

function readStoredWindow(): HistoryWindowKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isWindowKey(stored)) return stored;
  } catch {
    // localStorage unavailable — fall through to default.
  }
  return DEFAULT_WINDOW;
}

export type TrendWindowValue = {
  activeWindow: HistoryWindowKey;
  setActiveWindow: (next: HistoryWindowKey) => void;
  availableWindows: Set<HistoryWindowKey>;
  snapshot: RankHistorySnapshot | null;
};

const FALLBACK: TrendWindowValue = {
  activeWindow: DEFAULT_WINDOW,
  setActiveWindow: () => {},
  availableWindows: new Set(),
  snapshot: null,
};

const TrendWindowContext = createContext<TrendWindowValue | null>(null);

export function TrendWindowProvider({ children }: { children: ReactNode }) {
  const [activeWindow, setActiveWindowState] = useState<HistoryWindowKey>(readStoredWindow);
  const [availableWindows, setAvailableWindows] = useState<Set<HistoryWindowKey>>(ALL_WINDOWS);
  const [snapshot, setSnapshot] = useState<RankHistorySnapshot | null>(null);

  const setActiveWindow = useCallback((next: HistoryWindowKey) => {
    setActiveWindowState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort.
    }
  }, []);

  // Which windows have a snapshot old enough; correct the stored selection if
  // it isn't usable yet (without overwriting what the user picked).
  useEffect(() => {
    let mounted = true;
    void fetchRankHistoryOldest().then((oldest) => {
      if (!mounted) return;
      const available = availableHistoryWindows(oldest);
      setAvailableWindows(available);
      setActiveWindowState((current) => {
        if (available.has(current)) return current;
        for (let i = HISTORY_WINDOWS.length - 1; i >= 0; i -= 1) {
          if (available.has(HISTORY_WINDOWS[i].key)) return HISTORY_WINDOWS[i].key;
        }
        return current;
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch the snapshot for the active window, shared with every consumer.
  useEffect(() => {
    let mounted = true;
    setSnapshot(null);
    void fetchRankHistorySnapshot(activeWindow).then((snap) => {
      if (mounted) setSnapshot(snap);
    });
    return () => {
      mounted = false;
    };
  }, [activeWindow]);

  const value = useMemo<TrendWindowValue>(
    () => ({ activeWindow, setActiveWindow, availableWindows, snapshot }),
    [activeWindow, setActiveWindow, availableWindows, snapshot]
  );

  return <TrendWindowContext.Provider value={value}>{children}</TrendWindowContext.Provider>;
}

/** Trend-window state. Returns inert defaults if used outside the provider. */
export function useTrendWindow(): TrendWindowValue {
  return useContext(TrendWindowContext) ?? FALLBACK;
}

/**
 * Per-row SR + pace deltas for the active window, ready for the `DeltaChip`s.
 *
 * For the **24h** window the proven `rank-24h.json` baseline is used while
 * `rank_history` snapshots are still accumulating SR/pace — so 24h never
 * regresses. Other windows use the windowed `rank_history` snapshot.
 */
export function useWindowedDriverDeltas(
  rankData: RankDriver[],
  prevRank24h: RankDriver[]
): Map<string, DriverDelta> {
  const { activeWindow, snapshot } = useTrendWindow();
  return useMemo(() => {
    const windowed = computeWindowedDeltas(rankData, snapshot);
    if (activeWindow === '24h' && windowed.size === 0) {
      return computeDeltas(rankData, prevRank24h);
    }
    return windowed;
  }, [activeWindow, snapshot, rankData, prevRank24h]);
}
