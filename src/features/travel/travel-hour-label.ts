import { formatMinutes } from '@/utils/date';

/** Floors start minutes to the hour for timeline hour labels. */
export function hourBucketMinutes(startMinutes: number): number {
  return Math.floor(startMinutes / 60) * 60;
}

export function formatHourLabel(startMinutes: number): string {
  return formatMinutes(hourBucketMinutes(startMinutes));
}
