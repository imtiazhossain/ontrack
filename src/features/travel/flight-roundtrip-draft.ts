import { calculateFlightDuration } from './flight-arrival';
import type { ParsedFlightSegment } from './flight-confirmation-parser';
import type { ImportedFlightSchedule } from './flight-confirmation-schedule';
import {
    emptyFlightDetailsDraft,
    formatLayoverDuration,
    normalizeFlightDetails,
    type FlightDetailsDraft,
} from './flight-details';
import { formatFlightRouteLabel } from './flight-route-label';
import type { TravelFlightLeg } from './types';

export type FlightTripType = 'one-way' | 'round-trip';

export type FlightLegScheduleDraft = {
  date: string;
  startMinutes: number | null;
  endDate: string;
  endMinutes: number | null;
};

export function emptyFlightLegScheduleDraft(): FlightLegScheduleDraft {
  return {
    date: '',
    startMinutes: null,
    endDate: '',
    endMinutes: null,
  };
}

export function flightLegScheduleFromImported(
  schedule: ImportedFlightSchedule,
): FlightLegScheduleDraft {
  return {
    date: schedule.departureDate ?? '',
    startMinutes:
      schedule.departureMinutes !== undefined ? schedule.departureMinutes : null,
    endDate: schedule.arrivalDate ?? schedule.departureDate ?? '',
    endMinutes:
      schedule.arrivalMinutes !== undefined ? schedule.arrivalMinutes : null,
  };
}

export function flightDetailsFromSegment(
  segment: ParsedFlightSegment,
): FlightDetailsDraft {
  return {
    ...emptyFlightDetailsDraft(),
    airline: segment.flight.airline || '',
    flightNumber: segment.flight.flightNumber || '',
    confirmationCode: segment.flight.confirmationCode || '',
    departureAirport: segment.flight.departureAirport || '',
    departureTerminal: segment.flight.departureTerminal || '',
    departureGate: segment.flight.departureGate || '',
    arrivalAirport: segment.flight.arrivalAirport || '',
    arrivalTerminal: segment.flight.arrivalTerminal || '',
    arrivalGate: segment.flight.arrivalGate || '',
    seat: segment.flight.seat || '',
    connectionAirport:
      segment.flight.connectionAirport ||
      (segment.layoverMinutesAfter
        ? segment.flight.arrivalAirport || ''
        : ''),
    ...(segment.flight.passengerName
      ? { passengerName: segment.flight.passengerName }
      : {}),
    ...(segment.flight.passengerCount
      ? { passengerCount: segment.flight.passengerCount }
      : {}),
    ...(segment.layoverMinutesAfter
      ? {
          layoverMinutesAfter: formatLayoverDuration(
            segment.layoverMinutesAfter,
          ),
        }
      : {}),
  };
}

/** Prefill a return leg by swapping outbound airports when the user toggles Roundtrip. */
export function suggestReturnDraftFromOutbound(
  outbound: FlightDetailsDraft,
  outboundSchedule: FlightLegScheduleDraft,
): { details: FlightDetailsDraft; schedule: FlightLegScheduleDraft } {
  const from = outbound.arrivalAirport.trim().toUpperCase();
  const to = outbound.departureAirport.trim().toUpperCase();
  return {
    details: {
      ...emptyFlightDetailsDraft(),
      airline: outbound.airline,
      confirmationCode: outbound.confirmationCode,
      departureAirport: from,
      arrivalAirport: to,
      ...(outbound.passengerName ? { passengerName: outbound.passengerName } : {}),
      ...(outbound.passengerCount
        ? { passengerCount: outbound.passengerCount }
        : {}),
    },
    schedule: {
      date: outboundSchedule.endDate || outboundSchedule.date,
      startMinutes: null,
      endDate: outboundSchedule.endDate || outboundSchedule.date,
      endMinutes: null,
    },
  };
}

function titleForLeg(details: FlightDetailsDraft, fallback: string): string {
  const route = formatFlightRouteLabel({
    departureAirport: details.departureAirport || undefined,
    arrivalAirport: details.arrivalAirport || undefined,
  });
  return route ? `Flight ${route}` : fallback;
}

