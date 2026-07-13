import type {
  Activity,
  ActivityStatus,
  Meal,
  Workout,
  WorkSession,
} from '@/types/models';
import { addDays, todayKey } from '@/utils/date';

export const SEED_PHOTOS = {
  breakfast: require('../../assets/images/seed/meal-breakfast.jpg'),
  lunch: require('../../assets/images/seed/meal-lunch.jpg'),
  dinner: require('../../assets/images/seed/meal-dinner.jpg'),
} as const;

let seedCounter = 0;
function sid(): string {
  return `seed-${++seedCounter}`;
}

interface DayPlanItem {
  title: string;
  categoryId: string;
  start: number; // minutes from midnight
  duration: number;
  summary?: string;
  photo?: number;
  meal?: Omit<Meal, 'activityId'>;
  workout?: Omit<Workout, 'activityId'>;
  work?: Omit<WorkSession, 'activityId'>;
}

const BREAKFAST_MEAL: Omit<Meal, 'activityId'> = {
  mealType: 'breakfast',
  name: 'Greek yogurt bowl',
  photo: SEED_PHOTOS.breakfast,
  items: [
    { id: 'f1', name: 'Greek yogurt', portion: '1 cup', calories: 150, proteinG: 20, carbsG: 8, fatG: 4 },
    { id: 'f2', name: 'Blueberries', portion: '1/2 cup', calories: 42, proteinG: 1, carbsG: 11, fatG: 0 },
    { id: 'f3', name: 'Granola', portion: '1/4 cup', calories: 140, proteinG: 3, carbsG: 18, fatG: 6 },
    { id: 'f4', name: 'Honey', portion: '1 tbsp', calories: 64, proteinG: 0, carbsG: 17, fatG: 0 },
  ],
  hungerBefore: 4,
  fullnessAfter: 4,
};

const LUNCH_MEAL: Omit<Meal, 'activityId'> = {
  mealType: 'lunch',
  name: 'Chicken quinoa salad',
  photo: SEED_PHOTOS.lunch,
  items: [
    { id: 'f5', name: 'Grilled chicken', portion: '150 g', calories: 248, proteinG: 46, carbsG: 0, fatG: 5 },
    { id: 'f6', name: 'Quinoa', portion: '3/4 cup', calories: 166, proteinG: 6, carbsG: 29, fatG: 3 },
    { id: 'f7', name: 'Mixed greens', portion: '2 cups', calories: 16, proteinG: 2, carbsG: 3, fatG: 0 },
    { id: 'f8', name: 'Olive oil dressing', portion: '1 tbsp', calories: 119, proteinG: 0, carbsG: 0, fatG: 14 },
  ],
  hungerBefore: 3,
  fullnessAfter: 4,
};

const DINNER_MEAL: Omit<Meal, 'activityId'> = {
  mealType: 'dinner',
  name: 'Salmon with roast vegetables',
  photo: SEED_PHOTOS.dinner,
  items: [
    { id: 'f9', name: 'Baked salmon', portion: '180 g', calories: 367, proteinG: 39, carbsG: 0, fatG: 22 },
    { id: 'f10', name: 'Roast vegetables', portion: '1.5 cups', calories: 120, proteinG: 3, carbsG: 18, fatG: 5 },
    { id: 'f11', name: 'Brown rice', portion: '3/4 cup', calories: 165, proteinG: 4, carbsG: 34, fatG: 1 },
  ],
  hungerBefore: 4,
  fullnessAfter: 5,
};

const STRENGTH_WORKOUT: Omit<Workout, 'activityId'> = {
  type: 'strength',
  name: 'Upper body strength',
  exercises: [
    {
      id: 'e1', name: 'Bench press', icon: 'figure.strengthtraining.traditional', restSeconds: 120,
      previousBest: '62.5 kg × 8',
      sets: [
        { id: 's1', reps: 10, weightKg: 50, done: false },
        { id: 's2', reps: 8, weightKg: 60, done: false },
        { id: 's3', reps: 8, weightKg: 60, done: false },
      ],
    },
    {
      id: 'e2', name: 'Seated row', icon: 'figure.rower', restSeconds: 90,
      previousBest: '55 kg × 10',
      sets: [
        { id: 's4', reps: 12, weightKg: 45, done: false },
        { id: 's5', reps: 10, weightKg: 55, done: false },
        { id: 's6', reps: 10, weightKg: 55, done: false },
      ],
    },
    {
      id: 'e3', name: 'Overhead press', icon: 'figure.arms.open', restSeconds: 90,
      previousBest: '32.5 kg × 8',
      sets: [
        { id: 's7', reps: 10, weightKg: 25, done: false },
        { id: 's8', reps: 8, weightKg: 30, done: false },
        { id: 's9', reps: 8, weightKg: 30, done: false },
      ],
    },
    {
      id: 'e4', name: 'Lat pulldown', icon: 'figure.play', restSeconds: 90,
      previousBest: '50 kg × 10',
      sets: [
        { id: 's10', reps: 12, weightKg: 40, done: false },
        { id: 's11', reps: 10, weightKg: 50, done: false },
      ],
    },
  ],
};

const WORK_SESSION: Omit<WorkSession, 'activityId'> = {
  tasks: [
    { id: 't1', title: 'Review Q3 launch plan', done: true, priority: 'high', estimateMinutes: 45 },
    { id: 't2', title: 'Draft design feedback', done: false, priority: 'medium', estimateMinutes: 30 },
    { id: 't3', title: 'Clear inbox to zero', done: false, priority: 'low', estimateMinutes: 20 },
    { id: 't4', title: 'Prep tomorrow’s standup notes', done: false, priority: 'medium', estimateMinutes: 15 },
  ],
  focusMinutes: 0,
};

