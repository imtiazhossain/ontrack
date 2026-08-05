import {
  calculateFlightArrival,
  calculateFlightDuration,
} from './flight-arrival';
import type { ParsedFlightSegment } from './flight-confirmation-parser';
import { normalizeFlightDetails } from './flight-details';
import { flightLegsFromSegments } from './flight-journey-model';
import { formatFlightRouteLabel } from './flight-route-label';
import type { TravelFlightDetails, TravelItineraryItem, TravelPlan } from './types';

interface MergeImportedFlightsOptions {
  itinerary: TravelItineraryItem[];
  segments: ParsedFlightSegment[];
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>;
  createId: () => string;
  targetItemId?: string;
  confirmationUris?: string[];
}

/** Booking-level fields parsers put on drafts; keep them through itinerary merge. */
function bookingFieldsFromDraft(
  draft: ParsedFlightSegment['flight'],
): Pick<
  TravelFlightDetails,
  | 'airline'
  | 'flightNumber'
  | 'confirmationCode'
  | 'departureAirport'
  | 'departureTerminal'
  | 'departureGate'
  | 'arrivalAirport'
  | 'arrivalTerminal'
  | 'arrivalGate'
  | 'seat'
  | 'passengerName'
  | 'passengerCount'
> {
  const normalized = normalizeFlightDetails(draft);
  return {
    airline: normalized?.airline,
    flightNumber: normalized?.flightNumber,
    confirmationCode: normalized?.confirmationCode,
    departureAirport: normalized?.departureAirport,
    departureTerminal: normalized?.departureTerminal,
    departureGate: normalized?.departureGate,
    arrivalAirport: normalized?.arrivalAirport,
    arrivalTerminal: normalized?.arrivalTerminal,
    arrivalGate: normalized?.arrivalGate,
    seat: normalized?.seat,
    ...(normalized?.passengerName
      ? { passengerName: normalized.passengerName }
      : {}),
    ...(normalized?.passengerCount !== undefined
      ? { passengerCount: normalized.passengerCount }
      : {}),
  };
}

export function expandedTripRangeForFlights(
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  segments: ParsedFlightSegment[],
): Pick<TravelPlan, 'startDate' | 'endDate'> {
  const dates = segments
    .flatMap((segment) => [segment.date, segment.arrivalDate])
    .filter((date): date is string => Boolean(date));
  return {
    startDate: dates.reduce(
      (earliest, date) => (date < earliest ? date : earliest),
      tripRange.startDate,
    ),
    endDate: dates.reduce(
      (latest, date) => (date > latest ? date : latest),
      tripRange.endDate,
    ),
  };
}

function airportCode(value?: string): string | undefined {
  const code = value?.trim().toUpperCase();
  return code || undefined;
}

function sameFlight(
  item: TravelItineraryItem,
  segment: ParsedFlightSegment,
  date: string,
): boolean {
  if (item.kind !== 'flight' || item.date !== date) return false;
  const flightNumber = segment.flight.flightNumber.trim().toUpperCase();
  if (
    flightNumber &&
    item.flight?.flightNumber?.trim().toUpperCase() === flightNumber
  ) {
    return true;
  }
  return Boolean(
    segment.flight.departureAirport &&
    segment.flight.arrivalAirport &&
    item.flight?.departureAirport?.toUpperCase() ===
      segment.flight.departureAirport.toUpperCase() &&
    item.flight?.arrivalAirport?.toUpperCase() ===
      segment.flight.arrivalAirport.toUpperCase(),
  );
}

export function connectionArrivalMinutesForSegment(
  segment: ParsedFlightSegment,
): number | undefined {
  if (segment.arrivalMinutes !== undefined) return segment.arrivalMinutes;
  if (
    segment.date &&
    segment.startMinutes !== undefined &&
    segment.durationMinutes !== undefined
  ) {
    return calculateFlightArrival({
      date: segment.date,
      startMinutes: segment.startMinutes,
      durationMinutes: segment.durationMinutes,
      departureAirport: segment.flight.departureAirport,
      arrivalAirport: segment.flight.arrivalAirport,
    }).startMinutes;
  }
  return undefined;
}

