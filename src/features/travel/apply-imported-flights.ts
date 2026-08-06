import {
    expandedTripRangeForFlights,
    mergeImportedFlights,
} from '@/features/travel/flight-confirmation-itinerary';
import type { ParsedFlightConfirmation } from '@/features/travel/flight-confirmation-parser';
import { flightSegmentSchedule } from '@/features/travel/flight-confirmation-schedule';
import { applyFlightExpenseFromImport } from '@/features/travel/flight-expense-from-import';
import type { TravelPlan } from '@/features/travel/types';

/** Fill missing segment dates from the shared confirmation schedule path. */
function withResolvedSegmentDates(
  imported: ParsedFlightConfirmation,
): ParsedFlightConfirmation {
  const segments = imported.segments.map((segment) => {
    if (segment.date) return segment;
    const schedule = flightSegmentSchedule(segment, imported);
    if (!schedule.departureDate) return segment;
    return {
      ...segment,
      date: schedule.departureDate,
      ...(schedule.arrivalDate ? { arrivalDate: schedule.arrivalDate } : {}),
      ...(schedule.arrivalMinutes !== undefined
        ? { arrivalMinutes: schedule.arrivalMinutes }
        : {}),
      ...(schedule.departureMinutes !== undefined &&
      segment.startMinutes === undefined
        ? { startMinutes: schedule.departureMinutes }
        : {}),
    };
  });
  const firstDate = segments[0]?.date;
  return {
    ...imported,
    ...(firstDate && !imported.date ? { date: firstDate } : {}),
    segments,
  };
}

/** Merge parsed flight segments into the itinerary and upsert a Flight expense when priced. */
export function applyImportedFlightsToPlan(options: {
  plan: TravelPlan;
  imported: ParsedFlightConfirmation & { confirmationUris?: string[] };
  createId: () => string;
  targetItemId?: string;
}): TravelPlan {
  const { plan, createId, targetItemId } = options;
  const imported = withResolvedSegmentDates(options.imported);
  const confirmationUris = options.imported.confirmationUris;
  const range = expandedTripRangeForFlights(plan, imported.segments);
  const withItinerary: TravelPlan = {
    ...plan,
    ...range,
    itinerary: mergeImportedFlights({
      itinerary: plan.itinerary,
      segments: imported.segments,
      tripRange: plan,
      createId,
      targetItemId,
      confirmationUris,
      dateFallback:
        imported.date || imported.itineraryDates?.[0] || undefined,
    }),
    updatedAt: new Date().toISOString(),
  };
  return applyFlightExpenseFromImport(withItinerary, {
    ...imported,
    ...(confirmationUris?.length ? { confirmationUris } : {}),
  });
}
