import {
  expandedTripRangeForFlights,
  mergeImportedFlights,
} from '../flight-confirmation-itinerary';
import {
  parseFlightConfirmation,
  type ParsedFlightSegment,
} from '../flight-confirmation-parser';
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
      flight: {
        flightNumber: 'FI 623',
        departureAirport: 'KEF',
        arrivalAirport: 'IAD',
      },
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
        [SEGMENTS[0], { ...SEGMENTS[1], date: '2026-09-14' }],
      ),
    ).toEqual({
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
  });

  it('persists a layover on the connecting journey', () => {
    const result = mergeImportedFlights({
      itinerary: [],
      segments: [
        {
          ...SEGMENTS[0],
          date: '2026-09-27',
          layoverMinutesAfter: 99,
          flight: {
            ...SEGMENTS[0].flight,
            departureAirport: 'GUA',
            arrivalAirport: 'IAH',
          },
        },
        {
          ...SEGMENTS[1],
          date: '2026-09-27',
          flight: {
            ...SEGMENTS[1].flight,
            departureAirport: 'IAH',
            arrivalAirport: 'LGA',
          },
        },
      ],
      tripRange: { startDate: '2026-09-27', endDate: '2026-09-27' },
      createId: () => crypto.randomUUID(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].flight?.layoverMinutesAfter).toBe(99);
    expect(result[0].flight?.legs).toHaveLength(2);
  });

  it('keeps multi-day outbound and return separate even if a layover sneaks in', () => {
    const result = mergeImportedFlights({
      itinerary: [],
      segments: [{ ...SEGMENTS[0], layoverMinutesAfter: 99 }, SEGMENTS[1]],
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => crypto.randomUUID(),
    });

    expect(result).toHaveLength(2);
    expect(result[0].flight?.arrivalAirport).toBe('KEF');
    expect(result[0].flight?.layoverMinutesAfter).toBe(99);
    expect(result[1].flight?.arrivalAirport).toBe('IAD');
  });

  it('collapses an outbound layover inside a round-trip into the departing journey', () => {
    const result = mergeImportedFlights({
      itinerary: [],
      segments: [
        {
          ...SEGMENTS[0],
          date: '2026-09-08',
          layoverMinutesAfter: 99,
          flight: {
            ...SEGMENTS[0].flight,
            flightNumber: 'UA 1907',
            departureAirport: 'GUA',
            arrivalAirport: 'IAH',
          },
        },
        {
          ...SEGMENTS[0],
          date: '2026-09-08',
          flight: {
            ...SEGMENTS[0].flight,
            flightNumber: 'UA 1697',
            departureAirport: 'IAH',
            arrivalAirport: 'LGA',
          },
        },
        {
          ...SEGMENTS[1],
          date: '2026-09-14',
          flight: {
            ...SEGMENTS[1].flight,
            flightNumber: 'UA 200',
            departureAirport: 'LGA',
            arrivalAirport: 'GUA',
          },
        },
      ],
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-14' },
      createId: () => crypto.randomUUID(),
    });

    expect(result).toHaveLength(2);
    expect(result[0].flight).toMatchObject({
      departureAirport: 'GUA',
      arrivalAirport: 'LGA',
      connectionAirport: 'IAH',
      layoverMinutesAfter: 99,
    });
    expect(result[0].flight?.legs).toHaveLength(2);
    expect(result[1].flight).toMatchObject({
      departureAirport: 'LGA',
      arrivalAirport: 'GUA',
    });
  });

  it('keeps each separately imported flight confirmation on its own item', () => {
    const first = mergeImportedFlights({
      itinerary: [],
      segments: [SEGMENTS[0]],
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => 'outbound',
      confirmationUris: [
        'file:///Documents/travel-confirmations/flight/outbound.png',
      ],
    });
    const result = mergeImportedFlights({
      itinerary: first,
      segments: [SEGMENTS[1]],
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => 'return',
      confirmationUris: [
        'file:///Documents/travel-confirmations/flight/return.png',
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0].flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/outbound.png',
    ]);
    expect(result[1].flight?.confirmationUris).toEqual([
      'file:///Documents/travel-confirmations/flight/return.png',
    ]);
  });

  it('collapses a Chase layover itinerary into one journey with legs', () => {
    const segments = [
      {
        ...SEGMENTS[0],
        title: 'Flight GUA → IAH',
        date: '2026-09-27',
        startMinutes: 90,
        durationMinutes: 171,
        arrivalMinutes: 5 * 60 + 21,
        layoverMinutesAfter: 99,
        flight: {
          airline: 'United Airlines',
          flightNumber: 'UA 1907',
          confirmationCode: '',
          departureAirport: 'GUA',
          arrivalAirport: 'IAH',
          seat: '',
        },
      },
      {
        ...SEGMENTS[1],
        title: 'Flight IAH → LGA',
        date: '2026-09-27',
        startMinutes: 420,
        durationMinutes: 209,
        arrivalMinutes: 11 * 60 + 29,
        flight: {
          airline: 'United Airlines',
          flightNumber: 'UA 1697',
          confirmationCode: '',
          departureAirport: 'IAH',
          arrivalAirport: 'LGA',
          seat: '',
        },
      },
    ];
    const result = mergeImportedFlights({
      itinerary: [],
      segments,
      tripRange: { startDate: '2026-09-27', endDate: '2026-09-28' },
      createId: () => crypto.randomUUID(),
      confirmationUris: [
        'file:///Documents/travel-confirmations/flight/chase.png',
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].durationMinutes).toBe(9 * 60 + 59);
    expect(result[0].flight).toMatchObject({
      departureAirport: 'GUA',
      arrivalAirport: 'LGA',
      layoverMinutesAfter: 99,
      connectionAirport: 'IAH',
      connectionArrivalMinutes: 5 * 60 + 21,
      connectionDepartureMinutes: 7 * 60,
      confirmationUris: [
        'file:///Documents/travel-confirmations/flight/chase.png',
      ],
    });
    expect(result[0].flight?.legs).toHaveLength(2);
    expect(result[0].flight?.legs?.[1]).toMatchObject({
      flightNumber: 'UA 1697',
      departureAirport: 'IAH',
      arrivalAirport: 'LGA',
      departureMinutes: 420,
      arrivalMinutes: 11 * 60 + 29,
    });
  });

  it('uses printed door-to-door total from a parsed Chase confirmation', () => {
    const imported = parseFlightConfirmation(
      `
      Flight details
      Guatemala City (GUA) → New York (LGA)
      Sun, Sep 27, 2026
      1:30 am
      Guatemala City, GT (GUA)
      United Airlines
      UA 1907
      2h 51m
      5:21 am
      Houston, US (IAH)
      1h 39m layover in Houston
      7:00 am
      Houston, US (IAH)
      United Airlines
      UA 1697
      3h 29m
      11:29 am
      New York, US (LGA)
    `,
      { startDate: '2026-09-27', endDate: '2026-09-30' },
    );
    const result = mergeImportedFlights({
      itinerary: [],
      segments: imported.segments,
      tripRange: { startDate: '2026-09-27', endDate: '2026-09-30' },
      createId: () => 'chase',
    });
    expect(result[0].durationMinutes).toBe(9 * 60 + 59);
  });
});
