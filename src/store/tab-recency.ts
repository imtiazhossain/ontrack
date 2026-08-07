import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

import { DEFAULT_TAB_ORDER } from '@/components/navigation/tab-recency';

const KNOWN_TAB_NAMES = new Set<string>(DEFAULT_TAB_ORDER);

type TabRecencyState = {
  lastFocusedAt: Record<string, number>;
  recordTabFocus: (routeName: string, at?: number) => void;
};

function sanitizeLastFocusedAt(
  value?: Partial<Record<string, unknown>> | null,
): Record<string, number> {
  if (!value) return {};
  const next: Record<string, number> = {};
  for (const [name, at] of Object.entries(value)) {
    if (!KNOWN_TAB_NAMES.has(name)) continue;
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    next[name] = at;
  }
  return next;
}

export const useTabRecency = create<TabRecencyState>()(
  persist(
    (set, get) => ({
      lastFocusedAt: {},
      recordTabFocus: (routeName, at = Date.now()) => {
        if (!KNOWN_TAB_NAMES.has(routeName)) return;
        if (!Number.isFinite(at)) return;
        const prev = get().lastFocusedAt;
        const previous = prev[routeName];
        if (previous === at) return;
        // Already uniquely most recent — skip so the carousel doesn't reshuffle
        // (and remount) on every focus of the same tab.
        let maxOther = Number.NEGATIVE_INFINITY;
        for (const [name, stamp] of Object.entries(prev)) {
          if (name === routeName) continue;
          if (typeof stamp === 'number' && stamp > maxOther) maxOther = stamp;
        }
        if (typeof previous === 'number' && previous > maxOther) return;
        set({
          lastFocusedAt: {
            ...prev,
            [routeName]: at,
          },
        });
      },
    }),
    {
      name: STORAGE_KEYS.tabRecency,
      storage: createPersistStorage(),
      partialize: (state) => ({
        lastFocusedAt: state.lastFocusedAt,
      }),
      merge: (persisted, current) => {
        const raw =
          persisted && typeof persisted === 'object'
            ? (persisted as Partial<TabRecencyState>)
            : undefined;
        return {
          ...current,
          lastFocusedAt: sanitizeLastFocusedAt(raw?.lastFocusedAt),
        };
      },
    },
  ),
);
