import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import {
    accessibleAuthError,
    beginBrowserSignIn,
    beginNativeAppleSignIn,
    CloudAccountError,
    exchangeOAuthCallback,
    isProviderCancellation,
    shouldUseNativeApple,
    signOutLocalSession,
    type AuthProvider,
} from '@/services/cloud/account';
import { getSupabaseClient } from '@/services/cloud/supabase';
import {
    cancelAccountSync,
    clearLocalAccountData,
    flushCloudSync,
    hasMeaningfulLocalData,
    prepareAccountSync,
    resolveAccountSync,
} from '@/services/cloud/sync';
import { useAddons } from '@/store/addons';
import { useAgents } from '@/store/agents';
import { useAuthAccess } from '@/store/auth-access';
import { useFriends } from '@/store/friends';
import { usePlants } from '@/store/plants';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTodos } from '@/store/todos';
import { useTravel } from '@/store/travel';
import { useVisionBoard } from '@/store/vision-board';

import { isGuestDirtyTrackingSuppressed } from './guest-dirty-tracking';

export type AuthPhase =
  | 'loading'
  | 'welcome'
  | 'guest'
  | 'authenticating'
  | 'resolving-data'
  | 'authenticated'
  | 'error';
export type DataResolution = 'cloud' | 'device' | 'cancel';

export interface SignOutResult {
  status: 'signed-out' | 'sync-failed';
  message?: string;
}

