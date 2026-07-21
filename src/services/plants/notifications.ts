import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Plant } from '@/types/models';

export const PLANT_NOTIFICATION_CHANNEL = 'plant-care';

export async function configurePlantNotifications() {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(PLANT_NOTIFICATION_CHANNEL, {
      name: 'Plant care',
      description: 'Watering and plant-care reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function scheduleWateringNotification(plant: Plant, requestPermission: boolean) {
  if (Platform.OS === 'web') return undefined;
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return undefined;
  const date = new Date(plant.nextWateringAt);
  if (date.getTime() <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Time to check ${plant.nickname}`,
      body: plant.carePlan.watering.soilCheck,
      data: { url: `/plants/${plant.id}`, plantId: plant.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: PLANT_NOTIFICATION_CHANNEL,
    },
  });
}

export async function cancelPlantNotification(identifier?: string) {
  if (Platform.OS === 'web' || !identifier) return;
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}
