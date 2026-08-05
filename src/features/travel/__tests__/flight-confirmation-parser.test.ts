import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { applyImportedFlightsToPlan } from '../apply-imported-flights';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { mergeImportedFlights } from '../flight-confirmation-itinerary';
import type { TravelPlan } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const FARHANA_CHASE_PDFKIT_TEXT = `
Imtiaz Hossain <imtihoss@gmail.com>
FARHANA TASMIN has shared their trip details with you
Chase Travel <donotreply@chasetravel.com>
Mon, Jul 27 at 10:33 AM
Booked on Mon, Jul 27, 2026
Flight $916.46
Tue, Sep 08, 2026 - Mon, Sep 14, 2026
2 travelers
Airline confirmation: AB2ZQV
Newark (EWR) Reykjavik (KEF)
Depart : Tue, Sep 08, 2026 (arrive Wed, Sep 09, 2026)
08:25 pm 06:15 am

EWR KEF
Next day arrival
5h 50m
Icelandair
FI 622 Airbus A321neo
Fare: Economy Light
Not included: Seats, Refund, Exchange
Return : Mon, Sep 14, 2026
05:00 pm
KEF
07:15 pm
EWR
6h 15m
Icelandair
FI 623 Boeing 737 MAX 9
Fare: Economy Light
Not included: Seats, Refund, Exchange
Due to the Real ID requirements, your driver's license or ID card may
not be accepted for travel after certain dates.
`;

