import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { useSchedule } from '@/store/schedule';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

function resetSchedule() {
  useSchedule.setState({
    seeded: true,
    activities: [],
    meals: [],
    workouts: [],
    workSessions: [],
    movies: [],
    categories: DEFAULT_CATEGORIES,
  });
}

describe('atomic calendar imports', () => {
  beforeEach(resetSchedule);

  it('creates activities and compatible specialized details together', () => {
    const imported = useSchedule.getState().importEvents([
      {
        title: 'Lunch',
        date: '2026-07-30',
        startMinutes: 12 * 60,
        durationMinutes: 45,
        categoryId: 'food',
      },
      {
        title: 'Workout',
        date: '2026-07-30',
        startMinutes: 17 * 60,
        durationMinutes: 60,
        categoryId: 'gym',
      },
      {
        title: 'Planning',
        date: '2026-07-31',
        startMinutes: 9 * 60,
        durationMinutes: 30,
        categoryId: 'work',
      },
    ]);

    const state = useSchedule.getState();
    expect(imported).toHaveLength(3);
    expect(state.activities).toHaveLength(3);
    expect(state.meals).toEqual([
      expect.objectContaining({ activityId: imported[0].id, name: 'Lunch' }),
    ]);
    expect(state.workouts).toEqual([
      expect.objectContaining({ activityId: imported[1].id, name: 'Workout' }),
    ]);
    expect(state.workSessions).toEqual([
      expect.objectContaining({ activityId: imported[2].id }),
    ]);
  });

  it('writes nothing when any draft is invalid', () => {
    expect(() =>
      useSchedule.getState().importEvents([
        {
          title: 'Valid',
          date: '2026-07-30',
          startMinutes: 600,
          durationMinutes: 60,
          categoryId: 'appointment',
        },
        {
          title: 'Missing date',
          date: '',
          startMinutes: 700,
          durationMinutes: 60,
          categoryId: 'appointment',
        },
      ]),
    ).toThrow('valid date');
    expect(useSchedule.getState().activities).toEqual([]);
  });

  it('rejects categories that require dedicated editors', () => {
    expect(() =>
      useSchedule.getState().importEvents([
        {
          title: 'Movie',
          date: '2026-07-30',
          startMinutes: 1200,
          durationMinutes: 120,
          categoryId: 'movie',
        },
      ]),
    ).toThrow('dedicated editor');
    expect(useSchedule.getState().activities).toEqual([]);
  });
});