interface AuthContextValue {
  phase: AuthPhase;
  session: Session | null;
  user: User | null;
  isGuest: boolean;
  workingProvider?: AuthProvider;
  error?: string;
  continueWithProvider: (provider: AuthProvider, returnTo?: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  completeOAuthCallback: (url: string) => Promise<void>;
  resolveDataConflict: (choice: DataResolution) => Promise<void>;
  signOutCurrentDevice: (force?: boolean) => Promise<SignOutResult>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthSessionProvider({
  hydrated,
  children,
}: PropsWithChildren<{ hydrated: boolean }>) {
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [workingProvider, setWorkingProvider] = useState<AuthProvider | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const initializationRef = useRef<Promise<void> | undefined>(undefined);
  const initializedUserRef = useRef<string | undefined>(undefined);
  const explicitSignOutRef = useRef(false);
  const providerLockRef = useRef(false);

  const initializeAccount = useCallback(async (nextSession: Session) => {
    if (initializedUserRef.current === nextSession.user.id) {
      if (initializationRef.current) await initializationRef.current;
      return;
    }
    const task = (async () => {
      setPhase('loading');
      setSession(nextSession);
      const access = useAuthAccess.getState();
      const canConflict =
        access.authUpgradePending && access.guestEnabled && access.guestDataDirty;
      const result = await prepareAccountSync(
        nextSession.user.id,
        nextSession.user.email,
        canConflict,
      );
      if (result === 'conflict') {
        setPhase('resolving-data');
        return;
      }
      useAuthAccess.getState().finishAuthentication();
      setError(undefined);
      setPhase('authenticated');
      void useFriends.getState().hydrate({
        email: nextSession.user.email ?? undefined,
      });
    })();
    initializedUserRef.current = nextSession.user.id;
    initializationRef.current = task;
    try {
      await task;
    } catch (accountError) {
      if (initializedUserRef.current === nextSession.user.id) {
        initializedUserRef.current = undefined;
      }
      throw accountError;
    } finally {
      initializationRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    const client = getSupabaseClient();
    if (!client) {
      const timer = setTimeout(() => {
        if (active) setPhase(useAuthAccess.getState().guestEnabled ? 'guest' : 'welcome');
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }

    const SESSION_TIMEOUT_MS = 5_000;
    let sessionResolved = false;
    const timeout = setTimeout(() => {
      if (!active || sessionResolved) return;
      // Prefer a recoverable welcome/guest shell over an infinite blank load.
      setPhase(useAuthAccess.getState().guestEnabled ? 'guest' : 'welcome');
    }, SESSION_TIMEOUT_MS);

    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        sessionResolved = true;
        clearTimeout(timeout);
        if (sessionError) {
          setError(accessibleAuthError(sessionError));
          setPhase('error');
        } else if (data.session) {
          const accountTimeout = setTimeout(() => {
            if (!active) return;
            setError('Opening your account is taking too long. Please try again.');
            setPhase('error');
          }, 12_000);
          void initializeAccount(data.session)
            .catch((accountError: unknown) => {
              if (!active) return;
              setError(accessibleAuthError(accountError));
              setPhase('error');
            })
            .finally(() => clearTimeout(accountTimeout));
        } else {
          const access = useAuthAccess.getState();
          // A browser back/cancel can return without an OAuth callback. Keep the
          // persisted pending marker for callback validation, but never strand
          // the user behind a disabled authentication screen.
          setPhase(access.guestEnabled ? 'guest' : 'welcome');
        }
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        sessionResolved = true;
        clearTimeout(timeout);
        setError(accessibleAuthError(sessionError));
        setPhase('error');
      });

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setTimeout(() => {
        if (!active) return;
        if (nextSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          void initializeAccount(nextSession).catch((accountError: unknown) => {
            if (!active) return;
            setError(accessibleAuthError(accountError));
            setPhase('error');
          });
        } else if (event === 'SIGNED_OUT' && !explicitSignOutRef.current) {
          initializedUserRef.current = undefined;
          // Account-owned stores must not survive an expired session: otherwise
          // a subsequent account could upload retained domains from this user.
          setPhase('loading');
          void clearLocalAccountData()
            .catch((cleanupError: unknown) => {
              if (active) setError(accessibleAuthError(cleanupError));
            })
            .finally(() => {
              if (!active) return;
              useFriends.getState().clear();
              useAuthAccess.getState().resetAccess();
              setSession(null);
              setPhase('welcome');
            });
        }
      }, 0);
    });
    return () => {
      active = false;
      clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [hydrated, initializeAccount]);

  useEffect(() => {
    if (!hydrated || phase !== 'guest') return;
    // Subscribe immediately so guest edits cannot sneak in before dirty tracking
    // starts. Seed/migration writes must use withoutGuestDirtyTracking instead.
    const mark = () => {
      if (!isGuestDirtyTrackingSuppressed()) {
        useAuthAccess.getState().markGuestDataDirty();
      }
    };
    const unsubscribers = [
      usePreferences.subscribe(mark),
      useSchedule.subscribe(mark),
      usePlants.subscribe(mark),
      useAddons.subscribe(mark),
      useAgents.subscribe(mark),
      useTravel.subscribe(mark),
      useTodos.subscribe(mark),
      useVisionBoard.subscribe(mark),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [hydrated, phase]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const restoreAfterBrowserCancel = () => {
      if (
        !useAuthAccess.getState().authUpgradePending ||
        window.location.pathname.endsWith('/auth/callback')
      ) {
        return;
      }
      providerLockRef.current = false;
      setWorkingProvider(undefined);
      useAuthAccess.getState().cancelAuthUpgrade();
      setPhase(useAuthAccess.getState().guestEnabled ? 'guest' : 'welcome');
    };
    window.addEventListener('pageshow', restoreAfterBrowserCancel);
    return () => window.removeEventListener('pageshow', restoreAfterBrowserCancel);
  }, []);

  const continueWithProvider = useCallback(
    async (provider: AuthProvider, returnTo?: string) => {
      if (providerLockRef.current || workingProvider) return;
      providerLockRef.current = true;
      if (returnTo) useAuthAccess.getState().setAuthReturnTo(returnTo);
      useAuthAccess.getState().startAuthUpgrade();
      setWorkingProvider(provider);
      setError(undefined);
      setPhase('authenticating');
      try {
        const nextSession =
          shouldUseNativeApple(provider, Platform.OS)
            ? await beginNativeAppleSignIn()
            : await beginBrowserSignIn(provider);
        if (nextSession) await initializeAccount(nextSession);
      } catch (providerError) {
        if (isProviderCancellation(providerError)) {
          useAuthAccess.getState().cancelAuthUpgrade();
          setPhase(useAuthAccess.getState().guestEnabled ? 'guest' : 'welcome');
        } else {
          const currentSession = await getSupabaseClient()?.auth.getSession();
          if (!currentSession?.data.session) useAuthAccess.getState().cancelAuthUpgrade();
          setError(accessibleAuthError(providerError));
          setPhase('error');
        }
      } finally {
        providerLockRef.current = false;
        setWorkingProvider(undefined);
      }
    },
    [initializeAccount, workingProvider],
  );

  const continueAsGuest = useCallback(async () => {
    if (session) {
      explicitSignOutRef.current = true;
      setPhase('loading');
      try {
        cancelAccountSync();
        await signOutLocalSession();
        initializedUserRef.current = undefined;
        setSession(null);
      } catch (signOutError) {
        setError(accessibleAuthError(signOutError));
        setPhase('error');
        return;
      } finally {
        explicitSignOutRef.current = false;
      }
    }
    useAuthAccess.getState().enterGuest(hasMeaningfulLocalData());
    setError(undefined);
    setPhase('guest');
  }, [session]);

  const completeOAuthCallback = useCallback(
    async (url: string) => {
      setPhase('authenticating');
      setError(undefined);
      try {
        if (!useAuthAccess.getState().authUpgradePending) {
          throw new CloudAccountError(
            'This sign-in response was not started from this device. Start again from onTrack.',
          );
        }
        const nextSession = await exchangeOAuthCallback(url);
        await initializeAccount(nextSession);
      } catch (callbackError) {
        const currentSession = await getSupabaseClient()?.auth.getSession();
        if (!currentSession?.data.session) useAuthAccess.getState().cancelAuthUpgrade();
        setError(accessibleAuthError(callbackError));
        setPhase('error');
        throw callbackError;
      }
    },
    [initializeAccount],
  );

  const resolveDataConflict = useCallback(async (choice: DataResolution) => {
    setError(undefined);
    if (choice === 'cancel') {
      explicitSignOutRef.current = true;
      try {
        await signOutLocalSession();
        cancelAccountSync();
        initializedUserRef.current = undefined;
        setSession(null);
        useAuthAccess.getState().cancelAuthUpgrade();
        setPhase('guest');
      } catch (cancelError) {
        setError(accessibleAuthError(cancelError));
        setPhase('resolving-data');
        throw cancelError;
      } finally {
        explicitSignOutRef.current = false;
      }
      return;
    }
    try {
      await resolveAccountSync(choice);
      useAuthAccess.getState().finishAuthentication();
      setPhase('authenticated');
      void useFriends.getState().hydrate({
        email: session?.user.email ?? undefined,
      });
    } catch (resolutionError) {
      setError(accessibleAuthError(resolutionError));
      setPhase('resolving-data');
      throw resolutionError;
    }
  }, []);

  const signOutCurrentDevice = useCallback(async (force = false): Promise<SignOutResult> => {
    if (!force) {
      try {
        await flushCloudSync();
      } catch (syncError) {
        return {
          status: 'sync-failed',
          message: `Some changes have not reached the cloud. ${accessibleAuthError(syncError)}`,
        };
      }
    }
    explicitSignOutRef.current = true;
    setPhase('loading');
    try {
      await signOutLocalSession();
      await clearLocalAccountData();
      useFriends.getState().clear();
      useAuthAccess.getState().resetAccess();
      initializedUserRef.current = undefined;
      setSession(null);
      setError(undefined);
      setPhase('welcome');
      return { status: 'signed-out' };
    } finally {
      explicitSignOutRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(undefined);
    const access = useAuthAccess.getState();
    if (session) {
      initializedUserRef.current = undefined;
      setPhase('loading');
      void initializeAccount(session).catch((accountError: unknown) => {
        setError(accessibleAuthError(accountError));
        setPhase('error');
      });
    } else {
      setPhase(access.guestEnabled ? 'guest' : 'welcome');
    }
  }, [initializeAccount, session]);

  return (
    <AuthContext.Provider
      value={{
        phase,
        session,
        user: session?.user ?? null,
        isGuest: useAuthAccess((state) => state.guestEnabled) && !session,
        workingProvider,
        error,
        continueWithProvider,
        continueAsGuest,
        completeOAuthCallback,
        resolveDataConflict,
        signOutCurrentDevice,
        clearError,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSession() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  return value;
}
