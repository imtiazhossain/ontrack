import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { SyncDomainName } from '@/services/cloud/sync';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

type JsonObject = Record<string, unknown>;

export type DevModeLiveSnapshot = {
  capturedAt: string;
  domains: Partial<Record<SyncDomainName, JsonObject>>;
  health?: JsonObject;
};

interface DevModeState {
  /** Sandbox active — live account data is snapshotted; cloud push paused. */
  enabled: boolean;
  liveSnapshot: DevModeLiveSnapshot | null;
  setEnabledFlag: (enabled: boolean) => void;
  setLiveSnapshot: (snapshot: DevModeLiveSnapshot | null) => void;
}

export const useDevMode = create<DevModeState>()(
  persist(
    (set) => ({
      enabled: false,
      liveSnapshot: null,
      setEnabledFlag: (enabled) => set({ enabled }),
      setLiveSnapshot: (liveSnapshot) => set({ liveSnapshot }),
    }),
    {
      name: STORAGE_KEYS.devMode,
      storage: createPersistStorage(),
      partialize: (state) => ({
        enabled: state.enabled,
        liveSnapshot: state.liveSnapshot,
      }),
    },
  ),
);

export function isDevModeEnabled() {
  return useDevMode.getState().enabled;
}
