import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import { useAuthAccess } from '@/store/auth-access';
import {
  dateDisplayFormatForLocale,
  deviceLocale,
  type DateDisplayFormat,
} from '@/utils/date';

export type ThemePreference = 'system' | 'light' | 'dark';

interface PreferencesState {
  hasOnboarded: boolean;
  name: string;
  goal: string;
  /** City/place used for Today local weather (typed by the user). */
  homeLocation: string;
  themePreference: ThemePreference;
  aiEnabled: boolean;
  hapticsEnabled: boolean;
  dateLocale: string;
  dateDisplayFormat: DateDisplayFormat;
  completeOnboarding: (input: { name: string; goal: string }) => void;
  setHomeLocation: (location: string) => void;
  setThemePreference: (pref: ThemePreference) => void;
  setAiEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  resetAll: () => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => {
      const initialLocale = deviceLocale();
      return {
      hasOnboarded: false,
      name: '',
      goal: '',
      homeLocation: '',
      themePreference: 'system',
      aiEnabled: true,
      hapticsEnabled: true,
      dateLocale: initialLocale,
      dateDisplayFormat: dateDisplayFormatForLocale(initialLocale),
      completeOnboarding: ({ name, goal }) => {
        const dateLocale = deviceLocale();
        useAuthAccess.getState().markGuestDataDirty();
        set({
          hasOnboarded: true,
          name,
          goal,
          dateLocale,
          dateDisplayFormat: dateDisplayFormatForLocale(dateLocale),
        });
      },
      setHomeLocation: (homeLocation) => set({ homeLocation: homeLocation.trim() }),
      setThemePreference: (themePreference) => set({ themePreference }),
      setAiEnabled: (aiEnabled) => set({ aiEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      resetAll: () =>
        set({
          hasOnboarded: false,
          name: '',
          goal: '',
          homeLocation: '',
          themePreference: 'system',
          aiEnabled: true,
          hapticsEnabled: true,
          dateLocale: initialLocale,
          dateDisplayFormat: dateDisplayFormatForLocale(initialLocale),
        }),
      };
    },
    {
      name: STORAGE_KEYS.preferences,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PreferencesState>;
        const dateLocale =
          typeof persisted.dateLocale === 'string'
            ? persisted.dateLocale
            : currentState.dateLocale;
        return {
          ...currentState,
          ...persisted,
          dateLocale,
          dateDisplayFormat:
            persisted.dateDisplayFormat === 'mdy' ||
            persisted.dateDisplayFormat === 'iso'
              ? persisted.dateDisplayFormat
              : dateDisplayFormatForLocale(dateLocale),
        };
      },
    },
  ),
);
