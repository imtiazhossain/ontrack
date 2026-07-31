import type { VehicleMaintenanceSchedule } from '@/features/vehicles/types';

/** Approximate next due miles from last service + interval. */
export function nextDueMiles(
  schedule: Pick<VehicleMaintenanceSchedule, 'intervalMiles' | 'lastDoneMiles'>,
  currentMiles?: number,
): number | undefined {
  if (!schedule.intervalMiles) return undefined;
  const base = schedule.lastDoneMiles ?? currentMiles;
  if (base === undefined) return schedule.intervalMiles;
  return base + schedule.intervalMiles;
}

/** Next due calendar date from lastDoneAt + intervalMonths (local YYYY-MM-DD). */
export function nextDueDate(
  schedule: Pick<VehicleMaintenanceSchedule, 'intervalMonths' | 'lastDoneAt'>,
): string | undefined {
  if (!schedule.intervalMonths || !schedule.lastDoneAt) return undefined;
  const [year, month, day] = schedule.lastDoneAt.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  const date = new Date(year, month - 1, day);
  date.setMonth(date.getMonth() + schedule.intervalMonths);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isMaintenanceDue(
  schedule: VehicleMaintenanceSchedule,
  currentMiles: number | undefined,
  todayKey: string,
): boolean {
  const dueMiles = nextDueMiles(schedule, currentMiles);
  if (dueMiles !== undefined && currentMiles !== undefined && currentMiles >= dueMiles) {
    return true;
  }
  const dueDate = nextDueDate(schedule);
  return Boolean(dueDate && dueDate <= todayKey);
}