/** Door-to-door minutes for a connecting (or single) direction. */
export function doorToDoorDuration(
  segments: ParsedFlightSegment[],
): number | undefined {
  const first = segments[0];
  const last = segments.at(-1);
  if (
    !first?.date ||
    first.startMinutes === undefined ||
    !last?.date ||
    last.startMinutes === undefined
  ) {
    return undefined;
  }
  let lastArrivalDate = last.arrivalDate ?? last.date;
  let lastArrivalMinutes = last.arrivalMinutes;
  if (lastArrivalMinutes === undefined && last.durationMinutes !== undefined) {
    const landed = calculateFlightArrival({
      date: last.date,
      startMinutes: last.startMinutes,
      durationMinutes: last.durationMinutes,
      departureAirport: last.flight.departureAirport,
      arrivalAirport: last.flight.arrivalAirport,
    });
    lastArrivalDate = landed.date;
    lastArrivalMinutes = landed.startMinutes;
  }
  if (lastArrivalMinutes === undefined) {
    const sum = segments.reduce((total, segment) => {
      return (
        total +
        (segment.durationMinutes ?? 0) +
        (segment.layoverMinutesAfter ?? 0)
      );
    }, 0);
    return sum > 0 ? sum : undefined;
  }
  // Confirmations often print total as first-dep → final-arr wall clocks.
  if (first.date === lastArrivalDate) {
    const printed = lastArrivalMinutes - first.startMinutes;
    if (printed > 0) return printed;
  }
  // Prefer block time across airport zones when the printed span is overnight.
  return calculateFlightDuration({
    departureDate: first.date,
    departureMinutes: first.startMinutes,
    arrivalDate: lastArrivalDate,
    arrivalMinutes: lastArrivalMinutes,
    departureAirport: first.flight.departureAirport,
    arrivalAirport: last.flight.arrivalAirport,
  });
}

function connectingJourneyValues(
  segments: ParsedFlightSegment[],
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  confirmationUris?: string[],
) {
  const first = segments[0]!;
  const second = segments[1];
  const last = segments.at(-1)!;
  const legs = flightLegsFromSegments(segments);
  const connectionArrivalMinutes = connectionArrivalMinutesForSegment(first);
  const date = first.date ?? tripRange.startDate;
  const startMinutes = first.startMinutes ?? 12 * 60;
  const durationMinutes = doorToDoorDuration(segments);
  const connectionAirport =
    first.flight.arrivalAirport || first.flight.connectionAirport || undefined;
  const lastArrival = bookingFieldsFromDraft(last.flight);
  const flight: TravelFlightDetails = {
    ...bookingFieldsFromDraft(first.flight),
    arrivalAirport: lastArrival.arrivalAirport,
    arrivalTerminal: lastArrival.arrivalTerminal,
    arrivalGate: lastArrival.arrivalGate,
    ...(first.layoverMinutesAfter
      ? { layoverMinutesAfter: first.layoverMinutesAfter }
      : {}),
    ...(connectionAirport ? { connectionAirport } : {}),
    ...(connectionArrivalMinutes !== undefined
      ? { connectionArrivalMinutes }
      : {}),
    ...(second?.startMinutes !== undefined
      ? { connectionDepartureMinutes: second.startMinutes }
      : {}),
    ...(legs?.length ? { legs } : {}),
    ...(confirmationUris?.length ? { confirmationUris } : {}),
  };
  const route = formatFlightRouteLabel(flight);
  return {
    title: route ? `Flight ${route}` : first.title || first.flight.flightNumber || 'Flight',
    date,
    startMinutes,
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    flight,
  };
}

function importedItemValues(
  segment: ParsedFlightSegment,
  index: number,
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  confirmationUris?: string[],
  nextSegment?: ParsedFlightSegment,
) {
  const date =
    segment.date ?? (index === 0 ? tripRange.startDate : tripRange.endDate);
  const connectionArrivalMinutes = segment.layoverMinutesAfter
    ? connectionArrivalMinutesForSegment(segment)
    : undefined;
  return {
    title:
      segment.title ||
      segment.flight.flightNumber ||
      (index === 0 ? 'Departure flight' : 'Return flight'),
    date,
    startMinutes: segment.startMinutes ?? 12 * 60,
    ...(segment.durationMinutes !== undefined
      ? { durationMinutes: segment.durationMinutes }
      : {}),
    flight: {
      ...bookingFieldsFromDraft(segment.flight),
      ...(segment.layoverMinutesAfter
        ? {
            layoverMinutesAfter: segment.layoverMinutesAfter,
            connectionAirport:
              segment.flight.connectionAirport ||
              segment.flight.arrivalAirport ||
              undefined,
            ...(connectionArrivalMinutes !== undefined
              ? { connectionArrivalMinutes }
              : {}),
            ...(nextSegment?.startMinutes !== undefined
              ? { connectionDepartureMinutes: nextSegment.startMinutes }
              : {}),
          }
        : {}),
      ...(confirmationUris?.length ? { confirmationUris } : {}),
    },
  };
}

