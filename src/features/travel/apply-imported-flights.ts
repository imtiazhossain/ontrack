import {
  expandedTripRangeForFlights,
  mergeImportedFlights,
} from '@/features/travel/flight-confirmation-itinerary';
import type { ParsedFlightConfirmation } from '@/features/travel/flight-confirmation-parser';
import { applyFlightExpenseFromImport } from '@/features/travel/flight-expense-from-import';
import type { TravelPlan } from '@/features/travel/types';

/** Merge parsed flight segments into the itinerary and upsert a Flight expense when priced. */
export function applyImportedFlightsToPlan(options: {
  plan: TravelPlan;
  imported: ParsedFlightConfirmation & { confirmationUris?: string[] };
  createId: () => string;
  targetItemId?: string;
}): TravelPlan {
  const { plan, imported, createId, targetItemId } = options;
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
      confirmationUris: imported.confirmationUris,
    }),
    updatedAt: new Date().toISOString(),
  };
  return applyFlightExpenseFromImport(withItinerary, imported);
}
