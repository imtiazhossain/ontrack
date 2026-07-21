import type { Plant, PlantCarePlan, WateringLog } from '@/types/models';
import { usePlants } from '@/store/plants';
import { newId, useSchedule } from '@/store/schedule';
import { addDays, fromDateKey, toDateKey, todayKey } from '@/utils/date';
import { cancelPlantNotification, scheduleWateringNotification } from './notifications';
import { deletePlantPhotos } from './media';

export function wateringDueAt(from: string | Date, intervalDays: number, reminderMinutes: number): string {
  const dateKey = addDays(toDateKey(new Date(from)), Math.max(1, Math.round(intervalDays)));
  const date = fromDateKey(dateKey);
  date.setHours(Math.floor(reminderMinutes / 60), reminderMinutes % 60, 0, 0);
  return date.toISOString();
}

function activityDateFor(plant: Plant) {
  const due = toDateKey(new Date(plant.nextWateringAt));
  return due < todayKey() ? todayKey() : due;
}

async function createPendingActivity(plant: Plant, requestPermission: boolean) {
  const activity = useSchedule.getState().saveEvent({
    detailKind: 'plant',
    activity: {
      date: activityDateFor(plant),
      title: `Water ${plant.nickname}`,
      categoryId: 'plant',
      startMinutes: plant.reminderMinutes,
      durationMinutes: 10,
      status: 'upcoming',
      photo: plant.photoUri,
      summary: `${Math.round(plant.carePlan.watering.minMl)}–${Math.round(plant.carePlan.watering.maxMl)} mL · check soil`,
      plantId: plant.id,
      careKind: 'watering',
    },
  });
  const notificationId = await scheduleWateringNotification(
    { ...plant, wateringActivityId: activity.id },
    requestPermission,
  ).catch(() => undefined);
  usePlants.getState().updatePlant(plant.id, { wateringActivityId: activity.id, notificationId });
}

export async function activatePlantSchedule(plantId: string, requestPermission = true) {
  const plant = usePlants.getState().plants.find((item) => item.id === plantId);
  if (!plant) return;
  await cancelPlantNotification(plant.notificationId);
  if (plant.wateringActivityId) useSchedule.getState().deleteActivity(plant.wateringActivityId);
  await createPendingActivity({ ...plant, notificationId: undefined, wateringActivityId: undefined }, requestPermission);
}

export async function logPlantWatering(plantId: string, amountMl?: number, wateredAt = new Date()) {
  const plant = usePlants.getState().plants.find((item) => item.id === plantId);
  if (!plant) return;
  await cancelPlantNotification(plant.notificationId);
  if (plant.wateringActivityId) useSchedule.getState().setStatus(plant.wateringActivityId, 'completed');
  const log: WateringLog = {
    id: newId('watering'),
    wateredAt: wateredAt.toISOString(),
    amountMl,
    activityId: plant.wateringActivityId,
    priorNextWateringAt: plant.nextWateringAt,
  };
  const nextWateringAt = wateringDueAt(wateredAt, plant.carePlan.watering.intervalDays, plant.reminderMinutes);
  usePlants.getState().addWateringLog(plant.id, log);
  usePlants.getState().updatePlant(plant.id, {
    lastWateredAt: log.wateredAt,
    nextWateringAt,
    notificationId: undefined,
    wateringActivityId: undefined,
  });
  const updated = usePlants.getState().plants.find((item) => item.id === plant.id);
  if (updated) await createPendingActivity(updated, false);
}

export async function undoPlantWatering(activityId: string) {
  const plant = usePlants.getState().plants.find((item) =>
    item.wateringLogs.some((log) => log.activityId === activityId));
  const log = plant?.wateringLogs.find((item) => item.activityId === activityId);
  if (!plant || !log || plant.wateringLogs.at(-1)?.id !== log.id) return false;
  await cancelPlantNotification(plant.notificationId);
  if (plant.wateringActivityId) useSchedule.getState().deleteActivity(plant.wateringActivityId);
  useSchedule.getState().deleteActivity(activityId);
  usePlants.getState().removeWateringLog(plant.id, log.id);
  const remaining = usePlants.getState().plants.find((item) => item.id === plant.id)?.wateringLogs ?? [];
  usePlants.getState().updatePlant(plant.id, {
    lastWateredAt: remaining.at(-1)?.wateredAt,
    nextWateringAt: log.priorNextWateringAt,
    notificationId: undefined,
    wateringActivityId: undefined,
  });
  const updated = usePlants.getState().plants.find((item) => item.id === plant.id);
  if (updated) await createPendingActivity(updated, false);
  return true;
}

export async function applyPlantCarePlan(plantId: string, carePlan: PlantCarePlan) {
  const plant = usePlants.getState().plants.find((item) => item.id === plantId);
  if (!plant) return;
  const basis = plant.lastWateredAt ?? new Date().toISOString();
  usePlants.getState().updatePlant(plant.id, {
    carePlan,
    nextWateringAt: wateringDueAt(basis, carePlan.watering.intervalDays, plant.reminderMinutes),
  });
  await activatePlantSchedule(plant.id, false);
}

export function addPruningActivity(plantId: string) {
  const plant = usePlants.getState().plants.find((item) => item.id === plantId);
  if (!plant) return;
  const existing = useSchedule.getState().activities.find((activity) =>
    activity.plantId === plantId && activity.careKind === 'pruning' && activity.status === 'upcoming');
  if (existing) return existing;
  return useSchedule.getState().saveEvent({
    detailKind: 'plant',
    activity: {
      date: todayKey(),
      title: `Prune ${plant.nickname}`,
      categoryId: 'plant',
      startMinutes: plant.reminderMinutes,
      durationMinutes: 20,
      status: 'upcoming',
      photo: plant.photoUri,
      summary: plant.carePlan.pruning.reason,
      plantId: plant.id,
      careKind: 'pruning',
    },
  });
}

export async function deletePlant(plantId: string) {
  const plant = usePlants.getState().plants.find((item) => item.id === plantId);
  if (!plant) return;
  await cancelPlantNotification(plant.notificationId);
  const activities = useSchedule.getState().activities.filter((activity) => activity.plantId === plantId);
  activities.forEach((activity) => useSchedule.getState().deleteActivity(activity.id));
  usePlants.getState().removePlant(plantId);
  await deletePlantPhotos(plantId).catch(() => undefined);
}

export async function reconcilePlantSchedules() {
  for (const plant of usePlants.getState().plants) {
    const pending = plant.wateringActivityId
      ? useSchedule.getState().activities.find((activity) => activity.id === plant.wateringActivityId)
      : undefined;
    if (!pending) {
      await createPendingActivity({ ...plant, wateringActivityId: undefined }, false);
    } else if (pending.status === 'upcoming' && pending.date < todayKey()) {
      useSchedule.getState().moveActivityToDate(pending.id, todayKey());
    }
  }
}
