import { calculateFlightArrival } from './flight-arrival';
import type { ParsedFlightConfirmation } from './flight-confirmation-parser';
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
  if (imported.segments.length < 2) return {};
  const first = imported.segments[0]!;
  const second = imported.segments[1]!;

  let connectionArrivalMinutes = first.arrivalMinutes;
  if (
    connectionArrivalMinutes === undefined &&
    first.date &&
    first.startMinutes !== undefined &&
    first.durationMinutes !== undefined
  ) {
    connectionArrivalMinutes = calculateFlightArrival({
      date: first.date,
      startMinutes: first.startMinutes,
      durationMinutes: first.durationMinutes,
      departureAirport: first.flight.departureAirport,
      arrivalAirport: first.flight.arrivalAirport,
    }).startMinutes;
  }

  return {
    ...(connectionArrivalMinutes !== undefined
      ? { connectionArrivalMinutes }
      : {}),
    ...(second.startMinutes !== undefined
      ? { connectionDepartureMinutes: second.startMinutes }
      : {}),
  };
}

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
  const connectionAirport =
    imported.segments.length > 1 && firstSegment.flight.arrivalAirport
      ? firstSegment.flight.arrivalAirport
      : firstSegment.flight.connectionAirport || current.connectionAirport;
  const connectionTimes = connectionTimesFromImport(imported);
  const legs = flightLegsFromSegments(imported.segments);

  return {
    airline: firstSegment.flight.airline || current.airline,
    flightNumber: firstSegment.flight.flightNumber || current.flightNumber,
    confirmationCode:
      firstSegment.flight.confirmationCode || current.confirmationCode,
    departureAirport:
      firstSegment.flight.departureAirport || current.departureAirport,
    departureTerminal:
      firstSegment.flight.departureTerminal || current.departureTerminal,
    departureGate: firstSegment.flight.departureGate || current.departureGate,
    arrivalAirport:
      lastSegment.flight.arrivalAirport || current.arrivalAirport,
    arrivalTerminal:
      lastSegment.flight.arrivalTerminal || current.arrivalTerminal,
    arrivalGate: lastSegment.flight.arrivalGate || current.arrivalGate,
    seat: firstSegment.flight.seat || current.seat,
    ...(() => {
      const passengerName =
        firstSegment.flight.passengerName || current.passengerName;
      const passengerCount =
        firstSegment.flight.passengerCount || current.passengerCount;
      return {
        ...(passengerName ? { passengerName } : {}),
        ...(passengerCount ? { passengerCount } : {}),
      };
    })(),
    ...(layover ? { layoverMinutesAfter: layover } : {}),
    ...(connectionAirport ? { connectionAirport } : {}),
    ...(connectionTimes.connectionArrivalMinutes !== undefined
      ? {
          connectionArrivalMinutes: connectionTimes.connectionArrivalMinutes,
        }
      : current.connectionArrivalMinutes !== undefined
        ? { connectionArrivalMinutes: current.connectionArrivalMinutes }
        : {}),
    ...(connectionTimes.connectionDepartureMinutes !== undefined
      ? {
          connectionDepartureMinutes:
            connectionTimes.connectionDepartureMinutes,
        }
      : current.connectionDepartureMinutes !== undefined
        ? { connectionDepartureMinutes: current.connectionDepartureMinutes }
        : {}),
    ...(legs?.length
      ? { legs }
      : current.legs?.length
        ? { legs: current.legs }
        : {}),
    confirmationUris: imported.confirmationUris?.length
      ? imported.confirmationUris
      : current.confirmationUris,
  };
}
