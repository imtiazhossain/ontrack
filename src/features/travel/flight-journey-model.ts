import { calculateFlightArrival } from './flight-arrival';
import type { ParsedFlightSegment } from './flight-confirmation-parser';
import type { TravelFlightDetails, TravelFlightLeg } from './types';

export type FlightJourneyStop = {
  kind: 'departure' | 'arrival';
  timeMinutes?: number;
  airport?: string;
  terminal?: string;
  gate?: string;
  airline?: string;
  flightNumber?: string;
  aircraft?: string;
  durationMinutes?: number;
};

export type FlightJourneyLayover = {
  minutes: number;
  airport?: string;
  arrivalMinutes?: number;
  departureMinutes?: number;
};

export type FlightJourneyLegView = {
  departure: FlightJourneyStop;
  arrival: FlightJourneyStop;
  durationMinutes?: number;
  layoverAfter?: FlightJourneyLayover;
};

export type FlightJourneyViewModel = {
  legs: FlightJourneyLegView[];
  stopCount: number;
  totalDurationMinutes?: number;
  routeAirports: string[];
};

/** `1 Traveler` / `2 Travelers`, or the named lead traveler when known. */
export function flightPassengerLabel(details: {
  passengerName?: string;
  passengerCount?: number;
}): string {
  if (details.passengerName) return details.passengerName;
  const count = details.passengerCount ?? 1;
  return `${count} Traveler${count === 1 ? '' : 's'}`;
}

function optionalText(value: unknown, uppercase = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return uppercase ? trimmed.toUpperCase() : trimmed;
}

function optionalMinutes(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const minutes = Math.round(value);
    return minutes >= 0 && minutes < 24 * 60 ? minutes : undefined;
  }
  return undefined;
}

function optionalPositiveMinutes(value: unknown): number | undefined {
  const minutes = optionalMinutes(value);
  if (minutes === undefined) return undefined;
  if (typeof value === 'number' && value > 0) return Math.round(value);
  return minutes > 0 ? minutes : undefined;
}

export function normalizeFlightLegs(value: unknown): TravelFlightLeg[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const legs = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return undefined;
      const input = entry as Partial<Record<keyof TravelFlightLeg, unknown>>;
      const leg: TravelFlightLeg = {
        airline: optionalText(input.airline),
        flightNumber: optionalText(input.flightNumber, true),
        departureAirport: optionalText(input.departureAirport, true),
        departureTerminal: optionalText(input.departureTerminal, true),
        departureGate: optionalText(input.departureGate, true),
        arrivalAirport: optionalText(input.arrivalAirport, true),
        arrivalTerminal: optionalText(input.arrivalTerminal, true),
        arrivalGate: optionalText(input.arrivalGate, true),
        date: optionalText(input.date),
        departureMinutes: optionalMinutes(input.departureMinutes),
        arrivalDate: optionalText(input.arrivalDate),
        arrivalMinutes: optionalMinutes(input.arrivalMinutes),
        durationMinutes: optionalPositiveMinutes(input.durationMinutes),
        aircraft: optionalText(input.aircraft),
        layoverMinutesAfter: optionalPositiveMinutes(input.layoverMinutesAfter),
      };
      return Object.values(leg).some((field) => field !== undefined) ? leg : undefined;
    })
    .filter((leg): leg is TravelFlightLeg => Boolean(leg));
  return legs.length ? legs : undefined;
}

/** Build persisted legs from a parsed confirmation’s segments. */
export function flightLegsFromSegments(
  segments: ParsedFlightSegment[],
): TravelFlightLeg[] | undefined {
  if (segments.length < 2) return undefined;
  return segments.map((segment) => {
    const arrival =
      segment.arrivalMinutes !== undefined
        ? { arrivalMinutes: segment.arrivalMinutes, arrivalDate: segment.arrivalDate }
        : segment.date &&
            segment.startMinutes !== undefined &&
            segment.durationMinutes !== undefined
          ? (() => {
              const landed = calculateFlightArrival({
                date: segment.date,
                startMinutes: segment.startMinutes,
                durationMinutes: segment.durationMinutes,
                departureAirport: segment.flight.departureAirport,
                arrivalAirport: segment.flight.arrivalAirport,
              });
              return {
                arrivalMinutes: landed.startMinutes,
                arrivalDate: landed.date,
              };
            })()
          : {};
    return {
      airline: segment.flight.airline || undefined,
      flightNumber: segment.flight.flightNumber || undefined,
      departureAirport: segment.flight.departureAirport || undefined,
      departureTerminal: segment.flight.departureTerminal || undefined,
      departureGate: segment.flight.departureGate || undefined,
      arrivalAirport: segment.flight.arrivalAirport || undefined,
      arrivalTerminal: segment.flight.arrivalTerminal || undefined,
      arrivalGate: segment.flight.arrivalGate || undefined,
      date: segment.date,
      departureMinutes: segment.startMinutes,
      ...arrival,
      durationMinutes: segment.durationMinutes,
      aircraft: segment.aircraft,
      layoverMinutesAfter: segment.layoverMinutesAfter,
    };
  });
}

