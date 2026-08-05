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

const ADDON_IDS = Object.keys(DEFAULT_ADDON_STATE) as AddonId[];

function timestamp() {
  return new Date().toISOString();
}

/** Keep only known catalog keys so stale cloud/local rows cannot crash entitlement merges. */
export function sanitizeAddonEnabled(
  enabled?: Partial<Record<string, unknown>> | null,
): AddonEnabledState {
  const next = { ...DEFAULT_ADDON_STATE };
  if (!enabled) return next;
  for (const id of ADDON_IDS) {
    if (typeof enabled[id] === 'boolean') next[id] = enabled[id];
  }
  return next;
}

function mergeEntitlements(
  entitlements?: Partial<AddonEntitlementState> | null,
): AddonEntitlementState {
  return { ...DEFAULT_ADDON_ENTITLEMENTS, ...entitlements };
}

export const useAddons = create<AddonState>()(
  persist(
    (set) => ({
      enabled: DEFAULT_ADDON_STATE,
      entitlements: DEFAULT_ADDON_ENTITLEMENTS,
      updatedAt: timestamp(),
      setEnabled: (id, value) =>
        set((state) =>
          state.entitlements[id]?.active
            ? {
                enabled: { ...state.enabled, [id]: value },
                updatedAt: timestamp(),
              }
            : state,
        ),
      replaceEnabled: (enabled, updatedAt = timestamp()) =>
        set({ enabled: sanitizeAddonEnabled(enabled), updatedAt }),
      replaceEntitlements: (entitlements) =>
        set((state) => {
          const nextEntitlements = mergeEntitlements(entitlements);
          const enabled = { ...DEFAULT_ADDON_STATE };
          for (const id of ADDON_IDS) {
            enabled[id] = Boolean(state.enabled[id] && nextEntitlements[id]?.active);
          }
          return { entitlements: nextEntitlements, enabled };
        }),
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
          enabled: sanitizeAddonEnabled(persisted.enabled),
          entitlements: DEFAULT_ADDON_ENTITLEMENTS,
        };
      },
      partialize: (state) => ({ enabled: state.enabled, updatedAt: state.updatedAt }) as AddonState,
    },
  ),
);
