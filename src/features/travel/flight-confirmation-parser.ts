import { findConfirmationMoney } from './confirmation-money';
import {
  emptyFlightDetailsDraft,
  type FlightDetailsDraft,
} from './flight-details';

export interface ParsedFlightSegment {
  flight: FlightDetailsDraft;
  title?: string;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
  detectedFieldCount: number;
}

export interface ParsedFlightConfirmation extends ParsedFlightSegment {
  segments: ParsedFlightSegment[];
  amount?: number;
  currency?: string;
}

const AIRLINES: Record<string, string> = {
  AA: 'American Airlines',
  AC: 'Air Canada',
  AF: 'Air France',
  AS: 'Alaska Airlines',
  BA: 'British Airways',
  B6: 'JetBlue',
  DL: 'Delta',
  EI: 'Aer Lingus',
  EK: 'Emirates',
  FI: 'Icelandair',
  IB: 'Iberia',
  KL: 'KLM',
  LH: 'Lufthansa',
  NK: 'Spirit',
  QF: 'Qantas',
  QR: 'Qatar Airways',
  SK: 'SAS',
  TK: 'Turkish Airlines',
  TP: 'TAP Air Portugal',
  UA: 'United Airlines',
  VS: 'Virgin Atlantic',
  WN: 'Southwest',
};

const AIRLINE_CODES = Object.keys(AIRLINES).join('|');
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

function findDate(
  text: string,
  minimumDate?: string,
  maximumDate?: string,
): string | undefined {
  const candidates: string[] = [];
  for (const match of text.matchAll(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g)) {
    const value = dateKey(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) candidates.push(value);
  }
  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) {
    const value = dateKey(Number(match[3]), Number(match[1]), Number(match[2]));
    if (value) candidates.push(value);
  }
  const monthNames =
    'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';
  const monthPattern = new RegExp(
    `\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(20\\d{2})\\b`,
    'gi',
  );
  for (const match of text.matchAll(monthPattern)) {
    const parsed = new Date(`${match[1]} ${match[2]}, ${match[3]} 12:00:00 UTC`);
    const value = dateKey(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth() + 1,
      parsed.getUTCDate(),
    );
    if (value) candidates.push(value);
  }
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

function parseMinutes(hourText: string, minuteText: string, suffix?: string): number {
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
  return Boolean(value && /^[A-Z]{3}$/.test(value) && !NON_AIRPORT_CODES.has(value));
}

function findRoute(text: string): { departureAirport: string; arrivalAirport: string } {
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
  if (
    validAirportCode(arrowRoute?.[1]) &&
    validAirportCode(arrowRoute?.[2])
  ) {
    return {
      departureAirport: arrowRoute[1],
      arrivalAirport: arrowRoute[2],
    };
  }

  for (const line of text.split('\n')) {
    const codeRoute =
      /\b([A-Z]{3})\s+(?:TO|-)\s+([A-Z]{3})\b/.exec(line);
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

  const standaloneCodes = Array.from(
    text.matchAll(/^\s*([A-Z]{3})\s*$/gm),
  )
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
  const markers = Array.from(
    text.matchAll(/^\s*(?:depart|return)\s*:/gim),
  );
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
    flight.airline = AIRLINES[flightNumber.code] ?? '';
  }
  const route = findRoute(text);
  flight.departureAirport = route.departureAirport;
  flight.arrivalAirport = route.arrivalAirport;
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
  const segments =
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
  const first = segments[0];
  const money = findConfirmationMoney(text);
  return {
    ...first,
    segments,
    amount: money.amount,
    currency: money.currency,
    detectedFieldCount:
      segments.reduce((count, segment) => count + segment.detectedFieldCount, 0) +
      (money.amount !== undefined ? 1 : 0),
  };
}
