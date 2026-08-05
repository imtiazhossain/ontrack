import { applyImportedFlightsToPlan } from './apply-imported-flights';
import { CHASE_CONNECTING_CONFIRMATION } from './fixtures/chase-connecting-confirmation';
import { parseFlightConfirmation } from './flight-confirmation-parser';
import {
    isConnectingFlightDetails,
    reconstructConnectingLegs,
} from './flight-journey-model';
import type { TravelItineraryItem, TravelPlan } from './types';

function missingJourneyLegs(item: TravelItineraryItem): boolean {
  if (item.kind !== 'flight' || !item.flight) return false;
  if (item.flight.legs && item.flight.legs.length > 1) return false;
  return isConnectingFlightDetails(item.flight);
}

function isDevChaseDemoFlight(item: TravelItineraryItem): boolean {
  if (!__DEV__ || item.kind !== 'flight' || !item.flight) return false;
  const flight = item.flight;
  return (
    flight.departureAirport?.toUpperCase() === 'GUA' &&
    flight.arrivalAirport?.toUpperCase() === 'LGA' &&
    flight.connectionAirport?.toUpperCase() === 'IAH' &&
    flight.layoverMinutesAfter === 99
  );
}

const CHASE_TOTAL_MINUTES = 9 * 60 + 59;

function needsDevChaseRepair(item: TravelItineraryItem): boolean {
  if (!isDevChaseDemoFlight(item)) return false;
  const legs = item.flight?.legs;
  if (!legs?.length) return true;
  // Repair totals that aren't the printed 9h 59m door-to-door span.
  if (item.durationMinutes !== CHASE_TOTAL_MINUTES) return true;
  return legs.some((leg) => !leg.aircraft);
}

/**
 * Attach per-leg journey data onto legacy collapsed connecting flights so the
 * multi-leg card can render. Uses stored connection clocks when present;
 * in __DEV__, also repairs the known Chase demo import.
 */
export function upgradeLegacyConnectingFlights(
  plan: TravelPlan,
  createId: () => string,
): TravelPlan | null {
  const chaseTarget = plan.itinerary.find(needsDevChaseRepair);
  if (chaseTarget?.flight) {
    const imported = parseFlightConfirmation(CHASE_CONNECTING_CONFIRMATION, {
      startDate: plan.startDate,
      endDate: plan.endDate,
    });
    // Re-import only when the fixture actually improves the stored item, so an
    // unparseable field can never bounce the plan between repairs.
    const repairs =
      !chaseTarget.flight.legs?.length ||
      chaseTarget.durationMinutes !== CHASE_TOTAL_MINUTES ||
      imported.segments.every((segment) => segment.aircraft);
    if (imported.segments.length >= 2 && repairs) {
      return applyImportedFlightsToPlan({
        plan,
        imported: {
          ...imported,
          confirmationUris: chaseTarget.flight.confirmationUris,
        },
        createId,
        targetItemId: chaseTarget.id,
      });
    }
  }

  const target = plan.itinerary.find(missingJourneyLegs);
  if (!target?.flight) return null;

  const legs = reconstructConnectingLegs({
    details: target.flight,
    date: target.date,
    startMinutes: target.startMinutes,
    durationMinutes: target.durationMinutes,
  });
  if (!legs) return null;

  return {
    ...plan,
    itinerary: plan.itinerary.map((item) =>
      item.id === target.id
        ? {
            ...item,
            flight: {
              ...item.flight,
              legs,
            },
          }
        : item,
    ),
    updatedAt: new Date().toISOString(),
  };
}
