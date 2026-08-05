import * as chrono from 'chrono-node';
import ICAL from 'ical.js';

import { toDateKey } from '@/utils/date';
import { newId } from '@/utils/id';

import type {
    CalendarImportParsingOptions,
    SharedEventDraft,
    SharedEventSource,
} from './types';

const DEFAULT_DURATION_MINUTES = 60;
const MAX_NOTES_LENGTH = 4_000;

function nextDraftId() {
  return newId('shared-event');
}

function cleanText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\u00a0/g, ' ').trim();
}

function notesValue(value: string): string {
  return cleanText(value).slice(0, MAX_NOTES_LENGTH);
}

function firstMeaningfulLine(text: string): string {
  return (
    text
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? 'Shared event'
  );
}

function titleForResult(text: string, index: number, matchedText: string): string {
  const lineStart = text.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
  const nextBreak = text.indexOf('\n', index + matchedText.length);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const line = text.slice(lineStart, lineEnd);
  const withoutDate = line
    .replace(matchedText, ' ')
    .replace(/^[\s:–—-]+|[\s:–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (withoutDate) return withoutDate;

  const preceding = text
    .slice(0, lineStart)
    .split('\n')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
    .pop();
  return preceding ?? firstMeaningfulLine(text);
}

function hasReadableDate(result: chrono.ParsedResult): boolean {
  return (
    result.start.isCertain('day') ||
    result.start.isCertain('month') ||
    result.start.isCertain('year') ||
    result.start.isCertain('weekday')
  );
}

function hasReadableTime(result: chrono.ParsedResult): boolean {
  return result.start.isCertain('hour');
}

function ambiguousNumericDate(text: string): boolean {
  return /(?:^|\D)(0?[1-9]|1[0-2])[/-](0?[1-9]|1[0-2])(?:[/-]\d{2,4})?(?:\D|$)/.test(
    text,
  );
}

function parserForLocale(locale: string | undefined) {
  const normalized = locale?.toLowerCase() ?? '';
  return normalized.startsWith('en-gb') ||
    normalized.startsWith('en-ie') ||
    normalized.startsWith('en-au') ||
    normalized.startsWith('en-nz')
    ? chrono.en.GB
    : chrono.en.casual;
}

function draftBase(
  source: SharedEventSource,
  options: CalendarImportParsingOptions,
): Pick<SharedEventDraft, 'id' | 'source' | 'categoryId'> {
  return {
    id: nextDraftId(),
    source,
    categoryId: options.defaultCategoryId ?? 'appointment',
  };
}

export function parseNaturalLanguageEvents(
  input: string,
  source: Exclude<SharedEventSource, 'ics'> = 'text',
  options: CalendarImportParsingOptions = {},
): SharedEventDraft[] {
  const text = cleanText(input);
  const referenceDate = options.referenceDate ?? new Date();
  const results = parserForLocale(options.locale).parse(text, referenceDate, {
    forwardDate: true,
  });

  if (results.length === 0) {
    return [
      {
        ...draftBase(source, options),
        title: firstMeaningfulLine(text),
        date: '',
        startMinutes: null,
        durationMinutes: DEFAULT_DURATION_MINUTES,
        notes: notesValue(text),
        warnings: ['Choose a date before saving.'],
      },
    ];
  }

  return results.map((result) => {
    const start = result.start.date();
    const readableDate = hasReadableDate(result);
    const readableTime = hasReadableTime(result);
    const end = result.end?.date();
    const parsedDuration =
      readableTime && end && end.valueOf() > start.valueOf()
        ? Math.round((end.valueOf() - start.valueOf()) / 60_000)
        : DEFAULT_DURATION_MINUTES;
    const warnings: string[] = [];
    if (!readableDate) warnings.push('Choose a date before saving.');
    if (!readableTime) warnings.push('Choose a time before saving.');
    if (ambiguousNumericDate(result.text)) {
      warnings.push('Verify this numeric date; it may be locale-dependent.');
    }

    return {
      ...draftBase(source, options),
      title: titleForResult(text, result.index, result.text),
      date: readableDate ? toDateKey(start) : '',
      startMinutes: readableTime ? start.getHours() * 60 + start.getMinutes() : null,
      durationMinutes: Math.max(5, parsedDuration),
      notes: notesValue(text),
      warnings,
    };
  });
}

function stringProperty(component: ICAL.Component, name: string): string {
  const value = component.getFirstPropertyValue(name);
  return typeof value === 'string' ? value.trim() : '';
}

function timeParts(time: ICAL.Time): Date {
  return new Date(time.year, time.month - 1, time.day, time.hour, time.minute, time.second);
}

function dateAndTimeForIcal(
  component: ICAL.Component,
  time: ICAL.Time,
): { date: string; startMinutes: number | null; warning?: string } {
  if (time.isDate) {
    return {
      date: toDateKey(timeParts(time)),
      startMinutes: null,
    };
  }

  const property = component.getFirstProperty('dtstart');
  const timezoneId = property?.getParameter('tzid');
  const hasKnownTimezone =
    typeof timezoneId === 'string' && ICAL.TimezoneService.has(timezoneId);
  const isUtc = time.zone?.tzid === 'UTC';
  const isFloating = !timezoneId || time.zone?.tzid === 'floating';
  const date = isUtc || hasKnownTimezone ? time.toJSDate() : timeParts(time);
  return {
    date: toDateKey(date),
    startMinutes: date.getHours() * 60 + date.getMinutes(),
    warning:
      timezoneId && !hasKnownTimezone && !isUtc && !isFloating
        ? `Verify the time; the ${timezoneId} timezone was not included in this calendar file.`
        : timezoneId && !hasKnownTimezone
          ? `Verify the time; the ${timezoneId} timezone was not included in this calendar file.`
          : undefined,
  };
}

function eventNotes(component: ICAL.Component): string {
  const parts = [
    stringProperty(component, 'description'),
    stringProperty(component, 'location')
      ? `Location: ${stringProperty(component, 'location')}`
      : '',
    stringProperty(component, 'url'),
  ].filter(Boolean);
  return notesValue(parts.join('\n\n'));
}

export function parseIcsEvents(
  input: string,
  options: CalendarImportParsingOptions = {},
): SharedEventDraft[] {
  const root = new ICAL.Component(ICAL.parse(input));
  for (const timezone of root.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(timezone);
    } catch {
      // The event remains editable and receives a timezone warning below.
    }
  }

  const drafts: SharedEventDraft[] = [];
  for (const component of root.getAllSubcomponents('vevent')) {
    if (stringProperty(component, 'status').toUpperCase() === 'CANCELLED') continue;
    const dtstart = component.getFirstProperty('dtstart');
    if (!dtstart) {
      drafts.push({
        ...draftBase('ics', options),
        title: stringProperty(component, 'summary') || 'Calendar event',
        date: '',
        startMinutes: null,
        durationMinutes: DEFAULT_DURATION_MINUTES,
        notes: eventNotes(component),
        warnings: ['Choose a date and time before saving.'],
      });
      continue;
    }

    const event = new ICAL.Event(component);
    const start = event.startDate;
    const parsedStart = dateAndTimeForIcal(component, start);
    let durationMinutes = DEFAULT_DURATION_MINUTES;
    try {
      durationMinutes = Math.max(
        5,
        Math.round(Math.abs(event.duration.toSeconds()) / 60),
      );
    } catch {
      // DTSTART-only events use the normal one-hour default.
    }
    const warnings: string[] = [];
    if (parsedStart.startMinutes === null) warnings.push('Choose a time before saving.');
    if (parsedStart.warning) warnings.push(parsedStart.warning);
    if (event.isRecurring()) {
      warnings.push('Only the first occurrence will be imported; recurrence is not expanded.');
    }

    drafts.push({
      ...draftBase('ics', options),
      title: event.summary?.trim() || 'Calendar event',
      date: parsedStart.date,
      startMinutes: parsedStart.startMinutes,
      durationMinutes,
      notes: eventNotes(component),
      warnings,
    });
  }

  if (drafts.length === 0) {
    throw new Error('This calendar file does not contain any active events.');
  }
  return deduplicateDrafts(drafts);
}

export function deduplicateDrafts(drafts: SharedEventDraft[]): SharedEventDraft[] {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = [
      draft.title.trim().toLocaleLowerCase(),
      draft.date,
      draft.startMinutes ?? 'none',
      draft.durationMinutes,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
