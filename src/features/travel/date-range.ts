import type { TravelItineraryItem } from './types';
import { isDateKey } from '@/utils/date';

export interface TravelDateRangeValidation {
  error?: string;
  conflicts: TravelItineraryItem[];
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
