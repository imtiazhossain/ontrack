import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { usePlants } from '@/store/plants';
import { useSchedule } from '@/store/schedule';
import type { Plant } from '@/types/models';
import { toDateKey } from '@/utils/date';
import {
  activatePlantSchedule,
  logPlantWatering,
  undoPlantWatering,
  wateringDueAt,
} from '@/services/plants/schedule';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  scheduleNotificationAsync: jest.fn(async () => 'notification-1'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
}));

const plant: Plant = {
  id: 'plant-1', nickname: 'Moss', photoUri: 'file:///plants/moss.jpg',
  identity: { commonName: 'Pothos', scientificName: 'Epipremnum aureum', confidence: 0.93 },
  health: {
    status: 'healthy', summary: 'Healthy foliage.', visibleSigns: ['Green leaves'], possibleCauses: [],
    actions: ['Continue observing'], confidence: 0.9, assessedAt: '2026-07-20T12:00:00.000Z',
  },
  carePlan: {
    watering: { minMl: 200, maxMl: 350, intervalDays: 7, soilCheck: 'Check the top 3 cm.', notes: 'Drain excess.' },
    pruning: { urgency: 'not-needed', reason: 'No pruning is visible.', steps: [] },
    placement: { light: 'Bright indirect light', location: 'East window', windowDistance: '1 m away', avoid: ['Vents'] },
    sources: [{ title: 'Extension', url: 'https://extension.umn.edu/houseplants' }],
    disclaimer: 'Conditions vary.', generatedAt: '2026-07-20T12:00:00.000Z',
  },
  room: { potDiameterCm: 20, drainage: 'yes', windowDirection: 'east', windowDistanceM: 1, directSunHours: 2 },
  lastWateredAt: '2026-07-20T13:00:00.000Z', nextWateringAt: '2026-07-27T13:00:00.000Z', reminderMinutes: 540,
  wateringLogs: [], checkIns: [], createdAt: '2026-07-20T12:00:00.000Z', updatedAt: '2026-07-20T12:00:00.000Z',
};

describe('plant watering scheduling', () => {
  beforeEach(() => {
    usePlants.setState({ plants: [{ ...plant, wateringLogs: [], checkIns: [] }] });
    useSchedule.setState({ activities: [], meals: [], workouts: [], workSessions: [], movies: [], seeded: true });
  });

  it('uses local calendar days and preserves the chosen reminder time across DST', () => {
    const result = new Date(wateringDueAt(new Date(2026, 2, 7, 15), 2, 570));
    expect(toDateKey(result)).toBe('2026-03-09');
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });

  it('creates only one pending watering activity', async () => {
    await activatePlantSchedule(plant.id, false);
    expect(useSchedule.getState().activities).toEqual([
      expect.objectContaining({ plantId: plant.id, careKind: 'watering', status: 'upcoming' }),
    ]);
    expect(usePlants.getState().plants[0].wateringActivityId).toBe(useSchedule.getState().activities[0].id);
  });

  it('advances from actual watering and supports undoing the latest log', async () => {
    await activatePlantSchedule(plant.id, false);
    const completedId = usePlants.getState().plants[0].wateringActivityId!;
    const actual = new Date(2026, 6, 25, 16, 15);
    await logPlantWatering(plant.id, 275, actual);

    const updated = usePlants.getState().plants[0];
    expect(updated.wateringLogs).toHaveLength(1);
    expect(updated.wateringLogs[0]).toMatchObject({ amountMl: 275, activityId: completedId });
    expect(toDateKey(new Date(updated.nextWateringAt))).toBe('2026-08-01');
    expect(useSchedule.getState().activities.filter((item) => item.status === 'upcoming')).toHaveLength(1);

    await undoPlantWatering(completedId);
    expect(usePlants.getState().plants[0].wateringLogs).toHaveLength(0);
    expect(useSchedule.getState().activities).toEqual([
      expect.objectContaining({ plantId: plant.id, careKind: 'watering', status: 'upcoming' }),
    ]);
  });
});
