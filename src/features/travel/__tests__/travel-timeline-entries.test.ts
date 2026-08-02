import {
  expandTimelineEntries,
  groupTimelineEntriesByDate,
  timelineEntryCaption,
} from '../travel-timeline-entries';
import type { TravelItineraryItem } from '../types';

const outbound: TravelItineraryItem = {
  id: 'flight-out',
  kind: 'flight',
  title: 'Flight EWR → KEF',
  date: '2026-09-08',
  startMinutes: 20 * 60 + 25,
  durationMinutes: 5 * 60 + 50,
  flight: {
    departureAirport: 'EWR',
    arrivalAirport: 'KEF',
  },
};

const rental: TravelItineraryItem = {
  id: 'rental-1',
  kind: 'rental',
  title: 'Hertz Rental · Keflavik International Airport (KEF)',
  date: '2026-09-09',
  startMinutes: 6 * 60 + 30,
  durationMinutes: 60,
  rental: {
    company: 'Hertz',
    pickupLocation: 'Keflavik International Airport (KEF)',
    dropoffLocation: 'Keflavik International Airport (KEF)',
    dropoffDate: '2026-09-14',
    dropoffMinutes: 15 * 60,
  },
};

const inbound: TravelItineraryItem = {
  id: 'flight-in',
  kind: 'flight',
  title: 'Flight KEF → EWR',
  date: '2026-09-14',
  startMinutes: 17 * 60,
  durationMinutes: 6 * 60 + 15,
  flight: {
    departureAirport: 'KEF',
    arrivalAirport: 'EWR',
  },
};

describe('travel timeline entries', () => {
  it('expands flights and rentals into action markers', () => {
    const entries = expandTimelineEntries([outbound, rental, inbound]);
    expect(entries.map((entry) => entry.title)).toEqual([
      'Board Flight',
      'Land',
      'Pick Up Car',
      'Drop Off Car',
      'Board Flight',
      'Land',
    ]);
    expect(entries.map((entry) => ({ date: entry.date, minutes: entry.startMinutes }))).toEqual([
      { date: '2026-09-08', minutes: 20 * 60 + 25 },
      { date: '2026-09-09', minutes: 6 * 60 + 15 },
      { date: '2026-09-09', minutes: 6 * 60 + 30 },
      { date: '2026-09-14', minutes: 15 * 60 },
      { date: '2026-09-14', minutes: 17 * 60 },
      { date: '2026-09-14', minutes: 19 * 60 + 15 },
    ]);
  });

  it('places land and drop-off on the correct days', () => {
    const days = groupTimelineEntriesByDate(
      expandTimelineEntries([outbound, rental, inbound]),
    );
    expect(days.map((day) => day.date)).toEqual([
      '2026-09-08',
      '2026-09-09',
      '2026-09-14',
    ]);
    expect(days[0].entries.map((e) => e.title)).toEqual(['Board Flight']);
    expect(days[1].entries.map((e) => e.title)).toEqual([
      'Land',
      'Pick Up Car',
    ]);
    expect(days[2].entries.map((e) => e.title)).toEqual([
      'Drop Off Car',
      'Board Flight',
      'Land',
    ]);
  });

  it('formats action captions without the full span', () => {
    const [board, land] = expandTimelineEntries([outbound]);
    expect(timelineEntryCaption(board, 'mdy')).toMatch(/8:25 PM/);
    expect(timelineEntryCaption(board, 'mdy')).toContain('EWR → KEF');
    expect(timelineEntryCaption(land, 'mdy')).toMatch(/6:15 AM/);
    expect(timelineEntryCaption(land, 'mdy')).toContain('KEF');
    expect(timelineEntryCaption(land, 'mdy')).not.toMatch(/8:25 PM/);

    const [pickup, dropoff] = expandTimelineEntries([rental]);
    expect(timelineEntryCaption(pickup, 'mdy')).toMatch(/6:30 AM/);
    expect(timelineEntryCaption(dropoff, 'mdy')).toMatch(/3 PM/);
  });

  it('keeps activities as a single marker with their title', () => {
    const activity: TravelItineraryItem = {
      id: 'act-1',
      kind: 'activity',
      title: 'Blue Lagoon',
      date: '2026-09-10',
      startMinutes: 10 * 60,
      durationMinutes: 120,
    };
    expect(expandTimelineEntries([activity])).toEqual([
      expect.objectContaining({
        key: 'act-1',
        phase: 'default',
        title: 'Blue Lagoon',
      }),
    ]);
  });
});
