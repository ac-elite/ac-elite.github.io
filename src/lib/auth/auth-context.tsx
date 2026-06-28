import type { User, Session } from '@supabase/supabase-js';

import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { getSupabaseClient, isSupabaseAuthConfigured } from 'src/lib/supabase-client';
import { supabaseBaseUrl, supabaseHeaders, fetchWithTimeout } from 'src/centralized/supabase-rest';

// ----------------------------------------------------------------------

export type AppRole = 'owner' | 'admin' | 'moderator' | 'driver';

export type AuthProfile = {
  id: string;
  role: AppRole;
  displayName: string | null;
  /** SteamID64 for Steam-authenticated users (null for the legacy admin accounts). */
  steamId: string | null;
  avatarUrl: string | null;
};

export type AuthState = {
  /** `true` while we are still resolving the initial session/profile. */
  loading: boolean;
  configured: boolean;
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  error: string | null;
};

export type SteamLoginResult = {
  ok: boolean;
  error?: string;
  /** Resolved role + SteamID on success, so the login page can route the user. */
  role?: AppRole;
  steamId?: string;
};

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  /** Exchange the `openid.*` params from a Steam redirect for a real session. */
  completeSteamLogin: (openidParams: Record<string, string>) => Promise<SteamLoginResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const INITIAL: AuthState = {
  loading: true,
  configured: isSupabaseAuthConfigured(),
  user: null,
  session: null,
  profile: null,
  error: null,
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_REQUEST_TIMEOUT_MS = 10_000;

// ----------------------------------------------------------------------

function isAppRole(value: unknown): value is AppRole {
  return (
    value === 'owner' || value === 'admin' || value === 'moderator' || value === 'driver'
  );
}

function withAuthTimeout<T>(promise: PromiseLike<T>, message: string): Promise<T> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = globalThis.setTimeout(() => reject(new Error(message)), AUTH_REQUEST_TIMEOUT_MS);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    if (timeout) globalThis.clearTimeout(timeout);
  });
}

function authErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await withAuthTimeout(
    client
      .from('profiles')
      .select('id, role, display_name, steam_id, avatar_url')
      .eq('id', userId)
      .maybeSingle(),
    'Profile lookup timed out. Supabase may still be recovering.'
  );
  if (error || !data) return null;
  if (!isAppRole(data.role)) return null;
  return {
    id: data.id as string,
    role: data.role,
    displayName: (data.display_name as string | null) ?? null,
    steamId: (data.steam_id as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
  };
}

// ----------------------------------------------------------------------
// Steam OpenID 2.0 sign-in helpers
// ----------------------------------------------------------------------

const STEAM_OPENID_LOGIN = 'https://steamcommunity.com/openid/login';
const STEAM_IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';

/** Where Steam should send the user back to — our login route, under the app's
 *  basename so it survives GitHub Pages deployments. */