function segmentDateGapDays(
  current?: ParsedFlightSegment,
  next?: ParsedFlightSegment,
): number | undefined {
  if (!current?.date || !next?.date) return undefined;
  const gapMs =
    new Date(`${next.date}T12:00:00`).getTime() -
    new Date(`${current.date}T12:00:00`).getTime();
  return Math.round(gapMs / (24 * 60 * 60 * 1000));
}

/** True when outbound ends where return starts and return ends at outbound origin. */
function isReverseRoundTripPair(
  outbound: ParsedFlightSegment[],
  returning: ParsedFlightSegment[],
): boolean {
  const outFirst = outbound[0];
  const outLast = outbound.at(-1);
  const retFirst = returning[0];
  const retLast = returning.at(-1);
  if (!outFirst || !outLast || !retFirst || !retLast) return false;
  const origin = airportCode(outFirst.flight.departureAirport);
  const destination = airportCode(outLast.flight.arrivalAirport);
  const returnFrom = airportCode(retFirst.flight.departureAirport);
  const returnTo = airportCode(retLast.flight.arrivalAirport);
  if (!origin || !destination || !returnFrom || !returnTo) return false;
  return destination === returnFrom && returnTo === origin;
}

function splitAtLargestGap(segments: ParsedFlightSegment[]):
  | { outbound: ParsedFlightSegment[]; returning: ParsedFlightSegment[] }
  | undefined {
  if (segments.length < 2) return undefined;
  let splitAfter = Math.floor((segments.length - 1) / 2);
  let largestGap = -1;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const gap = segmentDateGapDays(segments[index], segments[index + 1]);
    if (gap !== undefined && gap > largestGap) {
      largestGap = gap;
      splitAfter = index;
    }
  }
  const outbound = segments.slice(0, splitAfter + 1);
  const returning = segments.slice(splitAfter + 1);
  if (!outbound.length || !returning.length) return undefined;
  return { outbound, returning };
}

/** True when segments are same-journey connections (not outbound + return). */
export function isConnectingSegmentGroup(
  segments: ParsedFlightSegment[],
): boolean {
  if (segments.length < 2) return false;
  const origin = airportCode(segments[0]?.flight.departureAirport);
  const finalArrival = airportCode(segments.at(-1)?.flight.arrivalAirport);
  // A→…→A is a round trip (same/next-day turnaround included), not a connection.
  if (origin && finalArrival && origin === finalArrival) return false;

  for (let index = 0; index < segments.length - 1; index++) {
    const current = segments[index]!;
    const next = segments[index + 1]!;
    const gapDays = segmentDateGapDays(current, next);
    // Round-trips often leave days later; connections are same/next day.
    if (gapDays !== undefined && gapDays > 1) return false;
    if (current.layoverMinutesAfter) continue;
    const arrival = airportCode(current.flight.arrivalAirport);
    const departure = airportCode(next.flight.departureAirport);
    if (!arrival || !departure || arrival !== departure) return false;
  }
  return true;
}

/** Outbound + return that reverse the route (connections may sit inside each side). */
export function isRoundTripSegmentGroup(
  segments: ParsedFlightSegment[],
): boolean {
  if (segments.length < 2 || isConnectingSegmentGroup(segments)) return false;
  const directions = splitAtLargestGap(segments);
  if (!directions) return false;
  return isReverseRoundTripPair(directions.outbound, directions.returning);
}

/**
 * Split a round-trip confirmation into outbound vs returning directions at the
 * largest calendar gap (turnaround). Connecting legs stay inside each side.
 */
export function splitRoundTripDirections(
  segments: ParsedFlightSegment[],
):
  | { outbound: ParsedFlightSegment[]; returning: ParsedFlightSegment[] }
  | undefined {
  if (!isRoundTripSegmentGroup(segments)) return undefined;
  return splitAtLargestGap(segments);
}

