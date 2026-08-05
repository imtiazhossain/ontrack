import type { ImportedFlightConfirmation } from '../flight-confirmation-import';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { emptyFlightDetailsDraft } from '../flight-details';
import { newTripDraftFromFlightConfirmation } from '../new-trip-flight-draft';

function imported(
  segments: ImportedFlightConfirmation['segments'],
): ImportedFlightConfirmation {
  return {
    ...segments[0],
    segments,
    detectedFieldCount: 1,
    fileName: 'itinerary.pdf',
    confirmationUris: [],
  };
}

describe('new-trip flight itinerary draft', () => {
  it('fills a date from Chase screenshot OCR text above the flight numbers', () => {
    const parsed = parseFlightConfirmation(`
      Flight details
      Guatemala City (GUA) → New York (LGA)
      Sun, Sep 27, 2026
      1 Traveler
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
    `);

    expect(newTripDraftFromFlightConfirmation(parsed)).toMatchObject({
      origin: 'GUA',
      destination: 'LGA',
      startDate: '2026-09-27',
      endDate: '2026-09-27',
    });
    expect(parsed.itineraryDates).toEqual(['2026-09-27']);
  });

  it('uses document-level dates when screenshot leg segmentation loses them', () => {
    expect(
      newTripDraftFromFlightConfirmation({
        ...parseFlightConfirmation(`
          Sun, Sep 27, 2O26
          Guatemala City (GUA) → New York (LGA)
          UA 1907
        `),
        segments: [
          {
            flight: {
              ...emptyFlightDetailsDraft(),
              airline: 'United Airlines',
              flightNumber: 'UA 1907',
              confirmationCode: '',
              departureAirport: 'GUA',
              arrivalAirport: 'LGA',
              seat: '',
            },
            detectedFieldCount: 3,
          },
        ],
      }),
    ).toMatchObject({
      startDate: '2026-09-27',
      endDate: '2026-09-27',
    });
  });

  it('parses dates before a trip range exists', () => {
    const parsed = parseFlightConfirmation(`
      OUTBOUND FLIGHT
      Flight UA 150
      Newark (EWR) to Guatemala City (GUA)
      Departure: September 8, 2026 8:35 PM

      RETURN FLIGHT
      Flight UA 151
      Guatemala City (GUA) to Newark (EWR)
      Departure: September 14, 2026 1:10 PM
    `);

    expect(newTripDraftFromFlightConfirmation(parsed)).toMatchObject({
      origin: 'EWR',
      destination: 'GUA',
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
  });

  it('fills a one-way trip from the parsed route and date', () => {
    expect(
      newTripDraftFromFlightConfirmation(
        imported([
          {
            flight: {
              ...emptyFlightDetailsDraft(),
              airline: 'Delta',
              flightNumber: 'DL 1',
              confirmationCode: '',
              departureAirport: 'JFK',
              arrivalAirport: 'GUA',
              seat: '',
            },
            date: '2026-09-08',
            detectedFieldCount: 3,
          },
        ]),
      ),
    ).toEqual({
      origin: 'JFK',
      destination: 'GUA',
      startDate: '2026-09-08',
      endDate: '2026-09-08',
    });
  });

  it('uses the stop before the largest date gap as a round-trip destination', () => {
    const segment = (
      departureAirport: string,
      arrivalAirport: string,
      date: string,
    ) => ({
      flight: {
        ...emptyFlightDetailsDraft(),
        airline: '',
        flightNumber: '',
        confirmationCode: '',
        departureAirport,
        arrivalAirport,
        seat: '',
      },
      date,
      detectedFieldCount: 2,
    });

    expect(
      newTripDraftFromFlightConfirmation(
        imported([
          segment('JFK', 'MIA', '2026-09-08'),
          segment('MIA', 'GUA', '2026-09-08'),
          segment('GUA', 'MIA', '2026-09-14'),
          segment('MIA', 'JFK', '2026-09-14'),
        ]),
      ),
    ).toMatchObject({
      origin: 'JFK',
      destination: 'GUA',
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
  });

  it('never derives a trip name from an uploaded confirmation', () => {
    const draft = newTripDraftFromFlightConfirmation(
      imported([
        {
          flight: {
            ...emptyFlightDetailsDraft(),
            airline: 'Delta',
            flightNumber: 'DL 1',
            confirmationCode: '',
            departureAirport: 'JFK',
            arrivalAirport: 'LGA',
            seat: '',
          },
          date: '2026-09-08',
          detectedFieldCount: 3,
        },
      ]),
    );

    expect(draft).not.toHaveProperty('title');
  });
});
