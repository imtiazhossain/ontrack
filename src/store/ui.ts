import { create } from 'zustand';

import { todayKey } from '@/utils/date';

/** Ephemeral UI state — deliberately not persisted. */
interface UIState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeWorkoutActivityId: string | null;
  setActiveWorkout: (activityId: string | null) => void;
}

export const useUI = create<UIState>((set) => ({
  selectedDate: todayKey(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  activeWorkoutActivityId: null,
  setActiveWorkout: (activeWorkoutActivityId) => set({ activeWorkoutActivityId }),
}));
