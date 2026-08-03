import type { Plant, PlantCarePlan, WateringLog } from '@/types/models';
import { usePlants } from '@/store/plants';
import { newId, useSchedule } from '@/store/schedule';
import { addDays, fromDateKey, toDateKey, todayKey } from '@/utils/date';
import { cancelPlantNotification, scheduleWateringNotification } from './notifications';
import { deletePlantPhotos } from './media';

const wateringInFlight = new Set<string>();
const plantScheduleLocks = new Map<string, Promise<unknown>>();
let reconcileInFlight: Promise<void> | null = null;

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

function wateringSummary(plant: Plant) {
  return `${Math.round(plant.carePlan.watering.minMl)}–${Math.round(plant.carePlan.watering.maxMl)} mL · check soil`;
}

function upcomingWateringActivities(plantId: string) {
  return useSchedule.getState().activities.filter(
    (activity) =>
      activity.plantId === plantId &&
      activity.careKind === 'watering' &&
      activity.status === 'upcoming',
  );
}

function deleteUpcomingWatering(plantId: string, keepId?: string) {
  for (const activity of upcomingWateringActivities(plantId)) {
    if (activity.id === keepId) continue;
    useSchedule.getState().deleteActivity(activity.id);
  }
}

async function withPlantScheduleLock<T>(plantId: string, run: () => Promise<T>): Promise<T> {
  const previous = plantScheduleLocks.get(plantId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const current = previous.catch(() => undefined).then(() => gate);
  plantScheduleLocks.set(plantId, current);
  await previous.catch(() => undefined);
  try {
    return await run();
  } finally {
    release();
    if (plantScheduleLocks.get(plantId) === current) {
      plantScheduleLocks.delete(plantId);
    }
  }
}

/** Must run under `withPlantScheduleLock` for the plant. */
async function createPendingActivityUnlocked(plant: Plant, requestPermission: boolean) {
  const fresh = usePlants.getState().plants.find((item) => item.id === plant.id) ?? plant;
  const upcoming = upcomingWateringActivities(fresh.id);
  const preferred =
    (fresh.wateringActivityId
      ? upcoming.find((activity) => activity.id === fresh.wateringActivityId)
      : undefined) ?? upcoming[0];

  let activity = preferred;
  if (activity) {
    deleteUpcomingWatering(fresh.id, activity.id);
    useSchedule.getState().updateActivity(activity.id, {
      date: activityDateFor(fresh),
      title: `Water ${fresh.nickname}`,
      startMinutes: fresh.reminderMinutes,
      durationMinutes: 10,
      photo: fresh.photoUri,
      summary: wateringSummary(fresh),
    });
    activity = useSchedule.getState().activities.find((item) => item.id === activity!.id) ?? activity;
  } else {
    activity = useSchedule.getState().saveEvent({
      detailKind: 'plant',
      activity: {
        date: activityDateFor(fresh),
        title: `Water ${fresh.nickname}`,
        categoryId: 'plant',
        startMinutes: fresh.reminderMinutes,
        durationMinutes: 10,
        status: 'upcoming',
        photo: fresh.photoUri,
        summary: wateringSummary(fresh),
        plantId: fresh.id,
        careKind: 'watering',
      },
    });
  }

  // Link before any await so overlapping reconcile/activate cannot create another copy.
  usePlants.getState().updatePlant(fresh.id, { wateringActivityId: activity.id });
  const notificationId = await scheduleWateringNotification(
    { ...fresh, wateringActivityId: activity.id },
    requestPermission,
  ).catch(() => undefined);
  usePlants.getState().updatePlant(fresh.id, { notificationId });
}

async function createPendingActivity(plant: Plant, requestPermission: boolean) {
  return withPlantScheduleLock(plant.id, () => createPendingActivityUnlocked(plant, requestPermission));
}

export async function activatePlantSchedule(plantId: string, requestPermission = true) {
  return withPlantScheduleLock(plantId, async () => {
    const plant = usePlants.getState().plants.find((item) => item.id === plantId);
    if (!plant) return;
    await cancelPlantNotification(plant.notificationId);
    deleteUpcomingWatering(plantId);
    usePlants.getState().updatePlant(plantId, {
      notificationId: undefined,
      wateringActivityId: undefined,
    });
    const refreshed = usePlants.getState().plants.find((item) => item.id === plantId);
    if (!refreshed) return;
    await createPendingActivityUnlocked(refreshed, requestPermission);
  });
}

export async function logPlantWatering(plantId: string, amountMl?: number, wateredAt = new Date()) {
  if (wateringInFlight.has(plantId)) return;
  wateringInFlight.add(plantId);
  try {
    const plant = usePlants.getState().plants.find((item) => item.id === plantId);
    if (!plant) return;
    await cancelPlantNotification(plant.notificationId);
    if (plant.wateringActivityId) useSchedule.getState().setStatus(plant.wateringActivityId, 'completed');
    deleteUpcomingWatering(plantId);
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
  } finally {
    wateringInFlight.delete(plantId);
  }
}

export async function undoPlantWatering(activityId: string) {
  const plant = usePlants.getState().plants.find((item) =>
    item.wateringLogs.some((log) => log.activityId === activityId));
  const log = plant?.wateringLogs.find((item) => item.activityId === activityId);
  if (!plant || !log || plant.wateringLogs.at(-1)?.id !== log.id) return false;
  await cancelPlantNotification(plant.notificationId);
  deleteUpcomingWatering(plant.id);
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
  if (reconcileInFlight) return reconcileInFlight;
  reconcileInFlight = (async () => {
    for (const plant of usePlants.getState().plants) {
      await withPlantScheduleLock(plant.id, async () => {
        const fresh = usePlants.getState().plants.find((item) => item.id === plant.id);
        if (!fresh) return;
        const upcoming = upcomingWateringActivities(fresh.id);
        const linked = fresh.wateringActivityId
          ? upcoming.find((activity) => activity.id === fresh.wateringActivityId)
          : undefined;

        if (upcoming.length > 0) {
          const keep = linked ?? upcoming[0];
          deleteUpcomingWatering(fresh.id, keep.id);
          if (fresh.wateringActivityId !== keep.id) {
            usePlants.getState().updatePlant(fresh.id, { wateringActivityId: keep.id });
          }
          if (keep.date < todayKey()) {
            useSchedule.getState().moveActivityToDate(keep.id, todayKey());
          }
          return;
        }

        await createPendingActivityUnlocked(
          { ...fresh, wateringActivityId: undefined },
          false,
        );
      });
    }
  })().finally(() => {
    reconcileInFlight = null;
  });
  return reconcileInFlight;
}
