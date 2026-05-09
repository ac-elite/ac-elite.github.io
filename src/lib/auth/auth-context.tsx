import type { Session, User } from '@supabase/supabase-js';

import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { getSupabaseClient, isSupabaseAuthConfigured } from 'src/lib/supabase-client';

// ----------------------------------------------------------------------

export type AppRole = 'owner' | 'admin' | 'moderator';

export type AuthProfile = {
  id: string;
  role: AppRole;
  displayName: string | null;
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

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
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

// ----------------------------------------------------------------------

function isAppRole(value: unknown): value is AppRole {
  return value === 'owner' || value === 'admin' || value === 'moderator';
}

async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('profiles')
    .select('id, role, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  if (!isAppRole(data.role)) return null;
  return {
    id: data.id as string,
    role: data.role,
    displayName: (data.display_name as string | null) ?? null,
  };
}

// ----------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(INITIAL);

  const applySession = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState((prev) => ({ ...prev, loading: false, session: null, user: null, profile: null }));
      return;
    }
    const profile = await fetchProfile(session.user.id);
    setState((prev) => ({
      ...prev,
      loading: false,
      session,
      user: session.user,
      profile,
      // No matching profile = the account exists in auth.users but the trigger
      // failed or the row was deleted. Surface it so the user is not silently
      // locked out of every page.
      error: profile ? null : 'No profile found for this account. Ask an owner to fix it.',
    }));
  }, []);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setState((prev) => ({ ...prev, loading: false, configured: false }));
      return undefined;
    }

    let cancelled = false;

    void client.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void applySession(data.session ?? null);
    });

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
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      await applySession(data.session ?? null);
      return { ok: true };
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
    () => ({ ...state, signIn, signOut, refreshProfile }),
    [state, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ----------------------------------------------------------------------

const ROLE_RANK: Record<AppRole, number> = { moderator: 1, admin: 2, owner: 3 };

/** True when the current profile's role is at least the requested role. */
export function hasAtLeastRole(profile: AuthProfile | null, min: AppRole): boolean {
  if (!profile) return false;
  return ROLE_RANK[profile.role] >= ROLE_RANK[min];
}