/**
 * Reconstruct a 2-leg journey from collapsed connection fields when `legs`
 * is missing (legacy imports).
 */
export function reconstructConnectingLegs(input: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
}): TravelFlightLeg[] | undefined {
  const { details, date, startMinutes, durationMinutes } = input;
  const connection = details.connectionAirport?.trim().toUpperCase();
  const dep = details.departureAirport?.trim().toUpperCase();
  const arr = details.arrivalAirport?.trim().toUpperCase();
  if (
    !connection ||
    !dep ||
    !arr ||
    connection === dep ||
    connection === arr ||
    details.connectionArrivalMinutes === undefined ||
    details.connectionDepartureMinutes === undefined ||
    startMinutes === undefined
  ) {
    return undefined;
  }

  const leg1Duration =
    ((details.connectionArrivalMinutes - startMinutes + 24 * 60) % (24 * 60)) ||
    undefined;
  const finalArrival =
    date !== undefined && durationMinutes !== undefined
      ? calculateFlightArrival({
          date,
          startMinutes,
          durationMinutes,
          departureAirport: dep,
          arrivalAirport: arr,
        })
      : undefined;
  const leg2Duration =
    finalArrival && details.connectionDepartureMinutes !== undefined
      ? ((finalArrival.startMinutes -
          details.connectionDepartureMinutes +
          24 * 60) %
          (24 * 60)) ||
        undefined
      : undefined;

  return [
    {
      airline: details.airline,
      flightNumber: details.flightNumber,
      departureAirport: dep,
      departureTerminal: details.departureTerminal,
      departureGate: details.departureGate,
      arrivalAirport: connection,
      date,
      departureMinutes: startMinutes,
      arrivalMinutes: details.connectionArrivalMinutes,
      durationMinutes: leg1Duration,
      layoverMinutesAfter: details.layoverMinutesAfter,
    },
    {
      airline: details.airline,
      departureAirport: connection,
      arrivalAirport: arr,
      arrivalTerminal: details.arrivalTerminal,
      arrivalGate: details.arrivalGate,
      date: finalArrival?.date ?? date,
      departureMinutes: details.connectionDepartureMinutes,
      arrivalMinutes: finalArrival?.startMinutes,
      durationMinutes: leg2Duration,
    },
  ];
}

/** The single leg of a non-stop booking, so it can share the journey card. */
function directFlightLeg(input: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
}): TravelFlightLeg {
  const { details, date, startMinutes, durationMinutes } = input;
  const arrival =
    date !== undefined &&
    startMinutes !== undefined &&
    durationMinutes !== undefined
      ? calculateFlightArrival({
          date,
          startMinutes,
          durationMinutes,
          departureAirport: details.departureAirport,
          arrivalAirport: details.arrivalAirport,
        })
      : undefined;
  return {
    airline: details.airline,
    flightNumber: details.flightNumber,
    departureAirport: details.departureAirport?.trim().toUpperCase(),
    departureTerminal: details.departureTerminal,
    departureGate: details.departureGate,
    arrivalAirport: details.arrivalAirport?.trim().toUpperCase(),
    arrivalTerminal: details.arrivalTerminal,
    arrivalGate: details.arrivalGate,
    date,
    departureMinutes: startMinutes,
    arrivalDate: arrival?.date,
    arrivalMinutes: arrival?.startMinutes,
    durationMinutes,
  };
}

/**
 * Legs for any flight: stored connecting legs, a reconstructed legacy
 * connection, or the synthesized single leg of a non-stop booking.
 */