function steamReturnTo(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${window.location.origin}${base.replace(/\/+$/, '')}/login`;
}

/**
 * Build the Steam OpenID redirect URL. The realm is our site origin (shown to
 * the user on Steam's consent screen); Steam appends the signed `openid.*`
 * params to `return_to` when it sends them back.
 */
export function getSteamLoginUrl(): string {
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': steamReturnTo(),
    'openid.realm': window.location.origin,
    'openid.identity': STEAM_IDENTIFIER_SELECT,
    'openid.claimed_id': STEAM_IDENTIFIER_SELECT,
  });
  return `${STEAM_OPENID_LOGIN}?${params.toString()}`;
}

/** True when the current URL carries the `openid.*` params Steam sends back. */
export function hasSteamOpenIdParams(search: string): boolean {
  return new URLSearchParams(search).has('openid.claimed_id');
}

/** Pull just the `openid.*` params out of a query string into a plain object. */
export function readSteamOpenIdParams(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.startsWith('openid.')) out[key] = value;
  }
  return out;
}

// ----------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState((prev) => ({ ...prev, loading: false, session: null, user: null, profile: null }));
      return;
    }
    let profile: AuthProfile | null = null;
    let profileError: string | null = null;
    try {
      profile = await fetchProfile(session.user.id);
    } catch (error) {
      profileError = authErrorMessage(error, 'Could not load your profile.');
    }
    setState((prev) => ({
      ...prev,
      loading: false,
      session,
      user: session.user,
      profile,
      // No matching profile = the account exists in auth.users but the trigger
      // failed or the row was deleted. Surface it so the user is not silently
      // locked out of every page.
      error: profile ? null : profileError ?? 'No profile found for this account. Ask an owner to fix it.',
    }));
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setState((prev) => ({ ...prev, loading: false, configured: false }));
      return undefined;
    }

    let cancelled = false;

    void withAuthTimeout(
      client.auth.getSession(),
      'Auth session lookup timed out. Supabase may still be recovering.'
    ).then(
      ({ data }) => {
        if (cancelled) return;
        void applySession(data.session ?? null);
      },
      (error) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: authErrorMessage(error, 'Could not load your session.'),
        }));
      }
    );

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      void applySession(session ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient();
      if (!client) return { ok: false, error: 'Authentication is not configured.' };
      let response: Awaited<ReturnType<typeof client.auth.signInWithPassword>>;
      try {
        response = await withAuthTimeout(
          client.auth.signInWithPassword({ email, password }),
          'Sign-in timed out. Supabase may still be recovering.'
        );
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'Sign-in failed.') };
      }
      const { data, error } = response;
      if (error) return { ok: false, error: error.message };
      await applySession(data.session ?? null);
      return { ok: true };
    },
    [applySession]
  );

  const completeSteamLogin = useCallback(
    async (openidParams: Record<string, string>): Promise<SteamLoginResult> => {
      const client = getSupabaseClient();
      if (!client) return { ok: false, error: 'Authentication is not configured.' };

      // Server-side: verify the assertion with Steam and mint a one-time OTP.
      const steamAuthResult = await fetchWithTimeout(
        `${supabaseBaseUrl()}/functions/v1/steam-auth`,
        {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify(openidParams),
        },
        AUTH_REQUEST_TIMEOUT_MS
      )
        .then(async (res) => ({
          res,
          body: (await res.clone().json().catch(() => null)) as { error?: string } | null,
        }))
        .catch((error) => ({ error }));
      if ('error' in steamAuthResult) {
        const timedOut = steamAuthResult.error instanceof DOMException && steamAuthResult.error.name === 'AbortError';
        return {
          ok: false,
          error: timedOut
            ? 'Steam sign-in timed out. Supabase may still be recovering.'
            : authErrorMessage(steamAuthResult.error, 'Steam sign-in failed.'),
        };
      }
      const data = steamAuthResult.body;
      if (!steamAuthResult.res.ok) {
        return {
          ok: false,
          error: steamAuthResult.body?.error ?? `Steam sign-in failed (${steamAuthResult.res.status}).`,
        };
      }
      if (false as boolean) {
        // `functions.invoke` only gives a generic "non-2xx" message; the real
        // reason lives in the response body (FunctionsHttpError.context).
        let detail = 'Steam sign-in failed.';
        const ctx: unknown = null;
        if (ctx instanceof Response) {
          try {
            const body = (await ctx.clone().json()) as { error?: string };
            if (body?.error) detail = body.error;
          } catch {
            // body wasn't JSON — keep the generic message
          }
        }
        return { ok: false, error: detail };
      }
      const payload = data as {
        email?: string;
        otp?: string | null;
        token_hash?: string | null;
        steam_id?: string;
        role?: AppRole;
      };
      if (!payload?.email || (!payload.otp && !payload.token_hash)) {
        return { ok: false, error: 'Steam sign-in did not return a session token.' };
      }

      // Exchange the OTP for a real session. Prefer the 6-digit OTP; fall back
      // to the hashed token if the OTP is unavailable.
      let verify: Awaited<ReturnType<typeof client.auth.verifyOtp>>;
      try {
        verify = payload.otp
          ? await withAuthTimeout(
              client.auth.verifyOtp({ email: payload.email, token: payload.otp, type: 'email' }),
              'Steam session verification timed out. Supabase may still be recovering.'
            )
          : await withAuthTimeout(
              client.auth.verifyOtp({ token_hash: payload.token_hash as string, type: 'email' }),
              'Steam session verification timed out. Supabase may still be recovering.'
            );
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'Steam session verification failed.') };
      }
      if (verify.error) return { ok: false, error: verify.error.message };

      await applySession(verify.data.session ?? null);
      return { ok: true, role: payload.role, steamId: payload.steam_id };
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
    setState((prev) => ({ ...prev, session: null, user: null, profile: null, error: null }));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profile = await fetchProfile(state.user.id);
    setState((prev) => ({ ...prev, profile }));
  }, [state.user]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, completeSteamLogin, signOut, refreshProfile }),
    [state, signIn, completeSteamLogin, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ----------------------------------------------------------------------

const ROLE_RANK: Record<AppRole, number> = { driver: 0, moderator: 1, admin: 2, owner: 3 };

/** True when the current profile's role is at least the requested role. */
export function hasAtLeastRole(profile: AuthProfile | null, min: AppRole): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[min];
}

// ----------------------------------------------------------------------
// Role label / chip helpers — kept here so every staff-facing UI uses the
// same wording and chip palette. The "DiscordRole" key maps to the gradient
// styles in `src/lib/ac-elite-data.ts`.
// ----------------------------------------------------------------------

/** Mapping into the existing role-chip gradient styles. */
export const ROLE_TO_CHIP_STYLE: Record<AppRole, 'Creator' | 'Admin' | 'Moderator' | 'Driver'> = {
  owner: 'Creator',
  admin: 'Admin',
  moderator: 'Moderator',
  driver: 'Driver',
};

/** Capitalised label shown on the chip and in copy. */
export const ROLE_LABEL: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  moderator: 'Moderator',
  driver: 'Driver',
};
