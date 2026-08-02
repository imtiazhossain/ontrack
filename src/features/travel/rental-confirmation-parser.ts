import { findConfirmationMoney } from './confirmation-money';
import {
  emptyRentalDetailsDraft,
  type RentalDetailsDraft,
} from './rental-details';

export interface ParsedRentalConfirmation {
  rental: RentalDetailsDraft;
  title?: string;
  date?: string;
  startMinutes?: number;
  durationMinutes?: number;
  amount?: number;
  currency?: string;
  detectedFieldCount: number;
}

const RENTAL_COMPANIES = [
  'Enterprise',
  'Hertz',
  'Avis',
  'Budget',
  'National',
  'Alamo',
  'Sixt',
  'Europcar',
  'Thrifty',
  'Dollar',
  'Turo',
  'Payless',
  'Fox Rent A Car',
  'Ace Rent A Car',
  'Keddy',
] as const;

const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';

const PICKUP_LABEL = /pick[\s-]?up|collection|out\s+location/i;
const DROPOFF_LABEL = /drop[\s-]?off|return(?:\s+(?:location|date|time))?|in\s+location/i;

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

function collectDates(text: string, fallbackYear?: number): string[] {
  const candidates: string[] = [];
  for (const match of text.matchAll(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g)) {
    const value = dateKey(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) candidates.push(value);
  }
  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)) {
    const value = dateKey(Number(match[3]), Number(match[1]), Number(match[2]));
    if (value) candidates.push(value);
  }
  const monthPattern = new RegExp(
    `\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(20\\d{2})\\b`,
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
  // Confirmation UIs often omit the year: "Sep 09 | 6:30 am"
  if (fallbackYear) {
    const monthDayPattern = new RegExp(
      `\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*,?\\s*20\\d{2})`,
      'gi',
    );
    for (const match of text.matchAll(monthDayPattern)) {
      const parsed = new Date(
        `${match[1]} ${match[2]}, ${fallbackYear} 12:00:00 UTC`,
      );
      const value = dateKey(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth() + 1,
        parsed.getUTCDate(),
      );
      if (value) candidates.push(value);
    }
  }
  return candidates;
}

/**
 * Compact range line used by Hertz (and similar) confirmations:
 * "Sep 09 | 6:30 am • Sep 14 | 3:00 pm"
 */
function findCompactPickupDropoffRange(
  text: string,
  fallbackYear?: number,
): {
  pickupDate?: string;
  pickupMinutes?: number;
  dropoffDate?: string;
  dropoffMinutes?: number;
} {
  const year = fallbackYear ?? new Date().getUTCFullYear();
  const pattern = new RegExp(
    `\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[|·•]\\s*` +
      `(\\d{1,2}):(\\d{2})\\s*(am|pm)\\s*[|·•]\\s*` +
      `(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*[|·•]\\s*` +
      `(\\d{1,2}):(\\d{2})\\s*(am|pm)\\b`,
    'i',
  );
  const match = pattern.exec(text);
  if (!match) return {};
  const pickupParsed = new Date(`${match[1]} ${match[2]}, ${year} 12:00:00 UTC`);
  const dropoffParsed = new Date(`${match[6]} ${match[7]}, ${year} 12:00:00 UTC`);
  return {
    pickupDate: dateKey(
      pickupParsed.getUTCFullYear(),
      pickupParsed.getUTCMonth() + 1,
      pickupParsed.getUTCDate(),
    ),
    pickupMinutes: parseMinutes(match[3], match[4], match[5]),
    dropoffDate: dateKey(
      dropoffParsed.getUTCFullYear(),
      dropoffParsed.getUTCMonth() + 1,
      dropoffParsed.getUTCDate(),
    ),
    dropoffMinutes: parseMinutes(match[8], match[9], match[10]),
  };
}

function preferDateInRange(
  candidates: string[],
  minimumDate?: string,
  maximumDate?: string,
): string | undefined {
  const withinTrip = candidates.find(
    (value) =>
      (!minimumDate || value >= minimumDate) &&
      (!maximumDate || value <= maximumDate),
  );
  if (withinTrip) return withinTrip;
  return candidates[0];
}

