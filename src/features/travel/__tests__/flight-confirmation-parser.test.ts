import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { mergeImportedFlights } from '../flight-confirmation-itinerary';

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
    expect(result.flight).toEqual({
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
    expect(result.segments.flatMap((segment) => [
      segment.flight.departureAirport,
      segment.flight.arrivalAirport,
    ])).not.toEqual(expect.arrayContaining(['DUE', 'THE']));
  });

  it('imports both correct legs from the provided Chase PDFKit text', () => {
    const parsed = parseFlightConfirmation(FARHANA_CHASE_PDFKIT_TEXT, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      title: 'Flight EWR → KEF',
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
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
      flight: {
        airline: 'Icelandair',
        flightNumber: 'FI 623',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'KEF',
        arrivalAirport: 'EWR',
        seat: '',
      },
    });

    let nextId = 0;
    const imported = mergeImportedFlights({
      itinerary: [],
      segments: parsed.segments,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-14' },
      createId: () => `flight-${++nextId}`,
    });
    const reimported = mergeImportedFlights({
      itinerary: imported,
      segments: parsed.segments,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-14' },
      createId: () => 'duplicate',
    });

    expect(imported).toHaveLength(2);
    expect(imported).toEqual([
      expect.objectContaining({
        title: 'Flight EWR → KEF',
        date: '2026-09-08',
        startMinutes: 20 * 60 + 25,
      }),
      expect.objectContaining({
        title: 'Flight KEF → EWR',
        date: '2026-09-14',
        startMinutes: 17 * 60,
      }),
    ]);
    expect(reimported).toHaveLength(2);
  });
});
