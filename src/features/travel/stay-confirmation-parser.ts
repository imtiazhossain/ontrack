import {
  emptyStayDetailsDraft,
  type StayDetailsDraft,
} from './stay-details';

export interface ParsedStayConfirmation {
  stay: StayDetailsDraft;
  title?: string;
  date?: string;
  startMinutes?: number;
  details?: string;
  bookingUrl?: string;
  detectedFieldCount: number;
}

const MONTH_NAMES =
  'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec';

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Line-anchored so "Special check-in instructions" / "checkout page" are ignored. */
const CHECKIN_LABEL =
  /(?:^|\n)\s*check[\s-]?in(?:\s+date|\s+time)?\b(?!\s+(?:instructions|age))/i;
const CHECKOUT_LABEL =
  /(?:^|\n)\s*check[\s-]?out(?:\s+date|\s+time)?\b(?!\s+page)/i;

/** Browser/print headers like "8/1/26, 11:10 AM Booking: …" — not stay times. */
const PRINT_HEADER =
  /\b\d{1,2}\/\d{1,2}\/\d{2,4},\s*\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\b/g;

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

/** Avoid `new Date('Sep 09, 2026')` — Hermes is unreliable with that form. */
function dateKeyFromMonthName(
  monthName: string,
  dayText: string,
  yearText: string,
): string | undefined {
  const month = MONTH_INDEX[monthName.toLowerCase()];
  if (!month) return undefined;
  return dateKey(Number(yearText), month, Number(dayText));
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
    const value = dateKeyFromMonthName(match[1], match[2], match[3]);
    if (value) candidates.push(value);
  }
  // "Monday 8 September 2026" / "8 September 2026"
  const dayMonthPattern = new RegExp(
    `\\b(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})[,]?\\s+(20\\d{2})\\b`,
    'gi',
  );
  for (const match of text.matchAll(dayMonthPattern)) {
    const value = dateKeyFromMonthName(match[2], match[1], match[3]);
    if (value) candidates.push(value);
  }
  if (fallbackYear) {
    const monthDayPattern = new RegExp(
      `\\b(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*,?\\s*20\\d{2})`,
      'gi',
    );
    for (const match of text.matchAll(monthDayPattern)) {
      const value = dateKeyFromMonthName(
        match[1],
        match[2],
        String(fallbackYear),
      );
      if (value) candidates.push(value);
    }
  }
  return candidates;
}

/**
 * Prefer dates on explicit "Check-in …" / "Check-out …" lines (Trivago/Booking).
 */
