import { create } from 'zustand';

import { todayKey } from '@/utils/date';

/** Ephemeral UI state — deliberately not persisted. */
interface UIState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activeWorkoutActivityId: string | null;
  setActiveWorkout: (activityId: string | null) => void;
  carouselBrowse: {
    anchorRouteName: string;
    centerRouteName: string;
  } | null;
  setCarouselBrowse: (
    browse: UIState['carouselBrowse'],
  ) => void;
  carouselSwipeClaimed: boolean;
  setCarouselSwipeClaimed: (claimed: boolean) => void;
  carouselPendingRouteName: string | null;
  tabBarHeight: number;
  setTabBarHeight: (height: number) => void;
  notifyPageInteraction: () => void;
}

export const useUI = create<UIState>((set) => ({
  selectedDate: todayKey(),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  activeWorkoutActivityId: null,
  setActiveWorkout: (activeWorkoutActivityId) => set({ activeWorkoutActivityId }),
  carouselBrowse: null,
  setCarouselBrowse: (carouselBrowse) => set({ carouselBrowse }),
  carouselSwipeClaimed: false,
  setCarouselSwipeClaimed: (carouselSwipeClaimed) =>
    set({ carouselSwipeClaimed }),
  carouselPendingRouteName: null,
  tabBarHeight: 0,
  setTabBarHeight: (tabBarHeight) => set({ tabBarHeight }),
  notifyPageInteraction: () =>
    set({
      carouselBrowse: null,
      carouselSwipeClaimed: false,
      carouselPendingRouteName: null,
    }),
}));
