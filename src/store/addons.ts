import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_ADDON_ENTITLEMENTS, DEFAULT_ADDON_STATE } from '@/addons/registry';
import type {
  AddonEnabledState,
  AddonEntitlementState,
  AddonId,
} from '@/addons/types';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

interface AddonState {
  /** Test builds grant the full catalog; this map only controls visibility. */
  enabled: AddonEnabledState;
  entitlements: AddonEntitlementState;
  updatedAt: string;
  setEnabled: (id: AddonId, enabled: boolean) => void;
  replaceEnabled: (enabled: AddonEnabledState, updatedAt?: string) => void;
  replaceEntitlements: (entitlements: AddonEntitlementState) => void;
  reset: () => void;
}

function timestamp() {
  return new Date().toISOString();
}

export const useAddons = create<AddonState>()(
  persist(
    (set) => ({
      enabled: DEFAULT_ADDON_STATE,
      entitlements: DEFAULT_ADDON_ENTITLEMENTS,
      updatedAt: timestamp(),
      setEnabled: (id, value) =>
        set((state) =>
          state.entitlements[id].active
            ? {
                enabled: { ...state.enabled, [id]: value },
                updatedAt: timestamp(),
              }
            : state,
        ),
      replaceEnabled: (enabled, updatedAt = timestamp()) => set({ enabled, updatedAt }),
      replaceEntitlements: (entitlements) =>
        set((state) => ({
          entitlements,
          enabled: Object.fromEntries(
            Object.entries(state.enabled).map(([id, enabled]) => [
              id,
              enabled && entitlements[id as AddonId].active,
            ]),
          ) as AddonEnabledState,
        })),
      reset: () =>
        set({
          enabled: DEFAULT_ADDON_STATE,
          entitlements: DEFAULT_ADDON_ENTITLEMENTS,
          updatedAt: timestamp(),
        }),
    }),
    {
      name: STORAGE_KEYS.addons,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AddonState>;
        return {
          ...currentState,
          ...persisted,
          enabled: { ...DEFAULT_ADDON_STATE, ...persisted.enabled },
          entitlements: DEFAULT_ADDON_ENTITLEMENTS,
        };
      },
      partialize: (state) => ({ enabled: state.enabled, updatedAt: state.updatedAt }) as AddonState,
    },
  ),
);
