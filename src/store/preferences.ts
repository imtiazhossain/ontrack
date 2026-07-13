import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PreferencesState {
  hasOnboarded: boolean;
  name: string;
  goal: string;
  themePreference: ThemePreference;
  aiEnabled: boolean;
  hapticsEnabled: boolean;
  completeOnboarding: (input: { name: string; goal: string }) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setAiEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  resetAll: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      name: '',
      goal: '',
      themePreference: 'system',
      aiEnabled: true,
      hapticsEnabled: true,
      completeOnboarding: ({ name, goal }) => set({ hasOnboarded: true, name, goal }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      resetAll: () =>
        set({ hasOnboarded: false, name: '', goal: '', themePreference: 'system', aiEnabled: true, hapticsEnabled: true }),
    }),
    {
      name: STORAGE_KEYS.preferences,
      storage: createPersistStorage(),
    },
  ),
);
