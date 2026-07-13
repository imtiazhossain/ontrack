import type { RecurrenceRule } from '@/types/models';
import { fromDateKey } from './date';

/** Whether a recurrence rule produces an occurrence on the given date. */
export function occursOn(rule: RecurrenceRule | undefined, dateKey: string): boolean {
  if (!rule || rule.frequency === 'none') return false;
  const weekday = fromDateKey(dateKey).getDay();
  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return weekday >= 1 && weekday <= 5;
    case 'weekly':
      return weekday === (rule.weekday ?? 1);
  }
}

export function describeRecurrence(rule: RecurrenceRule | undefined): string {
  if (!rule || rule.frequency === 'none') return 'Does not repeat';
  switch (rule.frequency) {
    case 'daily':
      return 'Every day';
    case 'weekdays':
      return 'Weekdays';
    case 'weekly': {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Weekly on ${days[rule.weekday ?? 1]}`;
    }
  }
}