function parseMinutes(hourText: string, minuteText: string, suffix?: string): number {
  let hour = Number(hourText);
  const minute = Number(minuteText);
  const normalized = suffix?.toLowerCase();
  if (normalized === 'pm' && hour < 12) hour += 12;
  if (normalized === 'am' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function findTimes(text: string): number[] {
  const times: number[] = [];
  for (const match of text.matchAll(
    /\b(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/g,
  )) {
    times.push(parseMinutes(match[1], match[2], match[3]));
  }
  for (const match of text.matchAll(/\b(\d{1,2})(\d{2})\s*(AM|PM|am|pm)\b/g)) {
    times.push(parseMinutes(match[1], match[2], match[3]));
  }
  return times;
}

/** Slice from a label to the next opposing label (or ~400 chars). Empty if label missing. */
function sectionBetween(text: string, start: RegExp, end?: RegExp): string {
  const startMatch = start.exec(text);
  if (!startMatch || startMatch.index === undefined) return '';
  const from = startMatch.index;
  const afterLabel = text.slice(from + startMatch[0].length);
  if (!end) return text.slice(from, from + 400);
  const endMatch = end.exec(afterLabel);
  if (!endMatch || endMatch.index === undefined) {
    return text.slice(from, from + 400);
  }
  return text.slice(from, from + startMatch[0].length + endMatch.index);
}

function findCompany(text: string): string {
  for (const company of RENTAL_COMPANIES) {
    if (new RegExp(`\\b${company.replace(/\s+/g, '\\s+')}\\b`, 'i').test(text)) {
      return company;
    }
  }
  return (
    firstMatch(text, [
      /\b((?:[A-Z][A-Za-z&.'’-]+\s+){0,2}(?:Rent[\s-]?A[\s-]?Car|Car\s+Rental|Auto\s+Rental))\b/,
    ]) ?? ''
  );
}

function findConfirmationCode(text: string): string {
  return (
    firstMatch(text, [
      /(?:confirmation(?:\s+(?:number|code|#))?|booking\s+(?:number|reference|code)|reservation(?:\s+(?:number|code|#))?|rental\s+agreement(?:\s+(?:number|#))?)\s*[:#]\s*([A-Z0-9-]{3,20})\b/i,
      /\b(?:conf|res)\s*[:#]\s*([A-Z0-9-]{5,20})\b/i,
    ])?.toUpperCase() ?? ''
  );
}

function findLocation(section: string): string {
  return (
    firstMatch(section, [
      /\b([A-Za-z][A-Za-z0-9 .,'()/-]{3,60}\s+Airport(?:\s*\([A-Z]{3}\))?)/,
      /\(([A-Z]{3})\)/,
      /(?:pick[\s-]?up|drop[\s-]?off|return)\s+(?:location|at)\s*[:#-]?\s*([^\n]{4,80})/i,
    ]) ?? ''
  );
}

function findVehicleClass(text: string): string {
  return (
    firstMatch(text, [
      /(?:vehicle(?:\s+class)?|car\s+type|car\s+group|class)\s*[:#-]?\s*([^\n]{2,40})/i,
      /\b((?:Economy|Compact|Intermediate|Standard|Full[\s-]?Size|Premium|Luxury|SUV|Mini(?:van)?|Pickup|Convertible)(?:\s+[A-Za-z][A-Za-z-]*)?)\b/i,
    ]) ?? ''
  );
}

function rentalDurationMinutes(
  pickupDate: string | undefined,
  pickupMinutes: number | undefined,
  dropoffDate: string | undefined,
  dropoffMinutes: number | undefined,
): number | undefined {
  if (
    pickupDate &&
    dropoffDate &&
    pickupMinutes !== undefined &&
    dropoffMinutes !== undefined &&
    pickupDate === dropoffDate &&
    dropoffMinutes > pickupMinutes
  ) {
    return Math.min(1440, dropoffMinutes - pickupMinutes);
  }
  return undefined;
}

export function parseRentalConfirmation(
  sourceText: string,
  tripRange?: { startDate: string; endDate: string },
): ParsedRentalConfirmation {
  const text = sourceText.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ');
  const rental = emptyRentalDetailsDraft();
  rental.company = findCompany(text);
  rental.confirmationCode = findConfirmationCode(text);
  rental.vehicleClass = findVehicleClass(text).replace(/\s+/g, ' ').trim();

  const fallbackYear = tripRange?.startDate
    ? Number(tripRange.startDate.slice(0, 4))
    : undefined;

  // Prefer compact "Sep 09 | 6:30 am • Sep 14 | 3:00 pm" range lines when present.
  const compactRange = findCompactPickupDropoffRange(text, fallbackYear);

  // Keep pickup/drop-off slices separate so flight times elsewhere don't leak in.
  const pickupSection = sectionBetween(text, PICKUP_LABEL, DROPOFF_LABEL);
  const dropoffSection = sectionBetween(text, DROPOFF_LABEL);
  const locationSource =
    pickupSection || dropoffSection || text.slice(0, 800);

  rental.pickupLocation = findLocation(
    pickupSection || locationSource,
  ).replace(/\s+/g, ' ').trim();
  rental.dropoffLocation = findLocation(
    dropoffSection || locationSource,
  ).replace(/\s+/g, ' ').trim();
  if (!rental.dropoffLocation && rental.pickupLocation) {
    rental.dropoffLocation = rental.pickupLocation;
  }

  const pickupDates = collectDates(pickupSection, fallbackYear);
  const dropoffDates = collectDates(dropoffSection, fallbackYear);
  let pickupDate =
    compactRange.pickupDate ??
    preferDateInRange(
      pickupDates,
      tripRange?.startDate,
      tripRange?.endDate,
    );
  let dropoffDate =
    compactRange.dropoffDate ??
    preferDateInRange(
      dropoffDates.filter((value) => !pickupDate || value >= pickupDate),
      tripRange?.startDate,
      tripRange?.endDate,
    );
  if (dropoffDate) rental.dropoffDate = dropoffDate;

  const pickupTimes = findTimes(pickupSection);
  const dropoffTimes = findTimes(dropoffSection);
  let startMinutes = compactRange.pickupMinutes ?? pickupTimes[0];
  let dropoffMinutes = compactRange.dropoffMinutes ?? dropoffTimes[0];
  if (dropoffMinutes !== undefined) {
    rental.dropoffMinutes = String(dropoffMinutes);
  }

  const money = findConfirmationMoney(text);
  const durationMinutes = rentalDurationMinutes(
    pickupDate,
    startMinutes,
    dropoffDate,
    dropoffMinutes,
  );

  const titleParts = [
    rental.company ? `${rental.company} Rental` : 'Car Rental',
    rental.pickupLocation || undefined,
  ].filter(Boolean);
  const title = titleParts.join(' · ');

  const detectedFieldCount =
    Object.values(rental).filter(Boolean).length +
    (pickupDate ? 1 : 0) +
    (startMinutes !== undefined ? 1 : 0) +
    (money.amount !== undefined ? 1 : 0);

  return {
    rental,
    title,
    date: pickupDate,
    startMinutes,
    durationMinutes,
    amount: money.amount,
    currency: money.currency,
    detectedFieldCount,
  };
}