function mergeConnectingJourney(
  itinerary: TravelItineraryItem[],
  segments: ParsedFlightSegment[],
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  createId: () => string,
  targetItemId: string | undefined,
  confirmationUris?: string[],
): TravelItineraryItem[] {
  const values = connectingJourneyValues(
    segments,
    tripRange,
    confirmationUris,
  );
  const merged = [...itinerary];
  const segmentFlightNumbers = new Set(
    segments
      .map((segment) => segment.flight.flightNumber.trim().toUpperCase())
      .filter(Boolean),
  );
  const journeyDate = values.date;
  // Drop prior legs from the same connecting confirmation when re-importing.
  // Match by flight number + journey date so unrelated trips keep their flights.
  const withoutPriorLegs = merged.filter((item) => {
    if (item.id === targetItemId) return true;
    if (item.kind !== 'flight') return true;
    const number = item.flight?.flightNumber?.trim().toUpperCase();
    if (!number || !segmentFlightNumbers.has(number)) return true;
    return item.date !== journeyDate;
  });

  const targetIndex = targetItemId
    ? withoutPriorLegs.findIndex((item) => item.id === targetItemId)
    : withoutPriorLegs.findIndex((item) =>
        sameFlight(item, segments[0]!, values.date),
      );

  if (targetIndex >= 0) {
    const next = [...withoutPriorLegs];
    next[targetIndex] = {
      ...next[targetIndex],
      kind: 'flight',
      ...values,
      flight: {
        ...next[targetIndex].flight,
        ...values.flight,
      },
    };
    return next;
  }

  return [
    ...withoutPriorLegs,
    {
      id: createId(),
      kind: 'flight',
      durationMinutes: 60,
      ...values,
    },
  ];
}

function mergeDirectionSegments(
  itinerary: TravelItineraryItem[],
  segments: ParsedFlightSegment[],
  tripRange: Pick<TravelPlan, 'startDate' | 'endDate'>,
  createId: () => string,
  targetItemId: string | undefined,
  confirmationUris: string[] | undefined,
  directionIndex: number,
): TravelItineraryItem[] {
  if (segments.length === 0) return itinerary;
  if (isConnectingSegmentGroup(segments)) {
    return mergeConnectingJourney(
      itinerary,
      segments,
      tripRange,
      createId,
      targetItemId,
      confirmationUris,
    );
  }

  const merged = [...itinerary];
  segments.forEach((segment, index) => {
    const values = importedItemValues(
      segment,
      directionIndex + index,
      tripRange,
      confirmationUris,
      segments[index + 1],
    );
    const targetIndex =
      index === 0 && targetItemId
        ? merged.findIndex((item) => item.id === targetItemId)
        : merged.findIndex(
            (item) =>
              item.id !== targetItemId &&
              sameFlight(item, segment, values.date),
          );
    if (targetIndex >= 0) {
      merged[targetIndex] = {
        ...merged[targetIndex],
        kind: 'flight',
        ...values,
        flight: {
          ...merged[targetIndex].flight,
          ...values.flight,
        },
      };
      return;
    }
    merged.push({
      id: createId(),
      kind: 'flight',
      durationMinutes: 60,
      ...values,
    });
  });
  return merged;
}

/**
 * Merge parsed flights into the itinerary.
 * True connecting confirmations collapse to one journey item with `legs`.
 * Outbound + return (multi-day) stay as separate items; layovers inside each
 * direction still collapse to that direction’s journey.
 */
export function mergeImportedFlights({
  itinerary,
  segments,
  tripRange,
  createId,
  targetItemId,
  confirmationUris,
}: MergeImportedFlightsOptions): TravelItineraryItem[] {
  if (isConnectingSegmentGroup(segments)) {
    return mergeConnectingJourney(
      itinerary,
      segments,
      tripRange,
      createId,
      targetItemId,
      confirmationUris,
    );
  }

  const directions = splitRoundTripDirections(segments);
  if (directions) {
    const withOutbound = mergeDirectionSegments(
      itinerary,
      directions.outbound,
      tripRange,
      createId,
      targetItemId,
      confirmationUris,
      0,
    );
    return mergeDirectionSegments(
      withOutbound,
      directions.returning,
      tripRange,
      createId,
      undefined,
      confirmationUris,
      1,
    );
  }

  return mergeDirectionSegments(
    itinerary,
    segments,
    tripRange,
    createId,
    targetItemId,
    confirmationUris,
    0,
  );
}