describe('flight confirmation parser', () => {
  it('extracts a labeled itinerary without shifting its calendar date', () => {
    expect(
      parseFlightConfirmation(
        `
          Icelandair
          Booking reference: abc123
          Flight FI 614
          From New York (JFK) to Reykjavik (KEF)
          Departure: September 8, 2026 8:35 PM
          Seat: 14a
        `,
        { startDate: '2026-09-08', endDate: '2026-09-13' },
      ),
    ).toMatchObject({
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 614',
        confirmationCode: 'ABC123',
        departureAirport: 'JFK',
        arrivalAirport: 'KEF',
        seat: '14A',
      },
      title: 'Flight JFK → KEF',
      date: '2026-09-08',
      startMinutes: 20 * 60 + 35,
      detectedFieldCount: 8,
      segments: [
        {
          flight: {
            airline: 'Icelandair',
            flightNumber: 'FI 614',
            confirmationCode: 'ABC123',
            departureAirport: 'JFK',
            arrivalAirport: 'KEF',
            seat: '14A',
          },
          title: 'Flight JFK → KEF',
          date: '2026-09-08',
          startMinutes: 20 * 60 + 35,
        },
      ],
    });
  });

  it('extracts compact route and numeric date formats', () => {
    const result = parseFlightConfirmation(
      'Confirmation # Q7W9K2\nDL 246\nATL → LAX\n09/10/2026\nDepart 07:05 AM',
      { startDate: '2026-09-01', endDate: '2026-09-30' },
    );
    expect(result.flight).toMatchObject({
      airline: 'Delta',
      flightNumber: 'DL 246',
      confirmationCode: 'Q7W9K2',
      departureAirport: 'ATL',
      arrivalAirport: 'LAX',
      seat: '',
    });
    expect(result.date).toBe('2026-09-10');
    expect(result.startMinutes).toBe(425);
  });

  it('extracts explicitly labeled departure and arrival terminals', () => {
    const result = parseFlightConfirmation(
      [
        'Flight UA 1907',
        'GUA → IAH',
        'Departure terminal: 2',
        'Arrival terminal: C',
        'September 27, 2026',
        'Depart 1:30 AM',
      ].join('\n'),
      { startDate: '2026-09-27', endDate: '2026-09-27' },
    );

    expect(result.flight).toMatchObject({
      departureAirport: 'GUA',
      departureTerminal: '2',
      arrivalAirport: 'IAH',
      arrivalTerminal: 'C',
    });
  });

  it('ignores unrelated dates outside the trip range', () => {
    expect(
      parseFlightConfirmation(
        'Booked 07/26/2026\nFlight UA 10\nJFK to LHR\nDeparture 09/12/2026',
        { startDate: '2026-09-10', endDate: '2026-09-15' },
      ).date,
    ).toBe('2026-09-12');
  });

  it('extracts outbound and return legs and ignores uppercase prose as airports', () => {
    const result = parseFlightConfirmation(
      `
        Icelandair booking reference AB2ZQV
        Changes are due to the fare rules.

        OUTBOUND FLIGHT
        Flight FI 622
        Washington Dulles (IAD) → Reykjavik (KEF)
        Departure: September 8, 2026 10:33 AM
        Seat selection is available after booking.

        RETURN FLIGHT
        Flight FI 623
        Reykjavik (KEF) → Washington Dulles (IAD)
        Departure: September 13, 2026 5:00 PM
      `,
      { startDate: '2026-09-08', endDate: '2026-09-13' },
    );

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0]).toMatchObject({
      title: 'Flight IAD → KEF',
      date: '2026-09-08',
      startMinutes: 10 * 60 + 33,
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 622',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'IAD',
        arrivalAirport: 'KEF',
        seat: '',
      },
    });
    expect(result.segments[1]).toMatchObject({
      title: 'Flight KEF → IAD',
      date: '2026-09-13',
      startMinutes: 17 * 60,
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 623',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'KEF',
        arrivalAirport: 'IAD',
      },
    });
    expect(
      result.segments.flatMap((segment) => [
        segment.flight.departureAirport,
        segment.flight.arrivalAirport,
      ]),
    ).not.toEqual(expect.arrayContaining(['DUE', 'THE']));
  });

  it('imports both correct legs from the provided Chase PDFKit text', () => {
    const parsed = parseFlightConfirmation(FARHANA_CHASE_PDFKIT_TEXT, {
      startDate: '2026-09-08',
      endDate: '2026-09-13',
    });

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      title: 'Flight EWR → KEF',
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      durationMinutes: 5 * 60 + 50,
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 622',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'EWR',
        arrivalAirport: 'KEF',
        seat: '',
      },
    });
    expect(parsed.segments[1]).toMatchObject({
      title: 'Flight KEF → EWR',
      date: '2026-09-14',
      startMinutes: 17 * 60,
      durationMinutes: 6 * 60 + 15,
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 623',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'KEF',
        arrivalAirport: 'EWR',
        seat: '',
      },
    });
    expect(parsed.amount).toBe(916.46);
    expect(parsed.currency).toBe('USD');
    expect(parsed.title).toBe('Flights EWR ↔ KEF');

    let nextId = 0;
    const imported = mergeImportedFlights({
      itinerary: [],
      segments: parsed.segments,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => `flight-${++nextId}`,
    });
    const reimported = mergeImportedFlights({
      itinerary: imported,
      segments: parsed.segments,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-13' },
      createId: () => 'duplicate',
    });

    expect(imported).toHaveLength(2);
    expect(imported).toEqual([
      expect.objectContaining({
        title: 'Flight EWR → KEF',
        date: '2026-09-08',
        startMinutes: 20 * 60 + 25,
        durationMinutes: 5 * 60 + 50,
      }),
      expect.objectContaining({
        title: 'Flight KEF → EWR',
        date: '2026-09-14',
        startMinutes: 17 * 60,
        durationMinutes: 6 * 60 + 15,
      }),
    ]);
    expect(reimported).toHaveLength(2);
  });

  it('extracts every leg and the connection from a layover itinerary', () => {
    const parsed = parseFlightConfirmation(
      `
        /elsecure.chase.com
        Flight details
        Guatemala City (GUA) → New
        York (LGA)
        Sun, Sep 27, 2026
        1 Traveler
        Sun, Sep 27, 2026
        1:30 am
        Guatemala City, GT (GUA)
        La Aurora International Airport
        United Airlines
        UA 1907
        Boeing 737-800 Passenger
        2h 51m
        Basic Economy._ Economy class (N)
        No pre-reserved seats
        5:21 am
        Houston, US (IAH)
        George Bush Intercontinental Airport
        1h 39m layover in Houston
        7:00 am
        Houston, US (IAH)
        George Bush Intercontinental Airport
        United Airlines
        UA 1697
        Boeing 737 MAX 8
        3h 29m
        Basic Economy.. Economy class (N)
        No pre-reserved seats
        11:29 am
        New York, US (LGA)
        New York LaGuardia Airport
        Baggage Fees
      `,
      { startDate: '2026-09-27', endDate: '2026-09-27' },
    );

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.title).toBe('Flight GUA → LGA');
    expect(parsed.segments[0]).toMatchObject({
      title: 'Flight GUA → IAH',
      date: '2026-09-27',
      startMinutes: 90,
      durationMinutes: 171,
      layoverMinutesAfter: 99,
      flight: {
        airline: 'United Airlines',
        flightNumber: 'UA 1907',
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
      },
    });
    expect(parsed.segments[1]).toMatchObject({
      title: 'Flight IAH → LGA',
      date: '2026-09-27',
      startMinutes: 420,
      durationMinutes: 209,
      flight: {
        airline: 'United Airlines',
        flightNumber: 'UA 1697',
        departureAirport: 'IAH',
        arrivalAirport: 'LGA',
      },
    });
  });

  it('recovers a connecting leg from timed airports when a flight number is missing', () => {
    const parsed = parseFlightConfirmation(
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
        3h 29m
        11:29 am
        New York, US (LGA)
      `,
      { startDate: '2026-09-27', endDate: '2026-09-27' },
    );

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      title: 'Flight GUA → IAH',
      layoverMinutesAfter: 99,
      flight: {
        flightNumber: 'UA 1907',
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
      },
    });
    expect(parsed.segments[1]).toMatchObject({
      title: 'Flight IAH → LGA',
      startMinutes: 420,
      flight: {
        departureAirport: 'IAH',
        arrivalAirport: 'LGA',
      },
    });
  });
});

describe('flight confirmation expense', () => {
  const basePlan = (): TravelPlan => ({
    id: 'trip-1',
    title: 'Iceland',
    destination: 'Iceland',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    itinerary: [],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  });

  it('adds a flight expense for the parsed total', () => {
    const parsed = parseFlightConfirmation(FARHANA_CHASE_PDFKIT_TEXT, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    let nextId = 0;
    const next = applyImportedFlightsToPlan({
      plan: basePlan(),
      imported: parsed,
      createId: () => `flight-${++nextId}`,
    });
    expect(next.itinerary).toHaveLength(2);
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0]).toMatchObject({
      category: 'flight',
      amount: 916.46,
      currency: 'USD',
      notes: 'Confirmation: AB2ZQV',
      title: 'Flights EWR ↔ KEF',
    });
  });

  it('reads the traveler count and per-leg gates', () => {
    const parsed = parseFlightConfirmation(FARHANA_CHASE_PDFKIT_TEXT, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    expect(parsed.segments.map((segment) => segment.flight.passengerCount)).toEqual(
      ['2', '2'],
    );

    const boardingPass = parseFlightConfirmation(`
      United Airlines
      Confirmation: HF7K2Q
      Flight UA 1907
      Guatemala City (GUA) to New York (LGA)
      Departure: September 27, 2026 1:30 AM
      Departure terminal: 1
      Departure gate: 5
      Arrival terminal: B
      Arrival gate: 22
      Passenger: Ada Lovelace
    `);
    expect(boardingPass.flight).toMatchObject({
      departureTerminal: '1',
      departureGate: '5',
      arrivalTerminal: 'B',
      arrivalGate: '22',
      passengerName: 'Ada Lovelace',
    });
  });

  it('updates an existing flight expense when the confirmation matches', () => {
    const parsed = parseFlightConfirmation(FARHANA_CHASE_PDFKIT_TEXT, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    let nextId = 0;
    const first = applyImportedFlightsToPlan({
      plan: basePlan(),
      imported: parsed,
      createId: () => `flight-${++nextId}`,
    });
    const second = applyImportedFlightsToPlan({
      plan: first,
      imported: { ...parsed, amount: 950 },
      createId: () => `flight-${++nextId}`,
    });
    expect(second.expenses).toHaveLength(1);
    expect(second.expenses[0].amount).toBe(950);
    expect(second.expenses[0].id).toBe(first.expenses[0].id);
  });
});
