import { airlineName, CONFIRMATION_AIRLINE_CODES } from './airline-catalog';
import { findConfirmationMoney } from './confirmation-money';
import { findAircraft, findPassenger } from './flight-confirmation-fields';
import {
  emptyFlightDetailsDraft,
  type FlightDetailsDraft,
} from './flight-details';
import { flightExpenseTitleFromSegments } from './flight-expense-title';
import {
  parseLabeledFlightGate,
  parseLabeledFlightTerminal,
} from './flight-terminal';
import { addDays } from '@/utils/date';

export interface ParsedFlightSegment {
  flight: FlightDetailsDraft;
  title?: string;
  date?: string;
  startMinutes?: number;
  arrivalDate?: string;
  arrivalMinutes?: number;
  durationMinutes?: number;
  layoverMinutesAfter?: number;
  /** Equipment line from the confirmation, e.g. "Boeing 737-800 Passenger". */
  aircraft?: string;
  detectedFieldCount: number;
}

export interface ParsedFlightConfirmation extends ParsedFlightSegment {
  segments: ParsedFlightSegment[];
  /** All likely travel dates recognized anywhere in the confirmation text. */
  itineraryDates?: string[];
  amount?: number;
  currency?: string;
}

const AIRLINE_CODES = CONFIRMATION_AIRLINE_CODES.join('|');
const NON_AIRPORT_CODES = new Set([
  'AND',
  'ARE',
  'DUE',
  'FOR',
  'FROM',
  'HAS',
  'NOT',
  'THE',
  'THIS',
  'TO',
  'TRIP',
  'WAS',
  'WITH',
  'YOU',
  'YOUR',
]);

interface FlightNumberMatch {
  index: number;
  code: string;
  number: string;
}

interface TimedAirportEvent {
  index: number;
  minutes: number;
  airportCode: string;
}

