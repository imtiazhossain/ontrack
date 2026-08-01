import {
  expandedTripRangeForRental,
  mergeImportedRental,
} from '@/features/travel/rental-confirmation-itinerary';
import type { ParsedRentalConfirmation } from '@/features/travel/rental-confirmation-parser';
import { applyRentalExpenseFromImport } from '@/features/travel/rental-expense-from-import';
import type { TravelPlan } from '@/features/travel/types';

/** Merge a parsed rental into the itinerary and upsert its Transit expense when priced. */
export function applyImportedRentalToPlan(options: {
  plan: TravelPlan;
  imported: ParsedRentalConfirmation & { confirmationUris?: string[] };
  createId: () => string;
  targetItemId?: string;
}): TravelPlan {
  const { plan, imported, createId, targetItemId } = options;
  const range = expandedTripRangeForRental(plan, imported);
  const withItinerary: TravelPlan = {
    ...plan,
    ...range,
    itinerary: mergeImportedRental({
      itinerary: plan.itinerary,
      parsed: imported,
      tripRange: plan,
      createId,
      targetItemId,
      confirmationUris: imported.confirmationUris,
    }),
    updatedAt: new Date().toISOString(),
  };
  return applyRentalExpenseFromImport(withItinerary, {
    ...imported,
    rental: {
      company: imported.rental.company || undefined,
      confirmationCode: imported.rental.confirmationCode || undefined,
    },
  });
}