export function resolveFlightLegs(input: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
}): TravelFlightLeg[] {
  if (detailsHasConnectingLegs(input.details)) {
    return input.details.legs!;
  }
  return reconstructConnectingLegs(input) ?? [directFlightLeg(input)];
}

function detailsHasConnectingLegs(details: TravelFlightDetails): boolean {
  return Boolean(details.legs && details.legs.length > 1);
}

export function isConnectingFlightDetails(details: TravelFlightDetails): boolean {
  if (detailsHasConnectingLegs(details)) return true;
  const connection = details.connectionAirport?.trim().toUpperCase();
  const dep = details.departureAirport?.trim().toUpperCase();
  const arr = details.arrivalAirport?.trim().toUpperCase();
  return Boolean(
    connection &&
      dep &&
      arr &&
      connection !== dep &&
      connection !== arr &&
      details.layoverMinutesAfter,
  );
}

function sameAirport(a?: string, b?: string): boolean {
  return Boolean(a && b && a.trim().toUpperCase() === b.trim().toUpperCase());
}

export function buildFlightJourneyViewModel(input: {
  details: TravelFlightDetails;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
}): FlightJourneyViewModel {
  const legs = resolveFlightLegs(input);
  const { details } = input;
  const lastIndex = legs.length - 1;
  // The editor and most confirmations only carry terminal/gate for the whole
  // booking, so the journey endpoints inherit them when the airports agree.
  const endpoint = (leg: TravelFlightLeg, index: number) => ({
    departureTerminal:
      leg.departureTerminal ??
      (index === 0 && sameAirport(leg.departureAirport, details.departureAirport)
        ? details.departureTerminal
        : undefined),
    departureGate:
      leg.departureGate ??
      (index === 0 && sameAirport(leg.departureAirport, details.departureAirport)
        ? details.departureGate
        : undefined),
    arrivalTerminal:
      leg.arrivalTerminal ??
      (index === lastIndex && sameAirport(leg.arrivalAirport, details.arrivalAirport)
        ? details.arrivalTerminal
        : undefined),
    arrivalGate:
      leg.arrivalGate ??
      (index === lastIndex && sameAirport(leg.arrivalAirport, details.arrivalAirport)
        ? details.arrivalGate
        : undefined),
  });

  const viewLegs: FlightJourneyLegView[] = legs.map((leg, index) => {
    const facilities = endpoint(leg, index);
    const next = legs[index + 1];
    const layoverMinutes =
      leg.layoverMinutesAfter ??
      (next?.departureMinutes !== undefined &&
      leg.arrivalMinutes !== undefined
        ? ((next.departureMinutes - leg.arrivalMinutes + 24 * 60) % (24 * 60)) ||
          undefined
        : undefined);
    return {
      departure: {
        kind: 'departure',
        timeMinutes: leg.departureMinutes,
        airport: leg.departureAirport,
        terminal: facilities.departureTerminal,
        gate: facilities.departureGate,
        airline: leg.airline,
        flightNumber: leg.flightNumber,
        aircraft: leg.aircraft,
        durationMinutes: leg.durationMinutes,
      },
      arrival: {
        kind: 'arrival',
        timeMinutes: leg.arrivalMinutes,
        airport: leg.arrivalAirport,
        terminal: facilities.arrivalTerminal,
        gate: facilities.arrivalGate,
      },
      durationMinutes: leg.durationMinutes,
      layoverAfter:
        layoverMinutes && layoverMinutes > 0
          ? {
              minutes: layoverMinutes,
              airport: leg.arrivalAirport,
              arrivalMinutes: leg.arrivalMinutes,
              departureMinutes: next?.departureMinutes,
            }
          : undefined,
    };
  });

  const routeAirports: string[] = [];
  viewLegs.forEach((leg, index) => {
    if (index === 0 && leg.departure.airport) {
      routeAirports.push(leg.departure.airport.toUpperCase());
    }
    if (leg.arrival.airport) {
      routeAirports.push(leg.arrival.airport.toUpperCase());
    }
  });

  return {
    legs: viewLegs,
    stopCount: Math.max(0, viewLegs.length - 1),
    totalDurationMinutes: input.durationMinutes,
    routeAirports: [...new Set(routeAirports)],
  };
}