function weekdayPlan(): DayPlanItem[] {
  return [
    { title: 'Wake up', categoryId: 'habit', start: 6 * 60 + 30, duration: 15 },
    { title: 'Morning walk', categoryId: 'personal', start: 6 * 60 + 50, duration: 25, summary: '2.1 km' },
    { title: 'Breakfast', categoryId: 'food', start: 7 * 60 + 30, duration: 30, summary: '396 kcal · high protein', photo: SEED_PHOTOS.breakfast, meal: BREAKFAST_MEAL },
    { title: 'Deep work', categoryId: 'work', start: 9 * 60, duration: 150, summary: '4 tasks', work: WORK_SESSION },
    { title: 'Team meeting', categoryId: 'appointment', start: 11 * 60 + 30, duration: 45 },
    { title: 'Lunch', categoryId: 'food', start: 12 * 60 + 30, duration: 45, summary: '549 kcal · balanced', photo: SEED_PHOTOS.lunch, meal: LUNCH_MEAL },
    { title: 'Strength workout', categoryId: 'gym', start: 17 * 60 + 30, duration: 60, summary: 'Upper body · 4 exercises', workout: STRENGTH_WORKOUT },
    { title: 'Dinner', categoryId: 'food', start: 19 * 60, duration: 45, summary: '652 kcal · balanced', photo: SEED_PHOTOS.dinner, meal: DINNER_MEAL },
    { title: 'Reading', categoryId: 'learning', start: 21 * 60, duration: 30, summary: 'Deep Work · ch. 4' },
    { title: 'Prepare for tomorrow', categoryId: 'habit', start: 21 * 60 + 45, duration: 15 },
    { title: 'Sleep', categoryId: 'sleep', start: 22 * 60 + 30, duration: 480 },
  ];
}

function weekendPlan(): DayPlanItem[] {
  return [
    { title: 'Wake up', categoryId: 'habit', start: 8 * 60, duration: 15 },
    { title: 'Breakfast', categoryId: 'food', start: 8 * 60 + 45, duration: 40, summary: '396 kcal', photo: SEED_PHOTOS.breakfast, meal: BREAKFAST_MEAL },
    { title: 'Long walk', categoryId: 'personal', start: 10 * 60, duration: 60, summary: '5.4 km' },
    { title: 'Lunch', categoryId: 'food', start: 12 * 60 + 30, duration: 60, summary: '549 kcal', photo: SEED_PHOTOS.lunch, meal: LUNCH_MEAL },
    { title: 'Meditation', categoryId: 'mindfulness', start: 15 * 60, duration: 20 },
    { title: 'Dinner', categoryId: 'food', start: 19 * 60, duration: 60, summary: '652 kcal', photo: SEED_PHOTOS.dinner, meal: DINNER_MEAL },
    { title: 'Reading', categoryId: 'learning', start: 21 * 60, duration: 45 },
    { title: 'Sleep', categoryId: 'sleep', start: 23 * 60, duration: 480 },
  ];
}

export interface SeedData {
  activities: Activity[];
  meals: Meal[];
  workouts: Workout[];
  workSessions: WorkSession[];
}

/**
 * Builds one week of history plus today and tomorrow, relative to the
 * current date, so the app always feels alive on first launch.
 */
export function buildSeedData(): SeedData {
  const activities: Activity[] = [];
  const meals: Meal[] = [];
  const workouts: Workout[] = [];
  const workSessions: WorkSession[] = [];
  const today = todayKey();
  const now = new Date().toISOString();

  // Deterministic-ish "skipped" pattern so history looks human.
  const skipPattern: Record<number, string[]> = {
    [-6]: ['Reading'],
    [-5]: [],
    [-4]: ['Strength workout', 'Meditation'],
    [-3]: [],
    [-2]: ['Morning walk'],
    [-1]: ['Prepare for tomorrow'],
  };

  for (let offset = -6; offset <= 1; offset++) {
    const date = addDays(today, offset);
    const weekday = new Date(date + 'T12:00:00').getDay();
    const plan = weekday === 0 || weekday === 6 ? weekendPlan() : weekdayPlan();
    const skips = skipPattern[offset] ?? [];

    for (const item of plan) {
      let status: ActivityStatus = 'upcoming';
      if (offset < 0) {
        status = skips.includes(item.title) ? 'skipped' : 'completed';
      } else if (offset === 0) {
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        if (item.start + item.duration < nowMin) {
          status = skips.includes(item.title) ? 'skipped' : 'completed';
        }
      }

      const id = sid();
      activities.push({
        id,
        date,
        title: item.title,
        categoryId: item.categoryId,
        startMinutes: item.start,
        durationMinutes: item.duration,
        status,
        summary: item.summary,
        photo: item.photo,
        createdAt: now,
        updatedAt: now,
      });
      if (item.meal) meals.push({ ...item.meal, activityId: id });
      if (item.workout) {
        workouts.push({
          ...item.workout,
          activityId: id,
          exercises: item.workout.exercises.map((e) => ({
            ...e,
            id: `${id}-${e.id}`,
            sets: e.sets.map((s) => ({ ...s, id: `${id}-${s.id}`, done: status === 'completed' })),
          })),
        });
      }
      if (item.work) {
        workSessions.push({
          ...item.work,
          activityId: id,
          tasks: item.work.tasks.map((t) => ({ ...t, id: `${id}-${t.id}` })),
          focusMinutes: status === 'completed' ? 96 : 0,
        });
      }
    }
  }

  return { activities, meals, workouts, workSessions };
}
