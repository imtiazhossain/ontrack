import type { TravelItineraryItem } from './types';
import { fromDateKey, isDateKey } from '@/utils/date';

export interface TravelDateRangeValidation {
  error?: string;
  conflicts: TravelItineraryItem[];
}

/** Inclusive trip length in calendar days (same start/end = 1). */
export function tripDayCount(startDate: string, endDate: string): number {
  const start = fromDateKey(startDate).getTime();
  const end = fromDateKey(endDate).getTime();
  return Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);
}

export function validateTravelDateRange(
  startDate: string,
  endDate: string,
  itinerary: TravelItineraryItem[] = [],
): TravelDateRangeValidation {
  if (!isDateKey(startDate) || !isDateKey(endDate)) {
    return { error: 'Choose valid travel dates.', conflicts: [] };
  }
  if (endDate < startDate) {
    return { error: 'The return date must be on or after departure.', conflicts: [] };
  }

  const conflicts = itinerary.filter(
    (item) => item.date < startDate || item.date > endDate,
  );
  if (conflicts.length > 0) {
    const names = conflicts.map((item) => `“${item.title}”`).join(', ');
    return {
      error: `Change or remove these itinerary items before shortening the trip: ${names}.`,
      conflicts,
    };
  }

  return { conflicts: [] };
}
