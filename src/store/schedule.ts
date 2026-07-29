import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { buildSeedData } from '@/constants/seed';
import { createPersistStorage, STORAGE_KEYS } from '@/services/storage';
import type {
  Activity,
  ActivityCategory,
  ActivityStatus,
  Meal,
  Movie,
  Workout,
  WorkSession,
} from '@/types/models';
import { isDateKey } from '@/utils/date';

let idCounter = 0;
export function newId(prefix = 'a'): string {
  return `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
}

export interface ActivityDraft {
  date: string;
  title: string;
  categoryId: string;
  startMinutes: number;
  durationMinutes: number;
  notes?: string;
  travelPlanId?: string;
  travelItemId?: string;
}

export interface EventSavePayload {
  id?: string;
  activity: ActivityDraft & {
    status: ActivityStatus;
    photo?: string | number;
    photoProcessingVersion?: number;
    summary?: string;
    plantId?: string;
    careKind?: Activity['careKind'];
  };
  detailKind: ActivityCategory['detailKind'];
  meal?: Meal;
  workout?: Workout;
  workSession?: WorkSession;
  movie?: Movie;
}

export interface ImportedEventDraft {
  title: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  notes?: string;
  categoryId: string;
}

interface ScheduleState {
  seeded: boolean;
  activities: Activity[];
  meals: Meal[];
  workouts: Workout[];
  workSessions: WorkSession[];
  movies: Movie[];
  categories: ActivityCategory[];

  seedIfNeeded: () => void;
  addActivity: (draft: ActivityDraft) => Activity;
  replaceTravelActivities: (travelPlanId: string, drafts: ActivityDraft[]) => Activity[];
  importEvents: (drafts: ImportedEventDraft[]) => Activity[];
  saveEvent: (payload: EventSavePayload) => Activity;
  updateActivity: (id: string, patch: Partial<Omit<Activity, 'id' | 'createdAt'>>) => void;
  deleteActivity: (id: string) => void;
  setStatus: (id: string, status: ActivityStatus) => void;
  duplicateActivity: (id: string) => void;
  moveActivityToDate: (id: string, date: string) => void;
  upsertMeal: (meal: Meal) => void;
  setProcessedMealPhoto: (activityId: string, photo: string, originalPhoto: string, version: number) => void;
  upsertWorkout: (workout: Workout) => void;
  upsertWorkSession: (session: WorkSession) => void;
  addCategory: (category: ActivityCategory) => void;
  resetAll: () => void;
}

export const useSchedule = create<ScheduleState>()(
  persist(
    (set, get) => ({
      seeded: false,
      activities: [],
      meals: [],
      workouts: [],
      workSessions: [],
      movies: [],
      categories: DEFAULT_CATEGORIES,

      seedIfNeeded: () => {
        if (get().seeded) return;
        const seed = buildSeedData();
        set({
          seeded: true,
          activities: seed.activities,
          meals: seed.meals,
          workouts: seed.workouts,
          workSessions: seed.workSessions,
          movies: [],
        });
      },

      addActivity: (draft) => {
        const now = new Date().toISOString();
        const activity: Activity = {
          id: newId(),
          status: 'upcoming',
          createdAt: now,
          updatedAt: now,
          ...draft,
        };
        set((s) => ({ activities: [...s.activities, activity] }));
        return activity;
      },

      replaceTravelActivities: (travelPlanId, drafts) => {
        const now = new Date().toISOString();
        const activities = drafts.map((draft) => ({
          id: newId('trip-event'),
          status: 'upcoming' as const,
          createdAt: now,
          updatedAt: now,
          ...draft,
          travelPlanId,
        }));
        set((state) => ({
          activities: [
            ...state.activities.filter((activity) => activity.travelPlanId !== travelPlanId),
            ...activities,
          ],
        }));
        return activities;
      },

      importEvents: (drafts) => {
        if (drafts.length === 0) throw new Error('Choose at least one event to import.');
        const categories = get().categories;
        const normalized = drafts.map((draft) => {
          const title = draft.title.trim();
          const category = categories.find((item) => item.id === draft.categoryId);
          if (!title) throw new Error('Every imported event needs a title.');
          if (!isDateKey(draft.date)) throw new Error('Every imported event needs a valid date.');
          if (
            !Number.isInteger(draft.startMinutes) ||
            draft.startMinutes < 0 ||
            draft.startMinutes > 1439
          ) {
            throw new Error('Every imported event needs a valid time.');
          }
          if (
            !Number.isFinite(draft.durationMinutes) ||
            draft.durationMinutes < 5
          ) {
            throw new Error('Every imported event needs a duration of at least 5 minutes.');
          }
          if (!category) throw new Error('Every imported event needs a valid category.');
          if (category.detailKind === 'movie' || category.detailKind === 'plant') {
            throw new Error(`${category.name} events must be created from their dedicated editor.`);
          }
          return {
            ...draft,
            title,
            durationMinutes: Math.round(draft.durationMinutes),
            notes: draft.notes?.trim() || undefined,
            category,
          };
        });

        const now = new Date().toISOString();
        const activities = normalized.map(({ category: _category, ...draft }) => ({
          id: newId('imported-event'),
          status: 'upcoming' as const,
          createdAt: now,
          updatedAt: now,
          ...draft,
        }));

        set((state) => {
          const meals = [...state.meals];
          const workouts = [...state.workouts];
          const workSessions = [...state.workSessions];
          activities.forEach((activity, index) => {
            const category = normalized[index].category;
            if (category.detailKind === 'food') {
              meals.push({
                activityId: activity.id,
                mealType: 'lunch',
                name: activity.title,
                items: [],
              });
            } else if (category.detailKind === 'gym') {
              workouts.push({
                activityId: activity.id,
                type: 'custom',
                name: activity.title,
                exercises: [],
              });
            } else if (category.detailKind === 'work') {
              workSessions.push({
                activityId: activity.id,
                tasks: [],
                focusMinutes: 0,
              });
            }
          });
          return {
            activities: [...state.activities, ...activities],
            meals,
            workouts,
            workSessions,
          };
        });
        return activities;
      },

      saveEvent: (payload) => {
        const now = new Date().toISOString();
        const existing = payload.id
          ? get().activities.find((activity) => activity.id === payload.id)
          : undefined;
        const id = existing?.id ?? newId();
        const activity: Activity = {
          id,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          ...payload.activity,
        };

        set((state) => ({
          activities: existing
            ? state.activities.map((item) => (item.id === id ? activity : item))
            : [...state.activities, activity],
          meals:
            payload.detailKind === 'food' && payload.meal
              ? [...state.meals.filter((item) => item.activityId !== id), { ...payload.meal, activityId: id }]
              : state.meals.filter((item) => item.activityId !== id),
          workouts:
            payload.detailKind === 'gym' && payload.workout
              ? [
                  ...state.workouts.filter((item) => item.activityId !== id),
                  { ...payload.workout, activityId: id },
                ]
              : state.workouts.filter((item) => item.activityId !== id),
          workSessions:
            payload.detailKind === 'work' && payload.workSession
              ? [
                  ...state.workSessions.filter((item) => item.activityId !== id),
                  { ...payload.workSession, activityId: id },
                ]
              : state.workSessions.filter((item) => item.activityId !== id),
          movies:
            payload.detailKind === 'movie' && payload.movie
              ? [...state.movies.filter((item) => item.activityId !== id), { ...payload.movie, activityId: id }]
              : state.movies.filter((item) => item.activityId !== id),
        }));

        return activity;
      },

      updateActivity: (id, patch) =>
        set((s) => ({
          activities: s.activities.map((a) =>
            a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
          ),
        })),

      deleteActivity: (id) =>
        set((s) => ({
          activities: s.activities.filter((a) => a.id !== id),
          meals: s.meals.filter((m) => m.activityId !== id),
          workouts: s.workouts.filter((w) => w.activityId !== id),
          workSessions: s.workSessions.filter((w) => w.activityId !== id),
          movies: s.movies.filter((movie) => movie.activityId !== id),
        })),

      setStatus: (id, status) => get().updateActivity(id, { status }),

      duplicateActivity: (id) => {
        const src = get().activities.find((a) => a.id === id);
        if (!src) return;
        const now = new Date().toISOString();
        const duplicateId = newId();
        const movie = get().movies.find((item) => item.activityId === id);
        set((s) => ({
          activities: [
            ...s.activities,
            { ...src, id: duplicateId, status: 'upcoming', createdAt: now, updatedAt: now },
          ],
          movies: movie ? [...s.movies, { ...movie, activityId: duplicateId, genres: [...movie.genres] }] : s.movies,
        }));
      },

      moveActivityToDate: (id, date) => get().updateActivity(id, { date, status: 'upcoming' }),

      upsertMeal: (meal) =>
        set((s) => ({
          meals: [...s.meals.filter((m) => m.activityId !== meal.activityId), meal],
        })),

      setProcessedMealPhoto: (activityId, photo, originalPhoto, version) =>
        set((state) => ({
          activities: state.activities.map((activity) =>
            activity.id === activityId
              ? { ...activity, photo, photoProcessingVersion: version, updatedAt: new Date().toISOString() }
              : activity,
          ),
          meals: state.meals.map((meal) =>
            meal.activityId === activityId
              ? {
                  ...meal,
                  photo,
                  originalPhoto: meal.originalPhoto ?? originalPhoto,
                  photoProcessingVersion: version,
                }
              : meal,
          ),
        })),

      upsertWorkout: (workout) =>
        set((s) => ({
          workouts: [...s.workouts.filter((w) => w.activityId !== workout.activityId), workout],
        })),

      upsertWorkSession: (session) =>
        set((s) => ({
          workSessions: [
            ...s.workSessions.filter((w) => w.activityId !== session.activityId),
            session,
          ],
        })),

      addCategory: (category) => set((s) => ({ categories: [...s.categories, category] })),

      resetAll: () =>
        set({
          seeded: false,
          activities: [],
          meals: [],
          workouts: [],
          workSessions: [],
          movies: [],
          categories: DEFAULT_CATEGORIES,
        }),
    }),
    {
      name: STORAGE_KEYS.schedule,
      storage: createPersistStorage(),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ScheduleState>;
        const savedCategories = persisted.categories ?? [];
        const defaultIds = new Set(DEFAULT_CATEGORIES.map((category) => category.id));
        return {
          ...currentState,
          ...persisted,
          movies: persisted.movies ?? [],
          categories: [
            ...DEFAULT_CATEGORIES,
            ...savedCategories.filter((category) => !defaultIds.has(category.id)),
          ],
        };
      },
    },
  ),
);

// ── Selectors ───────────────────────────────────────────────────────────

export function selectActivitiesForDate(state: ScheduleState, date: string): Activity[] {
  return state.activities
    .filter((a) => a.date === date)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

export function selectActivitiesByDate(state: ScheduleState): Record<string, Activity[]> {
  const map: Record<string, Activity[]> = {};
  for (const a of state.activities) {
    (map[a.date] ??= []).push(a);
  }
  return map;
}
