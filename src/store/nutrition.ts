import { create } from 'zustand';

import type { NutritionProfile, NutritionTargetVersion } from '@/types/models';

interface NutritionState {
  profiles: NutritionProfile[];
  activeProfileId?: string;
  targetVersions: NutritionTargetVersion[];
  setActiveProfile: (id: string) => void;
  upsertProfile: (profile: NutritionProfile) => void;
  saveTargetVersion: (version: NutritionTargetVersion) => void;
  reset: () => void;
}

/**
 * Clinical profile state is intentionally memory-only. It must move to the
 * configured high-compliance cloud project rather than AsyncStorage.
 */
export const useNutrition = create<NutritionState>((set) => ({
  profiles: [],
  targetVersions: [],
  setActiveProfile: (activeProfileId) => set({ activeProfileId }),
  upsertProfile: (profile) => set((state) => ({
    profiles: [...state.profiles.filter((item) => item.id !== profile.id), profile],
    activeProfileId: state.activeProfileId ?? profile.id,
  })),
  saveTargetVersion: (version) => set((state) => ({
    targetVersions: [
      ...state.targetVersions.map((item) =>
        item.profileId === version.profileId && item.status === 'approved'
          ? { ...item, status: 'superseded' as const }
          : item),
      version,
    ],
  })),
  reset: () => set({ profiles: [], activeProfileId: undefined, targetVersions: [] }),
}));
