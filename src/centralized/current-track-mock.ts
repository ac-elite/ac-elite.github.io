import { normalizeServerTrackId } from 'src/centralized/track-info';

import type { CurrentTrackPayload } from 'src/lib/server-status';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function parseMockValue(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const lowered = value.toLowerCase();
  if (lowered === 'off' || lowered === 'none' || lowered === 'false' || lowered === '0') return null;
  return normalizeServerTrackId(value);
}

/**
 * Global current-track override for UI testing.
 * Source: query param only.
 * - Query: `?currentTrackMock=spa`
 */
export function getCurrentTrackMockOverride(): string | null {
  if (!isBrowser()) return null;
  const qp = new URLSearchParams(window.location.search).get('currentTrackMock');
  return parseMockValue(qp);
}

export function applyCurrentTrackMock(payload: CurrentTrackPayload | null): CurrentTrackPayload | null {
  const mockTrack = getCurrentTrackMockOverride();
  if (!mockTrack) return payload;

  if (!payload) {
    return {
      online: true,
      track: mockTrack,
      fetchedAt: new Date().toISOString(),
      info: { track: mockTrack },
    };
  }

  return {
    ...payload,
    track: mockTrack,
    info: { ...(payload.info ?? {}), track: mockTrack },
  };
}
