import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import {
    accessibleAuthError,
    beginBrowserSignIn,
    beginNativeAppleSignIn,
    CloudAccountError,
    deleteOwnCloudAccount,
    exchangeOAuthCallback,
    isProviderCancellation,
    shouldUseNativeApple,
    signOutLocalSession,
    type AuthProvider,
} from '@/services/cloud/account';
import { loadAccountFlags } from '@/services/cloud/account-flags';
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
import { useVehicles } from '@/store/vehicles';
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
  status: 'signed-out' | 'sync-failed' | 'cleanup-failed';
  message?: string;
}

export interface DeleteAccountResult {
  status: 'deleted' | 'failed';
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
  deleteAccount: () => Promise<DeleteAccountResult>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

type StickyAuthPhase = Extract<AuthPhase, 'guest' | 'authenticated' | 'resolving-data'>;

type AuthSessionSnapshot = {
  phase: StickyAuthPhase;
  session: Session | null;
  initializedUserId?: string;
};

/**
 * Survives Fast Refresh remounts so RootNavigator does not flash `loading`
 * and tear down the Stack (which resets the selected tab to Today).
 */
let sessionAuthSnapshot: AuthSessionSnapshot | null = null;

function isStickyAuthPhase(phase: AuthPhase): phase is StickyAuthPhase {
  return phase === 'guest' || phase === 'authenticated' || phase === 'resolving-data';
}

export function AuthSessionProvider({
  hydrated,
  children,
}: PropsWithChildren<{ hydrated: boolean }>) {
  const [phase, setPhase] = useState<AuthPhase>(
    () => sessionAuthSnapshot?.phase ?? 'loading',
  );
  const [session, setSession] = useState<Session | null>(
    () => sessionAuthSnapshot?.session ?? null,
  );
  const [workingProvider, setWorkingProvider] = useState<AuthProvider | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const initializationRef = useRef<Promise<void> | undefined>(undefined);
  const initializedUserRef = useRef<string | undefined>(
    sessionAuthSnapshot?.initializedUserId,
  );
  const initGenerationRef = useRef(0);
  const explicitSignOutRef = useRef(false);
  const providerLockRef = useRef(false);
  const guestEnabled = useAuthAccess((state) => state.guestEnabled);

  useEffect(() => {
    if (isStickyAuthPhase(phase)) {
      sessionAuthSnapshot = {
        phase,
        session,
        initializedUserId: initializedUserRef.current,
      };
      return;
    }
    if (phase === 'welcome' || phase === 'error') {
      sessionAuthSnapshot = null;
    }
  }, [phase, session]);

  const initializeAccount = useCallback(async (nextSession: Session) => {
    if (initializedUserRef.current === nextSession.user.id) {
      if (initializationRef.current) await initializationRef.current;
      return;
    }
    const generation = ++initGenerationRef.current;
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
        () => initGenerationRef.current === generation,
      );
      if (initGenerationRef.current !== generation) return;
      if (result === 'conflict') {
        setPhase('resolving-data');
        return;
      }
      const live = await getSupabaseClient()?.auth.getSession();
      if (initGenerationRef.current !== generation || !live?.data.session) {
        cancelAccountSync();
        if (initGenerationRef.current !== generation) return;
        initializedUserRef.current = undefined;
        setSession(null);
        const access = useAuthAccess.getState();
        if (access.guestEnabled) {
          setPhase('guest');
          return;
        }
        // Mirror SIGNED_OUT / null-boot: drop account-owned local data so the
        // next empty-cloud sign-in cannot upload a prior account graph.
        setPhase('loading');
        void clearLocalAccountData()
          .catch(() => undefined)
          .finally(() => {
            if (initGenerationRef.current !== generation) return;
            useFriends.getState().clear();
            useAuthAccess.getState().resetAccess();
            setPhase('welcome');
          });
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
      // A newer boot/retry invalidated this generation — swallow the stale failure.
      if (initGenerationRef.current !== generation) return;
      if (initializedUserRef.current === nextSession.user.id) {
        initializedUserRef.current = undefined;
      }
      throw accountError;
    } finally {
      if (initializationRef.current === task) {
        initializationRef.current = undefined;
      }
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
      // Never demote a sticky authenticated/guest snapshot restored on remount.
      setPhase((current) => {
        if (
          current === 'authenticated' ||
          current === 'guest' ||
          current === 'resolving-data'
        ) {
          return current;
        }
        if (current !== 'loading') return current;
        return useAuthAccess.getState().guestEnabled ? 'guest' : 'welcome';
      });
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
          const bootGeneration = initGenerationRef.current + 1;
          const accountTimeout = setTimeout(() => {
            if (!active || initGenerationRef.current !== bootGeneration) return;
            // Invalidate the in-flight init so a late success cannot flip phase
            // after we have already surfaced the timeout error.
            initGenerationRef.current += 1;
            initializedUserRef.current = undefined;
            cancelAccountSync();
            setError('Opening your account is taking too long. Please try again.');
            setPhase('error');
          }, 12_000);
          void initializeAccount(data.session)
            .catch((accountError: unknown) => {
              if (!active || initGenerationRef.current !== bootGeneration) return;
              setError(accessibleAuthError(accountError));
              setPhase('error');
            })
            .finally(() => clearTimeout(accountTimeout));
        } else {
          const access = useAuthAccess.getState();
          // Explicit null session — clear any sticky React session. Non-guest
          // devices must also drop account-owned local data (same as SIGNED_OUT)
          // so a later empty-cloud sign-in cannot upload a prior account graph.
          initGenerationRef.current += 1;
          initializedUserRef.current = undefined;
          setSession(null);
          if (access.guestEnabled) {
            cancelAccountSync();
            setPhase('guest');
            return;
          }
          setPhase('loading');
          void clearLocalAccountData()
            .catch((cleanupError: unknown) => {
              if (active) setError(accessibleAuthError(cleanupError));
            })
            .finally(() => {
              if (!active) return;
              useFriends.getState().clear();
              useAuthAccess.getState().resetAccess();
              setPhase('welcome');
            });
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
          // Invalidate in-flight prepare/resolve so a late finishAuthentication
          // cannot resurrect an authenticated shell after the session died.
          initGenerationRef.current += 1;
          initializedUserRef.current = undefined;
          const access = useAuthAccess.getState();
          // Mid data-choice: keep the guest device dataset the user was deciding
          // on. Wiping here would destroy the only copy of those plans.
          const preserveGuestConflict =
            access.guestEnabled && (access.guestDataDirty || access.authUpgradePending);
          setPhase('loading');
          if (preserveGuestConflict) {
            cancelAccountSync();
            useFriends.getState().clear();
            useAuthAccess.getState().cancelAuthUpgrade();
            setSession(null);
            setError(undefined);
            setPhase('guest');
            return;
          }
          // Account-owned stores must not survive an expired session: otherwise
          // a subsequent account could upload retained domains from this user.
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
    if (!hydrated) return;
    // Keep dirty tracking through authenticating / conflict phases so guest
    // edits during upgrade still trigger a data-choice instead of a silent wipe.
    if (!guestEnabled || phase === 'authenticated' || phase === 'welcome') return;
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
      useVehicles.subscribe(mark),
      useVisionBoard.subscribe(mark),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [guestEnabled, hydrated, phase]);

  // Privilege flags are in-memory only; reload whenever the signed-in user is active
  // (covers Fast Refresh, sticky auth restore, and recovering from a prior failed fetch).
  useEffect(() => {
    if (phase !== 'authenticated' || !session?.user?.id) return;
    void loadAccountFlags(session.user.id);
  }, [phase, session?.user?.id]);

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
      // Always write the return path (including clearing a stale invite route
      // when this sign-in did not pass returnTo).
      useAuthAccess.getState().setAuthReturnTo(returnTo);
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
          setError(undefined);
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
    // Abandon any in-flight account open before (or instead of) local sign-out.
    initGenerationRef.current += 1;
    if (session) {
      explicitSignOutRef.current = true;
      setPhase('loading');
      try {
        cancelAccountSync();
        await signOutLocalSession();
        // Friends are account-scoped; local plans stay and are marked dirty so
        // the next sign-in offers a data-choice instead of a silent upload.
        useFriends.getState().clear();
        initializedUserRef.current = undefined;
        setSession(null);
      } catch (signOutError) {
        setError(accessibleAuthError(signOutError));
        setPhase('error');
        return;
      } finally {
        explicitSignOutRef.current = false;
      }
    } else {
      cancelAccountSync();
      initializedUserRef.current = undefined;
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
      initGenerationRef.current += 1;
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
    const generation = ++initGenerationRef.current;
    try {
      await resolveAccountSync(choice, () => initGenerationRef.current === generation);
      if (initGenerationRef.current !== generation) return;
      const live = await getSupabaseClient()?.auth.getSession();
      if (initGenerationRef.current !== generation) return;
      if (!live?.data.session) {
        cancelAccountSync();
        initializedUserRef.current = undefined;
        setSession(null);
        useAuthAccess.getState().cancelAuthUpgrade();
        setPhase('guest');
        return;
      }
      useAuthAccess.getState().finishAuthentication();
      setPhase('authenticated');
      void useFriends.getState().hydrate({
        email: session?.user.email ?? undefined,
      });
    } catch (resolutionError) {
      if (initGenerationRef.current !== generation) return;
      setError(accessibleAuthError(resolutionError));
      setPhase('resolving-data');
      throw resolutionError;
    }
  }, [session]);

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
    initGenerationRef.current += 1;
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
    } catch (signOutError) {
      // Local tokens may already be gone — never leave the UI "authenticated"
      // without a live Supabase session.
      initGenerationRef.current += 1;
      initializedUserRef.current = undefined;
      setSession(null);
      try {
        await clearLocalAccountData();
      } catch {
        // Best-effort; surface the original failure below.
      }
      useFriends.getState().clear();
      useAuthAccess.getState().resetAccess();
      setError(accessibleAuthError(signOutError));
      setPhase('welcome');
      return {
        status: 'cleanup-failed',
        message: accessibleAuthError(signOutError),
      };
    } finally {
      explicitSignOutRef.current = false;
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<DeleteAccountResult> => {
    explicitSignOutRef.current = true;
    initGenerationRef.current += 1;
    setPhase('loading');
    try {
      await deleteOwnCloudAccount();
      await clearLocalAccountData();
      useFriends.getState().clear();
      useAuthAccess.getState().resetAccess();
      initializedUserRef.current = undefined;
      setSession(null);
      setError(undefined);
      setPhase('welcome');
      return { status: 'deleted' };
    } catch (deleteError) {
      const stillSignedIn = !!(await getSupabaseClient()?.auth.getSession())?.data.session;
      setError(accessibleAuthError(deleteError));
      if (stillSignedIn) {
        setPhase('authenticated');
      } else {
        initializedUserRef.current = undefined;
        setSession(null);
        try {
          await clearLocalAccountData();
        } catch {
          // Best-effort wipe once the auth user is already gone.
        }
        useFriends.getState().clear();
        useAuthAccess.getState().resetAccess();
        setPhase('welcome');
      }
      return {
        status: 'failed',
        message: accessibleAuthError(deleteError),
      };
    } finally {
      explicitSignOutRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(undefined);
    const access = useAuthAccess.getState();
    if (session) {
      // Invalidate any timed-out / stuck init before retrying.
      initGenerationRef.current += 1;
      initializedUserRef.current = undefined;
      cancelAccountSync();
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
        isGuest: guestEnabled && !session,
        workingProvider,
        error,
        continueWithProvider,
        continueAsGuest,
        completeOAuthCallback,
        resolveDataConflict,
        signOutCurrentDevice,
        deleteAccount,
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
