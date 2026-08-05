import { isRoundTripSegmentGroup } from './flight-confirmation-itinerary';
import type { ParsedFlightConfirmation } from './flight-confirmation-parser';
import { flightConfirmationSchedule } from './flight-confirmation-schedule';

export interface NewTripFlightDraft {
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
}

function dateDistance(left?: string, right?: string): number {
  if (!left || !right) return -1;
  return Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`);
}

/** Convert parsed flight legs into editable trip-level fields without saving a plan. */
export function newTripDraftFromFlightConfirmation(
  imported: ParsedFlightConfirmation,
): NewTripFlightDraft {
  const segments = imported.segments.filter(
    (segment) =>
      segment.flight.departureAirport ||
      segment.flight.arrivalAirport ||
      segment.date,
  );
  const first = segments[0];
  const last = segments[segments.length - 1];
  const origin = first?.flight.departureAirport || undefined;
  let destination =
    last?.flight.arrivalAirport || first?.flight.arrivalAirport || undefined;

  if (origin && destination === origin && segments.length > 1) {
    let turnaroundIndex = Math.floor((segments.length - 1) / 2);
    let largestGap = -1;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const gap = dateDistance(segments[index].date, segments[index + 1].date);
      if (gap > largestGap) {
        largestGap = gap;
        turnaroundIndex = index;
      }
    }
    destination =
      segments[turnaroundIndex]?.flight.arrivalAirport || destination;
  }

  const schedule = flightConfirmationSchedule(imported);
  // Round-trip editor schedule is outbound-only; trip end is the return date.
  const endDate = isRoundTripSegmentGroup(segments)
    ? (last?.arrivalDate ?? last?.date ?? schedule.arrivalDate ?? schedule.departureDate)
    : (schedule.arrivalDate ?? schedule.departureDate);

  return {
    ...(destination ? { destination } : {}),
    ...(origin ? { origin } : {}),
    ...(schedule.departureDate
      ? {
          startDate: schedule.departureDate,
          ...(endDate ? { endDate } : {}),
        }
      : {}),
  };
}
