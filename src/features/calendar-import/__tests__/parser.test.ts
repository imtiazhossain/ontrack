import { deduplicateDrafts, parseIcsEvents, parseNaturalLanguageEvents } from '../parser';

const referenceDate = new Date(2026, 6, 28, 12, 0, 0);

describe('shared event text parser', () => {
  it('extracts every dated event with times and ranges', () => {
    const drafts = parseNaturalLanguageEvents(
      'Dentist July 30 at 3pm\nTeam meeting Friday from 10 to 11am',
      'text',
      { referenceDate, locale: 'en-US' },
    );

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      title: 'Dentist',
      date: '2026-07-30',
      startMinutes: 15 * 60,
      durationMinutes: 60,
      categoryId: 'appointment',
    });
    expect(drafts[1]).toMatchObject({
      title: 'Team meeting',
      date: '2026-07-31',
      startMinutes: 10 * 60,
      durationMinutes: 60,
    });
  });

  it('keeps a blank editable date when no date can be read', () => {
    expect(
      parseNaturalLanguageEvents('Call Mom about the appointment', 'text', {
        referenceDate,
      })[0],
    ).toMatchObject({
      title: 'Call Mom about the appointment',
      date: '',
      startMinutes: null,
      warnings: ['Choose a date before saving.'],
    });
  });

  it('requires a time when only a date was present', () => {
    const draft = parseNaturalLanguageEvents('Dentist July 30', 'text', {
      referenceDate,
    })[0];
    expect(draft.date).toBe('2026-07-30');
    expect(draft.startMinutes).toBeNull();
    expect(draft.warnings).toContain('Choose a time before saving.');
  });

  it('flags ambiguous numeric dates for review', () => {
    const draft = parseNaturalLanguageEvents('Appointment 7/8/2026 at 2pm', 'text', {
      referenceDate,
      locale: 'en-US',
    })[0];
    expect(draft.warnings).toContain(
      'Verify this numeric date; it may be locale-dependent.',
    );
  });

  it('uses the device English locale for numeric date ordering', () => {
    const us = parseNaturalLanguageEvents('Appointment 7/8/2026 at 2pm', 'text', {
      referenceDate,
      locale: 'en-US',
    })[0];
    const gb = parseNaturalLanguageEvents('Appointment 7/8/2026 at 2pm', 'text', {
      referenceDate,
      locale: 'en-GB',
    })[0];
    expect(us.date).toBe('2026-07-08');
    expect(gb.date).toBe('2026-08-07');
  });

  it('deduplicates repeated OCR results', () => {
    const parsed = parseNaturalLanguageEvents(
      'Dentist July 30 at 3pm\nDentist July 30 at 3pm',
      'image',
      { referenceDate },
    );
    expect(deduplicateDrafts(parsed)).toHaveLength(1);
  });
});

describe('iCalendar parser', () => {
  it('imports every active VEVENT and preserves duration', () => {
    const drafts = parseIcsEvents(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:one
SUMMARY:Dentist
DTSTART:20260730T150000
DTEND:20260730T163000
LOCATION:Main Street
END:VEVENT
BEGIN:VEVENT
UID:two
SUMMARY:Cancelled meeting
STATUS:CANCELLED
DTSTART:20260731T120000
END:VEVENT
BEGIN:VEVENT
UID:three
SUMMARY:Lunch
DTSTART:20260801T123000
DURATION:PT45M
END:VEVENT
END:VCALENDAR`);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      title: 'Dentist',
      date: '2026-07-30',
      startMinutes: 15 * 60,
      durationMinutes: 90,
    });
    expect(drafts[0].notes).toContain('Location: Main Street');
    expect(drafts[1]).toMatchObject({
      title: 'Lunch',
      date: '2026-08-01',
      startMinutes: 12 * 60 + 30,
      durationMinutes: 45,
    });
  });

  it('requires a time for date-only events', () => {
    const draft = parseIcsEvents(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:one
SUMMARY:Conference
DTSTART;VALUE=DATE:20260802
DTEND;VALUE=DATE:20260803
END:VEVENT
END:VCALENDAR`)[0];

    expect(draft).toMatchObject({
      date: '2026-08-02',
      startMinutes: null,
    });
    expect(draft.warnings).toContain('Choose a time before saving.');
  });

  it('warns without expanding recurring events', () => {
    const draft = parseIcsEvents(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:weekly
SUMMARY:Weekly sync
DTSTART:20260731T100000
RRULE:FREQ=WEEKLY
END:VEVENT
END:VCALENDAR`)[0];

    expect(draft.warnings).toContain(
      'Only the first occurrence will be imported; recurrence is not expanded.',
    );
  });

  it('warns when a referenced timezone definition is missing', () => {
    const draft = parseIcsEvents(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:unknown-zone
SUMMARY:Remote meeting
DTSTART;TZID=Mars/Base:20260731T100000
END:VEVENT
END:VCALENDAR`)[0];

    expect(draft.warnings).toContain(
      'Verify the time; the Mars/Base timezone was not included in this calendar file.',
    );
  });

  it('rejects files without active events', () => {
    expect(() =>
      parseIcsEvents(`BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR`),
    ).toThrow('does not contain any active events');
  });
});
