import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

interface AuthAccessState {
  guestEnabled: boolean;
  guestDataDirty: boolean;
  authUpgradePending: boolean;
  pendingAuthReturnTo?: string;
  enterGuest: (dirty?: boolean) => void;
  markGuestDataDirty: () => void;
  startAuthUpgrade: () => void;
  setAuthReturnTo: (path?: string) => void;
  takeAuthReturnTo: () => string | undefined;
  finishAuthentication: () => void;
  cancelAuthUpgrade: () => void;
  resetAccess: () => void;
}

export const useAuthAccess = create<AuthAccessState>()(
  persist(
    (set, get) => ({
      guestEnabled: false,
      guestDataDirty: false,
      authUpgradePending: false,
      enterGuest: (dirty = false) =>
        set({
          guestEnabled: true,
          guestDataDirty: dirty,
          authUpgradePending: false,
        }),
      markGuestDataDirty: () =>
        set((state) => (state.guestEnabled ? { guestDataDirty: true } : state)),
      startAuthUpgrade: () => set({ authUpgradePending: true }),
      setAuthReturnTo: (path) =>
        set({
          pendingAuthReturnTo:
            typeof path === 'string' && path.startsWith('/') ? path : undefined,
        }),
      takeAuthReturnTo: () => {
        const path = get().pendingAuthReturnTo;
        set({ pendingAuthReturnTo: undefined });
        return path;
      },
      finishAuthentication: () =>
        set({
          guestEnabled: false,
          guestDataDirty: false,
          authUpgradePending: false,
        }),
      cancelAuthUpgrade: () => set({ authUpgradePending: false }),
      resetAccess: () =>
        set({
          guestEnabled: false,
          guestDataDirty: false,
          authUpgradePending: false,
          pendingAuthReturnTo: undefined,
        }),
    }),
    {
      name: STORAGE_KEYS.authAccess,
      storage: createPersistStorage(),
      partialize: ({
        guestEnabled,
        guestDataDirty,
        authUpgradePending,
        pendingAuthReturnTo,
      }) =>
        ({
          guestEnabled,
          guestDataDirty,
          authUpgradePending,
          pendingAuthReturnTo,
        }) as AuthAccessState,
    },
  ),
);
