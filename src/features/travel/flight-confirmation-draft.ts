import {
    connectionArrivalMinutesForSegment,
    isConnectingSegmentGroup,
} from './flight-confirmation-itinerary';
import type { ParsedFlightConfirmation } from './flight-confirmation-parser';
import { resolveConnectingHub } from './flight-connection-hub';
import {
    formatLayoverDuration,
    type FlightDetailsDraft,
} from './flight-details';
import { flightLegsFromSegments } from './flight-journey-model';

function connectionTimesFromImport(
  imported: ParsedFlightConfirmation,
): Pick<
  FlightDetailsDraft,
  'connectionArrivalMinutes' | 'connectionDepartureMinutes'
> {
  if (!isConnectingSegmentGroup(imported.segments)) return {};
  const first = imported.segments[0]!;
  const second = imported.segments[1]!;
  const connectionArrivalMinutes = connectionArrivalMinutesForSegment(first);

  return {
    ...(connectionArrivalMinutes !== undefined
      ? { connectionArrivalMinutes }
      : {}),
    ...(second.startMinutes !== undefined
      ? { connectionDepartureMinutes: second.startMinutes }
      : {}),
  };
}

function mergeSegmentIntoDraft(
  current: FlightDetailsDraft,
  segment: ParsedFlightConfirmation['segments'][number],
  confirmationUris?: string[],
): FlightDetailsDraft {
  return {
    airline: segment.flight.airline || current.airline,
    flightNumber: segment.flight.flightNumber || current.flightNumber,
    confirmationCode:
      segment.flight.confirmationCode || current.confirmationCode,
    departureAirport:
      segment.flight.departureAirport || current.departureAirport,
    departureTerminal:
      segment.flight.departureTerminal || current.departureTerminal,
    departureGate: segment.flight.departureGate || current.departureGate,
    arrivalAirport: segment.flight.arrivalAirport || current.arrivalAirport,
    arrivalTerminal: segment.flight.arrivalTerminal || current.arrivalTerminal,
    arrivalGate: segment.flight.arrivalGate || current.arrivalGate,
    seat: segment.flight.seat || current.seat,
    ...(() => {
      const passengerName =
        segment.flight.passengerName || current.passengerName;
      const passengerCount =
        segment.flight.passengerCount || current.passengerCount;
      return {
        ...(passengerName ? { passengerName } : {}),
        ...(passengerCount ? { passengerCount } : {}),
      };
    })(),
    confirmationUris: confirmationUris?.length
      ? confirmationUris
      : current.confirmationUris,
  };
}

/** Merge a parsed itinerary into the single review draft shown before saving. */
export function mergeFlightConfirmationDraftDetails(
  current: FlightDetailsDraft,
  imported: ParsedFlightConfirmation & { confirmationUris?: string[] },
): FlightDetailsDraft {
  const firstSegment = imported.segments[0] ?? imported;
  // Round-trips / one-ways review as a single leg; submit expands both flights.
  // Clear leftover connection fields so a prior connecting import cannot stick.
  if (!isConnectingSegmentGroup(imported.segments)) {
    const merged = mergeSegmentIntoDraft(
      current,
      firstSegment,
      imported.confirmationUris,
    );
    return {
      ...merged,
      connectionAirport: '',
      layoverMinutesAfter: '',
      connectionArrivalMinutes: undefined,
      connectionDepartureMinutes: undefined,
      legs: undefined,
    };
  }

  const lastSegment = imported.segments.at(-1) ?? firstSegment;
  const connectionAirport =
    resolveConnectingHub(imported.segments) ||
    firstSegment.flight.connectionAirport ||
    current.connectionAirport;
  // Layover duration only belongs with a real hub — never keep "1h 39m" when
  // the connection collapsed onto the final destination (OCR noise).
  const layover =
    connectionAirport && firstSegment.layoverMinutesAfter !== undefined
      ? formatLayoverDuration(firstSegment.layoverMinutesAfter)
      : connectionAirport
        ? current.layoverMinutesAfter
        : '';
  const connectionTimes = connectionAirport
    ? connectionTimesFromImport(imported)
    : {};
  const legs = flightLegsFromSegments(imported.segments);

  return {
    ...mergeSegmentIntoDraft(current, firstSegment, imported.confirmationUris),
    arrivalAirport:
      lastSegment.flight.arrivalAirport || current.arrivalAirport,
    arrivalTerminal:
      lastSegment.flight.arrivalTerminal || current.arrivalTerminal,
    arrivalGate: lastSegment.flight.arrivalGate || current.arrivalGate,
    connectionAirport: connectionAirport || '',
    layoverMinutesAfter: layover || '',
    connectionArrivalMinutes: connectionAirport
      ? (connectionTimes.connectionArrivalMinutes ??
        current.connectionArrivalMinutes)
      : undefined,
    connectionDepartureMinutes: connectionAirport
      ? (connectionTimes.connectionDepartureMinutes ??
        current.connectionDepartureMinutes)
      : undefined,
    ...(legs?.length
      ? { legs }
      : current.legs?.length
        ? { legs: current.legs }
        : {}),
  };
}