interface OcrToken {
  index: number;
  lineIndex: number;
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function dateKey(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return [
    year.toString().padStart(4, '0'),
    month.toString().padStart(2, '0'),
    day.toString().padStart(2, '0'),
  ].join('-');
}

interface DateCandidate {
  value: string;
  index: number;
}

const MONTH_NUMBER: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function ocrYear(value: string): number {
  const normalized = value.toUpperCase().replaceAll('O', '0');
  return normalized.length === 2 ? 2000 + Number(normalized) : Number(normalized);
}

function findDateCandidates(text: string): DateCandidate[] {
  const candidates: DateCandidate[] = [];
  const push = (value: string | undefined, index: number) => {
    if (value) candidates.push({ value, index });
  };
  for (const match of text.matchAll(
    /\b(2[0O][0-9O]{2})[-/](\d{1,2})[-/](\d{1,2})\b/gi,
  )) {
    push(dateKey(ocrYear(match[1]), Number(match[2]), Number(match[3])), match.index);
  }
  for (const match of text.matchAll(
    /\b(\d{1,2})[/-](\d{1,2})[/-](2[0O][0-9O]{2}|\d{2})\b/gi,
  )) {
    push(dateKey(ocrYear(match[3]), Number(match[1]), Number(match[2])), match.index);
  }
  const monthNames =
    'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
  const monthPattern = new RegExp(
    `\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[,]?\\s*(2[0O][0-9O]{2}|\\d{2})\\b`,
    'gi',
  );
  for (const match of text.matchAll(monthPattern)) {
    push(
      dateKey(
        ocrYear(match[3]),
        MONTH_NUMBER[match[1].slice(0, 3).toLowerCase()],
        Number(match[2]),
      ),
      match.index,
    );
  }
  return candidates.sort((left, right) => left.index - right.index);
}

function likelyItineraryDates(text: string): string[] {
  const seen = new Set<string>();
  return findDateCandidates(text).flatMap((candidate) => {
    const context = text.slice(Math.max(0, candidate.index - 28), candidate.index);
    if (/book(?:ed|ing)?\s*(?:on)?\s*$/i.test(context)) return [];
    if (seen.has(candidate.value)) return [];
    seen.add(candidate.value);
    return [candidate.value];
  });
}

function findDate(
  text: string,
  minimumDate?: string,
  maximumDate?: string,
): string | undefined {
  const candidates = findDateCandidates(text).map((candidate) => candidate.value);
  const dateWithinTrip = candidates.find(
    (value) =>
      (!minimumDate || value >= minimumDate) &&
      (!maximumDate || value <= maximumDate),
  );
  if (dateWithinTrip) return dateWithinTrip;

  if (minimumDate && maximumDate) {
    return candidates
      .map((value, index) => {
        const distance =
          value < minimumDate
            ? Date.parse(`${minimumDate}T00:00:00Z`) -
              Date.parse(`${value}T00:00:00Z`)
            : Date.parse(`${value}T00:00:00Z`) -
              Date.parse(`${maximumDate}T00:00:00Z`);
        return { value, distance, index };
      })
      .sort(
        (left, right) =>
          left.distance - right.distance || left.index - right.index,
      )[0]?.value;
  }

  return candidates[0];
}

function parseMinutes(
  hourText: string,
  minuteText: string,
  suffix?: string,
): number {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (suffix) {
    const normalized = suffix.toUpperCase();
    if (normalized === 'PM' && hour < 12) hour += 12;
    if (normalized === 'AM' && hour === 12) hour = 0;
  }
  return hour * 60 + minute;
}

function findDepartureTime(text: string): number | undefined {
  const labeledBlock =
    /(?:depart(?:ure|s|ing)?|takeoff|return)\s*(?:time)?\s*[:\-]?([\s\S]{0,220})/i.exec(
      text,
    );
  const labeled = labeledBlock
    ? /\b(\d{1,2})[:.](\d{2})\s*(AM|PM)\b/i.exec(labeledBlock[1])
    : undefined;
  if (labeled) return parseMinutes(labeled[1], labeled[2], labeled[3]);
  const generic = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i.exec(text);
  return generic ? parseMinutes(generic[1], generic[2], generic[3]) : undefined;
}

function findDurationMinutes(text: string): number | undefined {
  const iso = /\bPT(?:(\d{1,2})H)?(?:(\d{1,2})M)?\b/i.exec(text);
  if (iso) {
    const duration = Number(iso[1] ?? 0) * 60 + Number(iso[2] ?? 0);
    if (duration > 0 && duration <= 1440) return duration;
  }

  const hoursAndMinutes =
    /\b(\d{1,2})\s*(?:h|hr|hrs|hour|hours)\s*(?:(\d{1,2})\s*(?:m|min|mins|minute|minutes))?\b/i.exec(
      text,
    );
  if (hoursAndMinutes) {
    const duration =
      Number(hoursAndMinutes[1]) * 60 + Number(hoursAndMinutes[2] ?? 0);
    if (duration > 0 && duration <= 1440) return duration;
  }

  const labeledMinutes =
    /\bduration\s*[:\-]?\s*(\d{1,4})\s*(?:m|min|mins|minute|minutes)\b/i.exec(
      text,
    );
  if (labeledMinutes) {
    const duration = Number(labeledMinutes[1]);
    if (duration > 0 && duration <= 1440) return duration;
  }

  return undefined;
}

function validAirportCode(value: string | undefined): value is string {
  return Boolean(
    value && /^[A-Z]{3}$/.test(value) && !NON_AIRPORT_CODES.has(value),
  );
}

function findRoute(text: string): {
  departureAirport: string;
  arrivalAirport: string;
} {
  const parenthesizedRoute =
    /\(([A-Z]{3})\)\s*(?:→|->|–|—|-|\bTO\b)\s*(?:[A-Za-z .'’/&-]{0,80}\s*)?\(([A-Z]{3})\)/i.exec(
      text,
    );
  if (
    validAirportCode(parenthesizedRoute?.[1]?.toUpperCase()) &&
    validAirportCode(parenthesizedRoute?.[2]?.toUpperCase())
  ) {
    return {
      departureAirport: parenthesizedRoute[1].toUpperCase(),
      arrivalAirport: parenthesizedRoute[2].toUpperCase(),
    };
  }

  const arrowRoute = /\b([A-Z]{3})\s*(?:→|->|–|—)\s*([A-Z]{3})\b/.exec(text);
  if (validAirportCode(arrowRoute?.[1]) && validAirportCode(arrowRoute?.[2])) {
    return {
      departureAirport: arrowRoute[1],
      arrivalAirport: arrowRoute[2],
    };
  }

  for (const line of text.split('\n')) {
    const codeRoute = /\b([A-Z]{3})\s+(?:TO|-)\s+([A-Z]{3})\b/.exec(line);
    if (validAirportCode(codeRoute?.[1]) && validAirportCode(codeRoute?.[2])) {
      return {
        departureAirport: codeRoute[1],
        arrivalAirport: codeRoute[2],
      };
    }
  }

  const adjacentCodes = /^\s*([A-Z]{3})\s+([A-Z]{3})\s*$/m.exec(text);
  if (
    validAirportCode(adjacentCodes?.[1]) &&
    validAirportCode(adjacentCodes?.[2])
  ) {
    return {
      departureAirport: adjacentCodes[1],
      arrivalAirport: adjacentCodes[2],
    };
  }

  const standaloneCodes = Array.from(text.matchAll(/^\s*([A-Z]{3})\s*$/gm))
    .map((match) => match[1])
    .filter(validAirportCode);
  if (standaloneCodes.length >= 2) {
    return {
      departureAirport: standaloneCodes[0],
      arrivalAirport: standaloneCodes[1],
    };
  }

  const parenthesizedCodes = Array.from(text.matchAll(/\(([A-Z]{3})\)/g))
    .map((match) => match[1])
    .filter(validAirportCode);
  if (parenthesizedCodes.length >= 2) {
    return {
      departureAirport: parenthesizedCodes[0],
      arrivalAirport: parenthesizedCodes[1],
    };
  }

  return { departureAirport: '', arrivalAirport: '' };
}

function findLabeledLegBlocks(text: string): string[] {
  const markers = Array.from(text.matchAll(/^\s*(?:depart|return)\s*:/gim));
  if (markers.length < 2) return [];
  return markers.map((marker, index) =>
    text.slice(marker.index, markers[index + 1]?.index ?? text.length),
  );
}

function findFlightNumbers(text: string): FlightNumberMatch[] {
  const matches: FlightNumberMatch[] = [];
  const patterns = [
    /flight(?:\s+(?:number|no\.?|#))?\s*[:#-]?\s*([A-Z0-9]{2,3})\s*[- ]?\s*(\d{1,4}[A-Z]?)\b/gi,
    new RegExp(`\\b(${AIRLINE_CODES})\\s*[- ]?\\s*(\\d{1,4}[A-Z]?)\\b`, 'gi'),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      matches.push({
        index: match.index,
        code: match[1].toUpperCase(),
        number: match[2].toUpperCase(),
      });
    }
  }
  const earliestByFlight = new Map<string, FlightNumberMatch>();
  for (const match of matches.sort((left, right) => left.index - right.index)) {
    const key = `${match.code} ${match.number}`;
    if (!earliestByFlight.has(key)) earliestByFlight.set(key, match);
  }
  return Array.from(earliestByFlight.values()).sort(
    (left, right) => left.index - right.index,
  );
}

function findTimedAirportEvents(text: string): TimedAirportEvent[] {
  const lines = Array.from(text.matchAll(/^.*$/gm));
  const times: (OcrToken & { minutes: number })[] = [];
  const airports: (OcrToken & { airportCode: string })[] = [];

  lines.forEach((lineMatch, lineIndex) => {
    for (const match of lineMatch[0].matchAll(
      /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi,
    )) {
      times.push({
        index: lineMatch.index + match.index,
        lineIndex,
        minutes: parseMinutes(match[1], match[2], match[3]),
      });
    }
    for (const match of lineMatch[0].matchAll(/\(([A-Z]{3})\)/gi)) {
      const airportCode = match[1].toUpperCase();
      if (!validAirportCode(airportCode)) continue;
      airports.push({
        index: lineMatch.index + match.index,
        lineIndex,
        airportCode,
      });
    }
  });

  const usedAirports = new Set<number>();
  return times.flatMap((time) => {
    const airport = airports
      .map((candidate, airportIndex) => ({
        ...candidate,
        airportIndex,
        lineDistance: candidate.lineIndex - time.lineIndex,
      }))
      .filter(
        (candidate) =>
          !usedAirports.has(candidate.airportIndex) &&
          Math.abs(candidate.lineDistance) <= 2,
      )
      .sort((left, right) => {
        const leftScore =
          Math.abs(left.lineDistance) + (left.lineDistance < 0 ? 10 : 0);
        const rightScore =
          Math.abs(right.lineDistance) + (right.lineDistance < 0 ? 10 : 0);
        return leftScore - rightScore || left.index - right.index;
      })[0];
    if (!airport) return [];
    usedAirports.add(airport.airportIndex);
    return [
      {
        index: time.index,
        minutes: time.minutes,
        airportCode: airport.airportCode,
      },
    ];
  });
}

function findLayoverMinutes(text: string): number[] {
  return Array.from(
    text.matchAll(
      /\b(?:(\d{1,2})\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d{1,2})\s*(?:m|min|mins|minute|minutes))?\s+layover\b/gi,
    ),
  )
    .map((match) => Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0))
    .filter((minutes) => minutes > 0);
}

function hasConnectingTimedItinerary(
  events: TimedAirportEvent[],
  layovers: number[],
  legCount: number,
): boolean {
  if (legCount < 2 || events.length < legCount * 2) return false;
  if (layovers.length > 0) return true;
  for (let index = 0; index < legCount - 1; index += 1) {
    const arrival = events[index * 2 + 1];
    const nextDeparture = events[index * 2 + 2];
    if (
      arrival &&
      nextDeparture &&
      arrival.airportCode === nextDeparture.airportCode
    ) {
      return true;
    }
  }
  return false;
}

/**
 * When OCR finds timed airports for a layover itinerary but misses a flight
 * number, pad segments so each leg still gets the correct airports/times.
 */
function padSegmentsForTimedLegs(
  segments: ParsedFlightSegment[],
  text: string,
  tripRange: { startDate: string; endDate: string } | undefined,
  legCount: number,
): ParsedFlightSegment[] {
  if (segments.length >= legCount) return segments.slice(0, legCount);
  const flightNumbers = findFlightNumbers(text);
  const confirmationCode = segments[0]?.flight.confirmationCode ?? '';
  const airline = segments[0]?.flight.airline ?? '';
  return Array.from({ length: legCount }, (_, index) => {
    const existing = segments[index];
    if (existing) return existing;
    const flightNumber = flightNumbers[index];
    if (flightNumber) {
      const next = flightNumbers[index + 1];
      return parseSegment(
        text.slice(flightNumber.index, next?.index ?? text.length),
        tripRange,
        confirmationCode,
        flightNumber,
      );
    }
    return {
      flight: {
        ...emptyFlightDetailsDraft(),
        confirmationCode,
        airline,
      },
      detectedFieldCount: 0,
    };
  });
}

function applyTimedAirportItinerary(
  segments: ParsedFlightSegment[],
  text: string,
  tripRange?: { startDate: string; endDate: string },
): ParsedFlightSegment[] {
  const events = findTimedAirportEvents(text);
  const layovers = findLayoverMinutes(text);
  const eventLegs = Math.floor(events.length / 2);
  const connecting = hasConnectingTimedItinerary(events, layovers, eventLegs);
  // Only grow beyond recognized flight numbers when layover/connection evidence exists.
  const targetLegs = connecting
    ? Math.max(segments.length, eventLegs)
    : segments.length;
  if (targetLegs < 2 || events.length < targetLegs * 2) return segments;

  const padded = connecting
    ? padSegmentsForTimedLegs(segments, text, tripRange, targetLegs)
    : segments.slice(0, targetLegs);
  const itineraryEvents = events.slice(0, padded.length * 2);
  const firstDate =
    padded[0]?.date ??
    findDate(text, tripRange?.startDate, tripRange?.endDate);
  let departureDate = firstDate;

  return padded.map((segment, index) => {
    const departure = itineraryEvents[index * 2];
    const arrival = itineraryEvents[index * 2 + 1];
    const nextDeparture = itineraryEvents[index * 2 + 2];
    const directLayover = layovers[index];
    const computedLayover =
      nextDeparture && arrival.airportCode === nextDeparture.airportCode
        ? (nextDeparture.minutes - arrival.minutes + 24 * 60) % (24 * 60)
        : undefined;
    const layoverMinutesAfter = directLayover ?? computedLayover;
    const timedDuration =
      departure && arrival
        ? (arrival.minutes - departure.minutes + 24 * 60) % (24 * 60)
        : undefined;
    const next = {
      ...segment,
      date: departureDate ?? segment.date,
      startMinutes: departure.minutes,
      title: `Flight ${departure.airportCode} → ${arrival.airportCode}`,
      durationMinutes:
        segment.durationMinutes && segment.durationMinutes > 0
          ? segment.durationMinutes
          : timedDuration && timedDuration > 0
            ? timedDuration
            : segment.durationMinutes,
      flight: {
        ...segment.flight,
        departureAirport: departure.airportCode,
        arrivalAirport: arrival.airportCode,
      },
      ...(layoverMinutesAfter ? { layoverMinutesAfter } : {}),
    };
    if (
      departureDate &&
      nextDeparture &&
      nextDeparture.minutes < arrival.minutes
    ) {
      departureDate = addDays(departureDate, 1);
    }
    return next;
  });
}

function parseSegment(
  text: string,
  tripRange: { startDate: string; endDate: string } | undefined,
  confirmationCode: string,
  flightNumber?: FlightNumberMatch,
): ParsedFlightSegment {
  const flight = emptyFlightDetailsDraft();
  flight.confirmationCode = confirmationCode;
  if (flightNumber) {
    flight.flightNumber = `${flightNumber.code} ${flightNumber.number}`;
    flight.airline = airlineName(flightNumber.code) ?? '';
  }
  const route = findRoute(text);
  flight.departureAirport = route.departureAirport;
  flight.departureTerminal = parseLabeledFlightTerminal(text, 'departure');
  flight.departureGate = parseLabeledFlightGate(text, 'departure');
  flight.arrivalAirport = route.arrivalAirport;
  flight.arrivalTerminal = parseLabeledFlightTerminal(text, 'arrival');
  flight.arrivalGate = parseLabeledFlightGate(text, 'arrival');
  flight.seat =
    firstMatch(text, [
      /(?:seat|seat\s+assignment)\s*(?:[:#-]\s*|\n\s*)([A-Z]?\d{1,3}[A-Z]?)\b/i,
    ])?.toUpperCase() ?? '';

  if (!flight.airline) {
    flight.airline =
      firstMatch(text, [
        /\b((?:[A-Z][A-Za-z&.'’-]+\s+){0,3}(?:Airlines|Airways|Air Lines))\b/,
        /\b(Icelandair|Lufthansa|Emirates|JetBlue|Southwest|Qantas|KLM)\b/i,
      ]) ?? '';
  }

  const date = findDate(text, tripRange?.startDate, tripRange?.endDate);
  const startMinutes = findDepartureTime(text);
  const durationMinutes = findDurationMinutes(text);
  const aircraft = findAircraft(text);
  const routeTitle = [flight.departureAirport, flight.arrivalAirport]
    .filter(Boolean)
    .join(' → ');
  const title = routeTitle
    ? `Flight ${routeTitle}`
    : flight.flightNumber
      ? `Flight ${flight.flightNumber}`
      : undefined;
  const detectedFieldCount =
    Object.values(flight).filter(Boolean).length +
    (date ? 1 : 0) +
    (startMinutes !== undefined ? 1 : 0) +
    (durationMinutes !== undefined ? 1 : 0);
  return {
    flight,
    title,
    date,
    startMinutes,
    durationMinutes,
    ...(aircraft ? { aircraft } : {}),
    detectedFieldCount,
  };
}

export function parseFlightConfirmation(
  sourceText: string,
  tripRange?: { startDate: string; endDate: string },
): ParsedFlightConfirmation {
  const text = sourceText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
  const confirmationCode =
    firstMatch(text, [
      /(?:airline\s+)?confirmation(?:\s+(?:code|number|#))?\s*[:#-]?\s*([A-Z0-9-]{3,12})\b/i,
      /booking\s+(?:reference|code|number)\s*[:#-]?\s*([A-Z0-9-]{3,12})\b/i,
      /(?:record\s+locator|reservation\s+(?:code|number))\s*[:#-]?\s*([A-Z0-9-]{3,12})\b/i,
    ])?.toUpperCase() ?? '';
  const flightNumbers = findFlightNumbers(text);
  const labeledSegments = findLabeledLegBlocks(text).flatMap((block) => {
    const blockFlight = findFlightNumbers(block)[0];
    return blockFlight
      ? [parseSegment(block, tripRange, confirmationCode, blockFlight)]
      : [];
  });
  const parsedSegments =
    labeledSegments.length >= 2
      ? labeledSegments
      : flightNumbers.length > 0
        ? flightNumbers.map((flightNumber, index) => {
            const next = flightNumbers[index + 1];
            const start = index === 0 ? 0 : flightNumber.index;
            const end = next?.index ?? text.length;
            return parseSegment(
              text.slice(start, end),
              tripRange,
              confirmationCode,
              flightNumber,
            );
          })
        : [parseSegment(text, tripRange, confirmationCode)];
  const passenger = findPassenger(text);
  const segments = applyTimedAirportItinerary(
    parsedSegments,
    text,
    tripRange,
  ).map((segment) => ({
    ...segment,
    flight: { ...segment.flight, ...passenger },
  }));
  const itineraryDates = likelyItineraryDates(text);
  const first = segments[0];
  const money = findConfirmationMoney(text);
  const routeTitle = flightExpenseTitleFromSegments(segments);
  return {
    ...first,
    ...(routeTitle ? { title: routeTitle } : {}),
    segments,
    ...(itineraryDates.length ? { itineraryDates } : {}),
    amount: money.amount,
    currency: money.currency,
    detectedFieldCount:
      segments.reduce(
        (count, segment) => count + segment.detectedFieldCount,
        0,
      ) + (money.amount !== undefined ? 1 : 0),
  };
}
