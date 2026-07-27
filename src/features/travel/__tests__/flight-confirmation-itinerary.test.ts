import {
  expandedTripRangeForFlights,
  mergeImportedFlights,
} from '../flight-confirmation-itinerary';
import type { ParsedFlightSegment } from '../flight-confirmation-parser';
import type { TravelItineraryItem } from '../types';

const SEGMENTS: ParsedFlightSegment[] = [
  {
    flight: {
      airline: 'Icelandair',
      flightNumber: 'FI 622',
      confirmationCode: 'AB2ZQV',
      departureAirport: 'IAD',
      arrivalAirport: 'KEF',
      seat: '',
    },
    title: 'Flight IAD → KEF',
    date: '2026-09-08',
    startMinutes: 633,
    durationMinutes: 350,
    detectedFieldCount: 7,
  },
  {
    flight: {
      airline: 'Icelandair',
      flightNumber: 'FI 623',
      confirmationCode: 'AB2ZQV',
      departureAirport: 'KEF',
      arrivalAirport: 'IAD',
      seat: '',
    },
    title: 'Flight KEF → IAD',
    date: '2026-09-13',
    startMinutes: 1020,
    durationMinutes: 375,
    detectedFieldCount: 7,
  },
];

describe('flight confirmation itinerary merge', () => {
  it('updates the selected departure and adds the return flight', () => {
    const current: TravelItineraryItem = {
      id: 'outbound',
      kind: 'flight',
      title: 'Flight DUE → THE',
      date: '2026-09-08',
      startMinutes: 633,
      durationMinutes: 60,
      flight: { departureAirport: 'DUE', arrivalAirport: 'THE' },
    };
    let id = 0;
    const result = mergeImportedFlights({
      itinerary: [current],
      segments: SEGMENTS,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => `new-${++id}`,
      targetItemId: current.id,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'outbound',
      title: 'Flight IAD → KEF',
      durationMinutes: 350,
      flight: { departureAirport: 'IAD', arrivalAirport: 'KEF' },
    });
    expect(result[1]).toMatchObject({
      title: 'Flight KEF → IAD',
      date: '2026-09-13',
      durationMinutes: 375,
      flight: { flightNumber: 'FI 623', departureAirport: 'KEF', arrivalAirport: 'IAD' },
    });
  });

  it('updates matching flights instead of duplicating them', () => {
    const first = mergeImportedFlights({
      itinerary: [],
      segments: SEGMENTS,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => crypto.randomUUID(),
    });
    const second = mergeImportedFlights({
      itinerary: first,
      segments: SEGMENTS,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => 'should-not-be-used',
    });

    expect(second).toHaveLength(2);
  });

  it('expands a stale trip range to contain confirmation dates', () => {
    expect(
      expandedTripRangeForFlights(
        { startDate: '2026-09-08', endDate: '2026-09-13' },
        [
          SEGMENTS[0],
          { ...SEGMENTS[1], date: '2026-09-14' },
        ],
      ),
    ).toEqual({
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
  });
});
