import * as Haptics from 'expo-haptics';

import { usePreferences } from '@/store/preferences';

function enabled(): boolean {
  return usePreferences.getState().hapticsEnabled;
}

export const haptics = {
  tap() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  select() {
    if (enabled()) Haptics.selectionAsync();
  },
  success() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  warning() {
    if (enabled()) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
  heavy() {
    if (enabled()) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },
};
