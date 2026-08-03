import { create } from 'zustand';

import type { ProfileAvatarMeta } from '@/features/account/profile-avatar-model';
import { normalizeAvatarMeta } from '@/features/account/profile-avatar-model';

type AvatarCacheState = {
  byUserId: Record<string, ProfileAvatarMeta>;
  upsert: (userId: string, meta: ProfileAvatarMeta | unknown) => void;
  upsertMany: (
    entries: Array<{ userId: string; avatar?: ProfileAvatarMeta | unknown }>,
  ) => void;
  get: (userId: string | undefined) => ProfileAvatarMeta | undefined;
  clear: () => void;
};

export const useAvatarCache = create<AvatarCacheState>((set, get) => ({
  byUserId: {},
  upsert: (userId, meta) => {
    const id = userId.trim();
    if (!id) return;
    const normalized = normalizeAvatarMeta(meta);
    set((state) => ({
      byUserId: {
        ...state.byUserId,
        [id]: normalized,
      },
    }));
  },
  upsertMany: (entries) => {
    if (entries.length === 0) return;
    set((state) => {
      const next = { ...state.byUserId };
      for (const entry of entries) {
        const id = entry.userId.trim();
        if (!id) continue;
        next[id] = normalizeAvatarMeta(entry.avatar);
      }
      return { byUserId: next };
    });
  },
  get: (userId) => {
    const id = userId?.trim();
    if (!id) return undefined;
    return get().byUserId[id];
  },
  clear: () => set({ byUserId: {} }),
}));
