import { calculateFlightDuration } from './flight-arrival';
import { emptyFlightDetailsDraft } from './flight-details';
import { flightExpenseTitleFromSegments } from './flight-expense-title';
import {
  parseFlightConfirmation,
  type ParsedFlightConfirmation,
  type ParsedFlightSegment,
} from './flight-confirmation-parser';
import { analyzeRedactedFlightConfirmation } from '@/services/travel/flight-confirmation-ai-client';
import {
  flightConfirmationAIMemory,
  type FlightConfirmationAIMemory,
} from '@/services/travel/flight-confirmation-ai-memory';
import type {
  FlightConfirmationAIResult,
  FlightConfirmationAISegment,
} from '@/services/travel/flight-confirmation-ai-types';
import {
  redactFlightConfirmationText,
  type RetainedFlightPrivateFields,
} from '@/services/travel/flight-confirmation-redaction';

function detectedFieldCount(segment: ParsedFlightSegment) {
  return (
    Object.values(segment.flight).filter(Boolean).length +
    (segment.date ? 1 : 0) +
    (segment.startMinutes !== undefined ? 1 : 0) +
    (segment.arrivalDate ? 1 : 0) +
    (segment.arrivalMinutes !== undefined ? 1 : 0) +
    (segment.durationMinutes !== undefined ? 1 : 0)
  );
}

function rebuildConfirmation(
  local: ParsedFlightConfirmation,
  segments: ParsedFlightSegment[],
  itineraryDates = local.itineraryDates,
): ParsedFlightConfirmation {
  const first = segments[0] ?? local;
  const routeTitle = flightExpenseTitleFromSegments(segments);
  return {
    ...local,
    ...first,
    ...(routeTitle ? { title: routeTitle } : {}),
    segments,
    ...(itineraryDates?.length ? { itineraryDates } : {}),
    amount: local.amount,
    currency: local.currency,
    detectedFieldCount:
      segments.reduce((count, segment) => count + detectedFieldCount(segment), 0) +
      (local.amount !== undefined ? 1 : 0),
  };
}

function restorePrivateFields(
  local: ParsedFlightConfirmation,
  retained: RetainedFlightPrivateFields,
) {
  const fallbackConfirmation =
    local.flight.confirmationCode || retained.confirmationCodes[0] || '';
  const segments = local.segments.map((segment, index) => ({
    ...segment,
    flight: {
      ...segment.flight,
      confirmationCode: segment.flight.confirmationCode || fallbackConfirmation,
      seat: segment.flight.seat || retained.seats[index] || '',
    },
  }));
  return rebuildConfirmation(local, segments);
}

export function flightConfirmationNeedsAI(parsed: ParsedFlightConfirmation) {
  return parsed.segments.some(
    (segment) =>
      !segment.flight.departureAirport ||
      !segment.flight.arrivalAirport ||
      !segment.flight.flightNumber ||
      !segment.date ||
      segment.startMinutes === undefined ||
      (segment.durationMinutes === undefined &&
        (segment.arrivalDate === undefined || segment.arrivalMinutes === undefined)),
  );
}

function sameFlight(local: ParsedFlightSegment, ai: FlightConfirmationAISegment) {
  const localNumber = local.flight.flightNumber.replace(/\s/g, '').toUpperCase();
  const aiNumber = ai.flightNumber?.replace(/\s/g, '').toUpperCase();
  if (localNumber && aiNumber) return localNumber === aiNumber;
  return Boolean(
    local.flight.departureAirport &&
      local.flight.arrivalAirport &&
      local.flight.departureAirport === ai.departureAirport &&
      local.flight.arrivalAirport === ai.arrivalAirport,
  );
}

function durationFromAI(ai: FlightConfirmationAISegment) {
  if (ai.durationMinutes !== undefined) return ai.durationMinutes;
  if (
    !ai.departureDate ||
    ai.departureMinutes === undefined ||
    !ai.arrivalDate ||
    ai.arrivalMinutes === undefined
  ) {
    return undefined;
  }
  const duration = calculateFlightDuration({
    departureDate: ai.departureDate,
    departureMinutes: ai.departureMinutes,
    arrivalDate: ai.arrivalDate,
    arrivalMinutes: ai.arrivalMinutes,
    departureAirport: ai.departureAirport,
    arrivalAirport: ai.arrivalAirport,
  });
  return duration > 0 && duration <= 2880 ? duration : undefined;
}