function durationForLegSchedule(
  schedule: FlightLegScheduleDraft,
  departureAirport?: string,
  arrivalAirport?: string,
): number | undefined {
  if (
    !schedule.date ||
    schedule.startMinutes === null ||
    !schedule.endDate ||
    schedule.endMinutes === null
  ) {
    return undefined;
  }
  const durationMinutes = calculateFlightDuration({
    departureDate: schedule.date,
    departureMinutes: schedule.startMinutes,
    arrivalDate: schedule.endDate,
    arrivalMinutes: schedule.endMinutes,
    departureAirport,
    arrivalAirport,
  });
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return undefined;
  }
  return Math.round(durationMinutes);
}

function segmentFromLegDraft(
  details: FlightDetailsDraft,
  schedule: FlightLegScheduleDraft,
  titles: { preferred?: string; fallback: string },
): ParsedFlightSegment | undefined {
  const durationMinutes = durationForLegSchedule(
    schedule,
    details.departureAirport,
    details.arrivalAirport,
  );
  if (durationMinutes === undefined) return undefined;
  const normalized = normalizeFlightDetails(details);
  const layoverMinutesAfter = normalized?.layoverMinutesAfter;
  const connectionAirport = normalized?.connectionAirport;
  return {
    flight: {
      ...details,
      ...(connectionAirport ? { connectionAirport } : {}),
    },
    title: titles.preferred?.trim() || titleForLeg(details, titles.fallback),
    date: schedule.date,
    startMinutes: schedule.startMinutes!,
    arrivalDate: schedule.endDate,
    arrivalMinutes: schedule.endMinutes!,
    durationMinutes,
    ...(layoverMinutesAfter ? { layoverMinutesAfter } : {}),
    detectedFieldCount: 1,
  };
}

/** Apply collapsed direction-form edits onto stored connecting legs. */
function applyDirectionDraftToLegs(
  legs: TravelFlightLeg[],
  details: FlightDetailsDraft,
): TravelFlightLeg[] {
  if (legs.length < 2) return legs;
  const normalized = normalizeFlightDetails(details);
  const next = legs.map((leg) => ({ ...leg }));
  const first = { ...next[0]! };
  const lastIndex = next.length - 1;
  const last = { ...next[lastIndex]! };

  if (details.departureAirport.trim()) {
    first.departureAirport = details.departureAirport.trim().toUpperCase();
  }
  if (details.airline.trim()) {
    first.airline = details.airline.trim();
  }
  if (details.flightNumber.trim()) {
    first.flightNumber = details.flightNumber.trim();
  }
  if (details.departureTerminal.trim()) {
    first.departureTerminal = details.departureTerminal.trim();
  }
  if (details.departureGate.trim()) {
    first.departureGate = details.departureGate.trim();
  }
  if (details.arrivalAirport.trim()) {
    last.arrivalAirport = details.arrivalAirport.trim().toUpperCase();
  }
  if (details.arrivalTerminal.trim()) {
    last.arrivalTerminal = details.arrivalTerminal.trim();
  }
  if (details.arrivalGate.trim()) {
    last.arrivalGate = details.arrivalGate.trim();
  }

  const connection = (
    normalized?.connectionAirport ||
    details.connectionAirport ||
    ''
  )
    .trim()
    .toUpperCase();
  if (connection) {
    first.arrivalAirport = connection;
    if (next[1]) {
      next[1] = { ...next[1], departureAirport: connection };
    }
  }

  if (normalized?.layoverMinutesAfter) {
    first.layoverMinutesAfter = normalized.layoverMinutesAfter;
  }

  next[0] = first;
  next[lastIndex] = last;
  return next;
}

