import type { ParsedFlightConfirmation } from './flight-confirmation-parser';
import {
  formatLayoverDuration,
  type FlightDetailsDraft,
} from './flight-details';

/** Merge a parsed itinerary into the single review draft shown before saving. */
export function mergeFlightConfirmationDraftDetails(
  current: FlightDetailsDraft,
  imported: ParsedFlightConfirmation & { confirmationUris?: string[] },
): FlightDetailsDraft {
  const firstSegment = imported.segments[0] ?? imported;
  const lastSegment = imported.segments.at(-1) ?? firstSegment;
  const layover =
    firstSegment.layoverMinutesAfter !== undefined
      ? formatLayoverDuration(firstSegment.layoverMinutesAfter)
      : current.layoverMinutesAfter;

  return {
    airline: firstSegment.flight.airline || current.airline,
    flightNumber: firstSegment.flight.flightNumber || current.flightNumber,
    confirmationCode:
      firstSegment.flight.confirmationCode || current.confirmationCode,
    departureAirport:
      firstSegment.flight.departureAirport || current.departureAirport,
    arrivalAirport:
      lastSegment.flight.arrivalAirport || current.arrivalAirport,
    seat: firstSegment.flight.seat || current.seat,
    ...(layover ? { layoverMinutesAfter: layover } : {}),
    confirmationUris: imported.confirmationUris?.length
      ? imported.confirmationUris
      : current.confirmationUris,
  };
}