function mergeSegment(
  local: ParsedFlightSegment | undefined,
  ai: FlightConfirmationAISegment,
  confirmationCode: string,
): ParsedFlightSegment {
  const localFlight = local?.flight ?? emptyFlightDetailsDraft();
  const flight = {
    ...localFlight,
    airline: localFlight.airline || ai.airline || '',
    flightNumber: localFlight.flightNumber || ai.flightNumber || '',
    confirmationCode: localFlight.confirmationCode || confirmationCode,
    departureAirport: localFlight.departureAirport || ai.departureAirport || '',
    departureTerminal:
      localFlight.departureTerminal || ai.departureTerminal || '',
    arrivalAirport: localFlight.arrivalAirport || ai.arrivalAirport || '',
    arrivalTerminal: localFlight.arrivalTerminal || ai.arrivalTerminal || '',
  };
  const departureAirport = flight.departureAirport;
  const arrivalAirport = flight.arrivalAirport;
  const next: ParsedFlightSegment = {
    ...local,
    flight,
    ...(departureAirport && arrivalAirport
      ? { title: `Flight ${departureAirport} → ${arrivalAirport}` }
      : {}),
    date: local?.date || ai.departureDate,
    startMinutes: local?.startMinutes ?? ai.departureMinutes,
    arrivalDate: local?.arrivalDate || ai.arrivalDate,
    arrivalMinutes: local?.arrivalMinutes ?? ai.arrivalMinutes,
    durationMinutes: local?.durationMinutes ?? durationFromAI(ai),
    layoverMinutesAfter: local?.layoverMinutesAfter ?? ai.layoverMinutesAfter,
    detectedFieldCount: 0,
  };
  next.detectedFieldCount = detectedFieldCount(next);
  return next;
}

export function mergeFlightConfirmationAI(
  local: ParsedFlightConfirmation,
  ai: FlightConfirmationAIResult,
): ParsedFlightConfirmation {
  const usedLocal = new Set<number>();
  const confirmationCode = local.flight.confirmationCode;
  const segments = ai.segments.map((aiSegment, aiIndex) => {
    let localIndex = local.segments.findIndex(
      (segment, index) => !usedLocal.has(index) && sameFlight(segment, aiSegment),
    );
    if (localIndex < 0 && local.segments[aiIndex] && !usedLocal.has(aiIndex)) {
      localIndex = aiIndex;
    }
    if (localIndex >= 0) usedLocal.add(localIndex);
    return mergeSegment(local.segments[localIndex], aiSegment, confirmationCode);
  });
  local.segments.forEach((segment, index) => {
    if (!usedLocal.has(index)) segments.push(segment);
  });
  const itineraryDates = [
    ...new Set([...(local.itineraryDates ?? []), ...ai.itineraryDates]),
  ];
  return rebuildConfirmation(local, segments, itineraryDates);
}

/** Local parser first; the free AI service only receives privacy-filtered OCR text. */
export async function parseFlightConfirmationWithFallback(
  sourceText: string,
  tripRange?: { startDate: string; endDate: string },
  analyze = analyzeRedactedFlightConfirmation,
  memory: FlightConfirmationAIMemory = flightConfirmationAIMemory,
): Promise<ParsedFlightConfirmation> {
  const privacy = redactFlightConfirmationText(sourceText);
  const local = restorePrivateFields(
    parseFlightConfirmation(sourceText, tripRange),
    privacy.retained,
  );
  if (!flightConfirmationNeedsAI(local)) return local;
  const remembered = await memory.read(privacy.text).catch(() => undefined);
  if (remembered) return mergeFlightConfirmationAI(local, remembered);
  try {
    const ai = await analyze({ redactedText: privacy.text });
    await memory.write(privacy.text, ai).catch(() => undefined);
    return mergeFlightConfirmationAI(local, ai);
  } catch {
    // Offline, unconfigured, and free-tier rate-limit failures keep local import working.
    return local;
  }
}
