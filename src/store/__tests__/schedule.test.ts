import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { STORAGE_KEYS } from '@/services/storage';
import { useSchedule } from '@/store/schedule';
import type { Activity, Meal, Movie } from '@/types/models';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const activity: Activity = {
  id: 'event-1',
  date: '2026-07-10',
  title: 'Lunch',
  categoryId: 'food',
  startMinutes: 720,
  durationMinutes: 45,
  status: 'upcoming',
  createdAt: '2026-07-10T12:00:00.000Z',
  updatedAt: '2026-07-10T12:00:00.000Z',
};

const meal: Meal = {
  activityId: activity.id,
  mealType: 'lunch',
  name: 'Lunch',
  items: [],
};

describe('schedule event saves', () => {
  beforeEach(() => {
    useSchedule.setState({
      seeded: true,
      activities: [activity],
      meals: [meal],
      workouts: [],
      workSessions: [],
      movies: [],
    });
  });

  it('atomically updates an event and its compatible details', () => {
    useSchedule.getState().saveEvent({
      id: activity.id,
      detailKind: 'food',
      activity: {
        date: activity.date,
        title: 'Updated lunch',
        categoryId: 'food',
        startMinutes: 750,
        durationMinutes: 30,
        status: 'completed',
        summary: '420 kcal · 1 item',
      },
      meal: {
        ...meal,
        name: 'Updated lunch',
        items: [
          {
            id: 'food-1',
            name: 'Soup',
            portion: '1 bowl',
            calories: 420,
            proteinG: 15,
            carbsG: 50,
            fatG: 18,
          },
        ],
      },
    });

    const state = useSchedule.getState();
    expect(state.activities[0]).toMatchObject({ title: 'Updated lunch', startMinutes: 750 });
    expect(state.meals[0].items).toHaveLength(1);
  });

  it('removes incompatible detail records after a type change', () => {
    useSchedule.getState().saveEvent({
      id: activity.id,
      detailKind: 'work',
      activity: {
        date: activity.date,
        title: 'Planning',
        categoryId: 'work',
        startMinutes: activity.startMinutes,
        durationMinutes: activity.durationMinutes,
        status: activity.status,
      },
      workSession: {
        activityId: activity.id,
        focusMinutes: 0,
        tasks: [{ id: 'task-1', title: 'Outline', done: false, priority: 'high' }],
      },
    });

    const state = useSchedule.getState();
    expect(state.meals).toHaveLength(0);
    expect(state.workSessions).toHaveLength(1);
    expect(state.activities[0].categoryId).toBe('work');
  });
});

describe('movie event details', () => {
  const movieActivity: Activity = { ...activity, id: 'movie-event', title: 'Arrival', categoryId: 'movie' };
  const movie: Movie = {
    activityId: movieActivity.id,
    tmdbId: 329865,
    title: 'Arrival',
    releaseDate: '2016-11-10',
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    overview: 'A linguist works with the military to communicate with alien lifeforms.',
    runtimeMinutes: 116,
    genres: ['Drama', 'Science Fiction'],
  };

  beforeEach(() => {
    useSchedule.setState({
      seeded: true,
      activities: [movieActivity],
      meals: [],
      workouts: [],
      workSessions: [],
      movies: [movie],
    });
  });

  it('updates and replaces movie details with its event', () => {
    useSchedule.getState().saveEvent({
      id: movieActivity.id,
      detailKind: 'movie',
      activity: { ...movieActivity, title: 'Dune', categoryId: 'movie' },
      movie: { ...movie, tmdbId: 438631, title: 'Dune', runtimeMinutes: 155 },
    });
    expect(useSchedule.getState().movies).toEqual([
      expect.objectContaining({ activityId: movieActivity.id, tmdbId: 438631, title: 'Dune' }),
    ]);
  });

  it('copies movie metadata when duplicating an event', () => {
    useSchedule.getState().duplicateActivity(movieActivity.id);
    const state = useSchedule.getState();
    expect(state.activities).toHaveLength(2);
    expect(state.movies).toHaveLength(2);
    expect(state.movies[1]).toMatchObject({ activityId: state.activities[1].id, tmdbId: movie.tmdbId });
    expect(state.movies[1].genres).not.toBe(movie.genres);
  });

  it('deletes movie metadata with its event', () => {
    useSchedule.getState().deleteActivity(movieActivity.id);
    expect(useSchedule.getState().movies).toHaveLength(0);
  });
});

describe('schedule persistence migrations', () => {
  it('adds newly shipped categories to an existing saved schedule', async () => {
    await mockAsyncStorage.setItem(
      STORAGE_KEYS.schedule,
      JSON.stringify({
        state: {
          seeded: true,
          activities: [],
          meals: [],
          workouts: [],
          workSessions: [],
          categories: DEFAULT_CATEGORIES.filter((category) => category.id !== 'movie'),
        },
        version: 0,
      }),
    );

    await useSchedule.persist.rehydrate();

    expect(useSchedule.getState().categories.some((category) => category.id === 'movie')).toBe(true);
    expect(useSchedule.getState().movies).toEqual([]);
  });
});
