import { Platform } from 'react-native';

import { getNotificationsModule } from '@/services/notifications/runtime';
import type { Plant } from '@/types/models';

export const PLANT_NOTIFICATION_CHANNEL = 'plant-care';

export async function configurePlantNotifications() {
  const notifications = await getNotificationsModule();
  if (!notifications) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync(PLANT_NOTIFICATION_CHANNEL, {
      name: 'Plant care',
      description: 'Watering and plant-care reminders',
      importance: notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function scheduleWateringNotification(plant: Plant, requestPermission: boolean) {
  const notifications = await getNotificationsModule();
  if (!notifications) return undefined;
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return undefined;
  const date = new Date(plant.nextWateringAt);
  if (date.getTime() <= Date.now()) return undefined;
  return notifications.scheduleNotificationAsync({
    content: {
      title: `Time to check ${plant.nickname}`,
      body: plant.carePlan.watering.soilCheck,
      data: { url: `/plants/${plant.id}`, plantId: plant.id },
    },
    trigger: {
      type: notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: PLANT_NOTIFICATION_CHANNEL,
    },
  });
}

export async function cancelPlantNotification(identifier?: string) {
  if (!identifier) return;
  const notifications = await getNotificationsModule();
  await notifications?.cancelScheduledNotificationAsync(identifier).catch(() => undefined);
}