function findLabeledStayDates(text: string, fallbackYear?: number): {
  checkin?: string;
  checkout?: string;
} {
  const linePattern = new RegExp(
    `check[\\s-]?in(?:\\s+date|\\s+time)?\\s*[:#]?\\s*((?:${MONTH_NAMES})\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+20\\d{2}|\\d{1,2}\\/\\d{1,2}\\/20\\d{2}|20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}|(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\\s*\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})[,]?\\s+20\\d{2})`,
    'i',
  );
  const outPattern = new RegExp(
    `check[\\s-]?out(?:\\s+date|\\s+time)?\\s*[:#]?\\s*((?:${MONTH_NAMES})\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+20\\d{2}|\\d{1,2}\\/\\d{1,2}\\/20\\d{2}|20\\d{2}[-/]\\d{1,2}[-/]\\d{1,2}|(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)?\\s*\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})[,]?\\s+20\\d{2})`,
    'i',
  );
  const checkinMatch = linePattern.exec(text);
  const checkoutMatch = outPattern.exec(text);
  return {
    checkin: checkinMatch
      ? collectDates(checkinMatch[1], fallbackYear)[0]
      : undefined,
    checkout: checkoutMatch
      ? collectDates(checkoutMatch[1], fallbackYear)[0]
      : undefined,
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

/** Times with From/Until/After/Before — hotel policy lines, not print headers. */
function findPrefixedTimes(text: string): number[] {
  const times: number[] = [];
  for (const match of text.matchAll(
    /\b(?:from|until|after|before)\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?\b/gi,
  )) {
    times.push(parseMinutes(match[1], match[2], match[3]));
  }
  return times;
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

/** Collect every Check-in…Check-out (or Check-out…next) slice for times/dates. */
function collectLabeledSections(
  text: string,
  start: RegExp,
  end?: RegExp,
): string[] {
  const sections: string[] = [];
  const flags = start.flags.includes('g') ? start.flags : `${start.flags}g`;
  const globalStart = new RegExp(start.source, flags);
  let match: RegExpExecArray | null;
  while ((match = globalStart.exec(text)) !== null) {
    const from = match.index;
    const afterLabel = text.slice(from + match[0].length);
    if (!end) {
      sections.push(text.slice(from, from + 400));
      continue;
    }
    const endFlags = end.flags.includes('g') ? end.flags : `${end.flags}g`;
    const endMatcher = new RegExp(end.source, endFlags);
    const endMatch = endMatcher.exec(afterLabel);
    if (!endMatch || endMatch.index === undefined) {
      sections.push(text.slice(from, from + 400));
    } else {
      sections.push(text.slice(from, from + match[0].length + endMatch.index));
    }
  }
  return sections;
}

function findConfirmationCode(text: string): string {
  return (
    firstMatch(text, [
      /(?:confirmation\s+(?:number|code|#)|booking\s+(?:number|reference|code)|reservation\s+(?:number|code|#)|pin\s+code)\s*[:#]?\s*([A-Z0-9][A-Z0-9.·-]{2,24})\b/i,
      /\b(?:conf|res)\s*[:#]\s*([A-Z0-9.·-]{5,24})\b/i,
    ])
      ?.replace(/[·.]/g, '')
      .toUpperCase() ?? ''
  );
}

function findHotelName(text: string): string {
  return (
    firstMatch(text, [
      /(?:hotel|property|accommodation|lodging|stay)\s*[:#-]?\s*([^\n]{3,80})/i,
      /\b((?:Centerhotel|Hotel|Hostel|Inn|Resort|Suites?|Apartments?|Guesthouse)\s+[^\n,]{2,60})/i,
      /\b([A-Z][A-Za-z0-9 &'’.-]{2,40}\s+(?:Hotel|Hostel|Inn|Resort|Suites?))\b/,
    ])?.replace(/\s+/g, ' ').trim() ?? ''
  );
}

function looksLikeStreetAddress(value: string): boolean {
  if (/\b(?:AM|PM)\b/i.test(value)) return false;
  if (/booking|confirmation|trivago|expedia|nights?/i.test(value)) return false;
  // "120 Laugavegi…" or "Laugavegi 120, 105 Reykjavik"
  return (
    /\d{1,5}\s+[A-Za-z]/.test(value) ||
    /[A-Za-z].{2,40}\s+\d{1,5}\b/.test(value)
  );
}

function findAddress(text: string): string {
  const labeled = firstMatch(text, [
    /(?:address|location)\s*[:#-]?\s*([^\n]{8,120})/i,
  ]);
  if (labeled && looksLikeStreetAddress(labeled)) {
    return labeled.replace(/\s+/g, ' ').trim();
  }
  // Prefer "Laugavegi 120, 105 Reykjavik…" over a bare postal fragment.
  const streetLine = firstMatch(text, [
    /\b([A-Za-z][A-Za-z0-9 .'-]{2,40}\s+\d{1,5},\s*\d{3,6}\s+[A-Za-z][^\n]{3,60})/,
    /\b(\d{1,5}\s+[A-Za-z][A-Za-z0-9 .,'-]{3,80},\s*\d{3,6}\s+[A-Za-z][^\n]{3,40})/,
    /\b(\d{1,5}\s+[A-Za-z][A-Za-z0-9 .,'-]{3,80}(?:,\s*\d{3,6})?[^\n]{0,40})/,
  ]);
  if (streetLine && looksLikeStreetAddress(streetLine)) {
    return streetLine.replace(/\s+/g, ' ').trim();
  }
  return '';
}

function findBookingUrl(text: string): string {
  return (
    firstMatch(text, [
      /\b(https?:\/\/(?:www\.)?(?:booking\.com|hotels\.com|airbnb\.com|expedia\.com|hilton\.com|marriott\.com|ihg\.com|trivago\.(?:com|deals))[^\s]*)/i,
      /\b(https?:\/\/[^\s]{12,160})/i,
    ]) ?? ''
  );
}

function hotelNameFromFileName(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const base = fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^booking[_\s-]*/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (base.length < 3) return undefined;
  if (/^(confirmation|document|scan|image|screenshot)/i.test(base)) return undefined;
  return base;
}

function pickStayTime(
  prefixed: number[],
  fallback: number[],
): number | undefined {
  if (prefixed.length > 0) return prefixed[0];
  if (fallback.length > 0) return fallback[0];
  return undefined;
}

export function parseStayConfirmation(
  sourceText: string,
  tripRange?: { startDate: string; endDate: string },
  options?: { fileName?: string },
): ParsedStayConfirmation {
  const text = sourceText
    .replace(/\r/g, '\n')
    .replace(PRINT_HEADER, ' ')
    .replace(/[ \t]+/g, ' ');
  const stay = emptyStayDetailsDraft();
  stay.checkoutMinutes = '';
  stay.confirmationCode = findConfirmationCode(text);

  const fallbackYear = tripRange?.startDate
    ? Number(tripRange.startDate.slice(0, 4))
    : undefined;

  const labeledDates = findLabeledStayDates(text, fallbackYear);

  const checkinSections = collectLabeledSections(text, CHECKIN_LABEL, CHECKOUT_LABEL);
  const checkoutSections = collectLabeledSections(text, CHECKOUT_LABEL);
  const checkinSection = checkinSections[0] || sectionBetween(text, CHECKIN_LABEL, CHECKOUT_LABEL);
  const checkoutSection =
    checkoutSections[0] || sectionBetween(text, CHECKOUT_LABEL);

  const checkinDates = [
    ...(labeledDates.checkin ? [labeledDates.checkin] : []),
    ...collectDates(checkinSection || text, fallbackYear),
  ];
  const checkoutDates = [
    ...(labeledDates.checkout ? [labeledDates.checkout] : []),
    ...collectDates(checkoutSection || text, fallbackYear),
  ];
  const allDates = [...new Set(collectDates(text, fallbackYear))].sort();
  const inRange = allDates.filter(
    (value) =>
      (!tripRange?.startDate || value >= tripRange.startDate) &&
      (!tripRange?.endDate || value <= tripRange.endDate),
  );
  const datePool = inRange.length >= 2 ? inRange : allDates;

  let checkinDate =
    labeledDates.checkin ??
    preferDateInRange(checkinDates, tripRange?.startDate, tripRange?.endDate);
  let checkoutDate =
    labeledDates.checkout ??
    preferDateInRange(
      checkoutDates.filter((value) => !checkinDate || value >= checkinDate),
      tripRange?.startDate,
      tripRange?.endDate,
    );
  if (!checkinDate && datePool[0]) checkinDate = datePool[0];
  if (!checkoutDate && datePool.length > 1) {
    checkoutDate = datePool[datePool.length - 1];
  }
  if (checkoutDate) stay.checkoutDate = checkoutDate;

  const checkinPrefixed = checkinSections.flatMap(findPrefixedTimes);
  const checkoutPrefixed = checkoutSections.flatMap(findPrefixedTimes);
  // Global From/Until as last resort (Arrival details block).
  const globalPrefixed = findPrefixedTimes(text);
  const checkinFallback = checkinSections.flatMap(findTimes);
  const checkoutFallback = checkoutSections.flatMap(findTimes);

  const startMinutes = pickStayTime(
    checkinPrefixed.length ? checkinPrefixed : globalPrefixed.slice(0, 1),
    checkinFallback,
  );
  // For checkout, prefer Until/After in checkout sections; if only one global
  // prefixed pair exists, use the second (Until) when check-in took the first.
  const checkoutPrefixedOrGlobal =
    checkoutPrefixed.length > 0
      ? checkoutPrefixed
      : globalPrefixed.length > 1
        ? globalPrefixed.slice(1)
        : globalPrefixed.length === 1 && startMinutes === undefined
          ? globalPrefixed
          : [];
  const checkoutMinutes = pickStayTime(checkoutPrefixedOrGlobal, checkoutFallback);
  if (checkoutMinutes !== undefined) {
    stay.checkoutMinutes = String(checkoutMinutes);
  }

  const fromText = findHotelName(text);
  const fromFile = hotelNameFromFileName(options?.fileName);
  const hotelName =
    (fromFile &&
    /hotel|inn|resort|hostel|suite|apartment|guesthouse|centerhotel/i.test(
      fromFile,
    )
      ? fromFile
      : fromText) ||
    fromFile ||
    fromText ||
    '';
  const address = findAddress(text);
  const bookingUrl = findBookingUrl(text);
  const details = address || undefined;

  const detectedFieldCount =
    (stay.confirmationCode ? 1 : 0) +
    (stay.checkoutDate ? 1 : 0) +
    (checkinDate ? 1 : 0) +
    (startMinutes !== undefined ? 1 : 0) +
    (hotelName ? 1 : 0) +
    (details ? 1 : 0) +
    (bookingUrl ? 1 : 0);

  return {
    stay,
    title: hotelName || undefined,
    date: checkinDate,
    startMinutes,
    details,
    bookingUrl: bookingUrl || undefined,
    detectedFieldCount,
  };
}
