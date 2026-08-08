import { calculateFlightArrival } from './flight-arrival';
import {
    doorToDoorDuration,
    isConnectingSegmentGroup,
    splitRoundTripDirections,
} from './flight-confirmation-itinerary';
import type {
    ParsedFlightConfirmation,
    ParsedFlightSegment,
} from './flight-confirmation-parser';

export interface ImportedFlightSchedule {
  departureDate?: string;
  departureMinutes?: number;
  arrivalDate?: string;
  arrivalMinutes?: number;
  durationMinutes?: number;
}

/** Schedule for one confirmation segment (outbound, return, or connecting leg). */
export function flightSegmentSchedule(
  segment: ParsedFlightSegment | undefined,
  imported: ParsedFlightConfirmation,
  fallback?: { date?: string; startMinutes?: number },
): ImportedFlightSchedule {
  const recognizedDates = imported.itineraryDates ?? [];
  const departureDate =
    segment?.date || imported.date || recognizedDates[0] || fallback?.date;
  const departureMinutes =
    segment?.startMinutes ?? imported.startMinutes ?? fallback?.startMinutes;
  const durationMinutes =
    segment?.durationMinutes ?? imported.durationMinutes;

  if (segment?.arrivalDate && segment.arrivalMinutes !== undefined) {
    return {
      departureDate,
      departureMinutes,
      arrivalDate: segment.arrivalDate,
      arrivalMinutes: segment.arrivalMinutes,
      durationMinutes,
    };
  }

  if (
    departureDate &&
    departureMinutes !== undefined &&
    durationMinutes !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: departureDate,
      startMinutes: departureMinutes,
      durationMinutes,
      departureAirport:
        segment?.flight.departureAirport || imported.flight.departureAirport,
      arrivalAirport:
        segment?.flight.arrivalAirport || imported.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes,
    };
  }

  return {
    departureDate,
    departureMinutes,
    arrivalDate: departureDate,
    durationMinutes,
  };
}

/** Door-to-door schedule for a direction that may include connecting legs. */
export function flightDirectionSchedule(
  direction: ParsedFlightSegment[],
  imported: ParsedFlightConfirmation,
  fallback?: { date?: string; startMinutes?: number },
): ImportedFlightSchedule {
  if (direction.length === 0) {
    return flightSegmentSchedule(undefined, imported, fallback);
  }
  if (!isConnectingSegmentGroup(direction)) {
    return flightSegmentSchedule(direction[0], imported, fallback);
  }

  const first = direction[0]!;
  const last = direction.at(-1)!;
  const departureDate =
    first.date || imported.date || fallback?.date;
  const departureMinutes =
    first.startMinutes ?? imported.startMinutes ?? fallback?.startMinutes;

  const doorToDoor = doorToDoorDuration(direction);

  if (last.arrivalDate && last.arrivalMinutes !== undefined) {
    return {
      departureDate,
      departureMinutes,
      arrivalDate: last.arrivalDate,
      arrivalMinutes: last.arrivalMinutes,
      durationMinutes: doorToDoor ?? first.durationMinutes,
    };
  }

  if (
    last.date &&
    last.startMinutes !== undefined &&
    last.durationMinutes !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: last.date,
      startMinutes: last.startMinutes,
      durationMinutes: last.durationMinutes,
      departureAirport: last.flight.departureAirport,
      arrivalAirport: last.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes: doorToDoor ?? first.durationMinutes,
    };
  }

  const fallbackSchedule = flightSegmentSchedule(first, imported, fallback);
  return {
    ...fallbackSchedule,
    ...(doorToDoor !== undefined ? { durationMinutes: doorToDoor } : {}),
  };
}

/** Dates/times for confirmation-driven editors, including connecting itineraries. */
export function flightConfirmationSchedule(
  imported: ParsedFlightConfirmation,
  fallback?: { date?: string; startMinutes?: number },
): ImportedFlightSchedule {
  const segments = imported.segments;
  // Round-trips: review/edit the outbound direction only (may include layovers).
  // Trip end dates for round-trips come from the return leg when creating/editing the plan.
  if (segments.length > 0 && !isConnectingSegmentGroup(segments)) {
    const directions = splitRoundTripDirections(segments);
    return flightDirectionSchedule(
      directions?.outbound ?? [segments[0]!],
      imported,
      fallback,
    );
  }

  const recognizedDates = imported.itineraryDates ?? [];
  const departureDate = imported.date || recognizedDates[0] || fallback?.date;
  const departureMinutes = imported.startMinutes ?? fallback?.startMinutes;
  const lastSegment = segments.at(-1);
  const finalLegDate =
    lastSegment?.date || recognizedDates.at(-1) || departureDate;
  const finalLegStart = lastSegment?.startMinutes;
  const finalLegDuration = lastSegment?.durationMinutes;

  const connectingDoorToDoor =
    segments.length > 1 ? doorToDoorDuration(segments) : undefined;
  const durationMinutes =
    connectingDoorToDoor ?? imported.durationMinutes;

  if (lastSegment?.arrivalDate && lastSegment.arrivalMinutes !== undefined) {
    return {
      departureDate,
      departureMinutes,
      arrivalDate: lastSegment.arrivalDate,
      arrivalMinutes: lastSegment.arrivalMinutes,
      durationMinutes,
    };
  }

  if (
    lastSegment &&
    finalLegDate &&
    finalLegStart !== undefined &&
    finalLegDuration !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: finalLegDate,
      startMinutes: finalLegStart,
      durationMinutes: finalLegDuration,
      departureAirport: lastSegment.flight.departureAirport,
      arrivalAirport: lastSegment.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes,
    };
  }

  if (
    departureDate &&
    departureMinutes !== undefined &&
    durationMinutes !== undefined
  ) {
    const arrival = calculateFlightArrival({
      date: departureDate,
      startMinutes: departureMinutes,
      durationMinutes,
      departureAirport: imported.flight.departureAirport,
      arrivalAirport: imported.flight.arrivalAirport,
    });
    return {
      departureDate,
      departureMinutes,
      arrivalDate: arrival.date,
      arrivalMinutes: arrival.startMinutes,
      durationMinutes,
    };
  }

  return {
    departureDate,
    departureMinutes,
    arrivalDate: finalLegDate,
    durationMinutes,
  };
}