function segmentsFromStoredLegs(
  legs: TravelFlightLeg[],
  details: FlightDetailsDraft,
  schedule: FlightLegScheduleDraft,
  titles: { preferred?: string; fallback: string },
): ParsedFlightSegment[] | undefined {
  if (legs.length < 2) return undefined;
  if (
    !schedule.date ||
    schedule.startMinutes === null ||
    !schedule.endDate ||
    schedule.endMinutes === null
  ) {
    return undefined;
  }

  const patchedLegs = applyDirectionDraftToLegs(legs, details);
  const confirmationCode = details.confirmationCode;
  const normalized = normalizeFlightDetails(details);
  const segments: ParsedFlightSegment[] = patchedLegs.map((leg, index) => {
    const isFirst = index === 0;
    const isLast = index === patchedLegs.length - 1;
    const date = isFirst ? schedule.date : (leg.date ?? schedule.date);
    const startMinutes = isFirst
      ? schedule.startMinutes!
      : (leg.departureMinutes ?? schedule.startMinutes!);
    const arrivalDate = isLast
      ? schedule.endDate
      : (leg.arrivalDate ?? leg.date ?? schedule.endDate);
    const arrivalMinutes = isLast
      ? schedule.endMinutes!
      : (leg.arrivalMinutes ?? schedule.endMinutes!);
    const durationMinutes =
      leg.durationMinutes ??
      durationForLegSchedule(
        {
          date,
          startMinutes,
          endDate: arrivalDate,
          endMinutes: arrivalMinutes,
        },
        leg.departureAirport,
        leg.arrivalAirport,
      );
    const layoverMinutesAfter = isFirst
      ? (normalized?.layoverMinutesAfter ?? leg.layoverMinutesAfter)
      : leg.layoverMinutesAfter;
    return {
      flight: {
        ...emptyFlightDetailsDraft(),
        airline: leg.airline || details.airline,
        flightNumber: leg.flightNumber || (isFirst ? details.flightNumber : ''),
        confirmationCode,
        departureAirport: leg.departureAirport || '',
        departureTerminal: leg.departureTerminal || '',
        departureGate: leg.departureGate || '',
        arrivalAirport: leg.arrivalAirport || '',
        arrivalTerminal: leg.arrivalTerminal || '',
        arrivalGate: leg.arrivalGate || '',
        seat: isFirst ? details.seat : '',
        ...(isFirst && normalized?.connectionAirport
          ? { connectionAirport: normalized.connectionAirport }
          : {}),
        ...(details.passengerName
          ? { passengerName: details.passengerName }
          : {}),
        ...(details.passengerCount
          ? { passengerCount: details.passengerCount }
          : {}),
      },
      title: isFirst
        ? titles.preferred?.trim() || titleForLeg(details, titles.fallback)
        : undefined,
      date,
      startMinutes,
      arrivalDate,
      arrivalMinutes,
      ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      ...(layoverMinutesAfter ? { layoverMinutesAfter } : {}),
      ...(leg.aircraft ? { aircraft: leg.aircraft } : {}),
      detectedFieldCount: 1,
    };
  });

  return segments;
}

/** Build segments for one direction (one-way, outbound, or return), honoring form edits. */
export function segmentsFromDirectionForm(
  details: FlightDetailsDraft,
  schedule: FlightLegScheduleDraft,
  titles: { preferred?: string; fallback: string },
): ParsedFlightSegment[] | undefined {
  if (details.legs && details.legs.length >= 2) {
    const fromLegs = segmentsFromStoredLegs(
      details.legs,
      details,
      schedule,
      titles,
    );
    if (fromLegs) return fromLegs;
  }
  const single = segmentFromLegDraft(details, schedule, titles);
  return single ? [single] : undefined;
}

/** Build outbound + return segments from the Add Flight form for submit. */
export function segmentsFromRoundTripForm(input: {
  outboundDetails: FlightDetailsDraft;
  outboundSchedule: FlightLegScheduleDraft;
  outboundTitle?: string;
  returnDetails: FlightDetailsDraft;
  returnSchedule: FlightLegScheduleDraft;
  returnTitle?: string;
}): ParsedFlightSegment[] | undefined {
  const outbound = segmentsFromDirectionForm(
    input.outboundDetails,
    input.outboundSchedule,
    { preferred: input.outboundTitle, fallback: 'Departure flight' },
  );
  const returnLegs = segmentsFromDirectionForm(
    input.returnDetails,
    input.returnSchedule,
    { preferred: input.returnTitle, fallback: 'Returning flight' },
  );
  if (!outbound?.length || !returnLegs?.length) return undefined;
  return [...outbound, ...returnLegs];
}

export function returnFlightTitle(details: FlightDetailsDraft): string {
  return titleForLeg(details, 'Returning flight');
}
