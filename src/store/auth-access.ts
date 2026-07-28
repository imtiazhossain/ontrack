import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

interface AuthAccessState {
  guestEnabled: boolean;
  guestDataDirty: boolean;
  authUpgradePending: boolean;
  enterGuest: (dirty?: boolean) => void;
  markGuestDataDirty: () => void;
  startAuthUpgrade: () => void;
  finishAuthentication: () => void;
  cancelAuthUpgrade: () => void;
  resetAccess: () => void;
}

export const useAuthAccess = create<AuthAccessState>()(
  persist(
    (set) => ({
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
        }),
    }),
    {
      name: STORAGE_KEYS.authAccess,
      storage: createPersistStorage(),
      partialize: ({ guestEnabled, guestDataDirty, authUpgradePending }) =>
        ({ guestEnabled, guestDataDirty, authUpgradePending }) as AuthAccessState,
    },
  ),
);
