import type { Activity } from '@/types/models';

/**
 * Daily completion: completed = 1, partial = 0.5, skipped/upcoming = 0.
 * Skipped activities are excluded from the denominator so consciously
 * skipping something does not read as failure.
 */
export function dayCompletion(activities: Activity[]): number {
  const counted = activities.filter((a) => a.status !== 'skipped');
  if (counted.length === 0) return 0;
  const score = counted.reduce(
    (sum, a) => sum + (a.status === 'completed' ? 1 : a.status === 'partial' ? 0.5 : 0),
    0,
  );
  return score / counted.length;
}

export type DayIndicator = 'empty' | 'none' | 'partial' | 'full';

/** Indicator shown on calendar cells. */
export function dayIndicator(activities: Activity[]): DayIndicator {
  if (activities.length === 0) return 'empty';
  const c = dayCompletion(activities);
  if (c >= 0.999) return 'full';
  if (c > 0) return 'partial';
  return 'none';
}

/** Current streak of consecutive days (ending at endKey) with completion >= threshold. */
export function streak(
  activitiesByDate: Record<string, Activity[]>,
  endKey: string,
  addDaysFn: (key: string, days: number) => string,
  threshold = 0.5,
): number {
  let count = 0;
  let key = endKey;
  while (activitiesByDate[key] && dayCompletion(activitiesByDate[key]) >= threshold) {
    count++;
    key = addDaysFn(key, -1);
  }
  return count;
}
