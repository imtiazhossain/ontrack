import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { flightConfirmationSchedule } from '../flight-confirmation-schedule';

describe('flight confirmation editor schedule', () => {
  it('schedules the outbound leg only for a round-trip confirmation', () => {
    const parsed = parseFlightConfirmation(
      `
        OUTBOUND FLIGHT
        Flight FI 622
        Newark (EWR) → Reykjavik (KEF)
        Departure: September 8, 2026 8:25 PM
        Duration: 5h 50m

        RETURN FLIGHT
        Flight FI 623
        Reykjavik (KEF) → Newark (EWR)
        Departure: September 14, 2026 5:00 PM
        Duration: 6h 15m
      `,
      { startDate: '2026-09-08', endDate: '2026-09-14' },
    );

    expect(flightConfirmationSchedule(parsed)).toMatchObject({
      departureDate: '2026-09-08',
      departureMinutes: 20 * 60 + 25,
      arrivalDate: '2026-09-09',
      arrivalMinutes: 6 * 60 + 15,
      durationMinutes: 5 * 60 + 50,
    });
  });

  it('fills departure and final arrival for a connecting Chase screenshot', () => {
    const sourceText = `
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
    `;
    const parsed = parseFlightConfirmation(sourceText);

    expect(flightConfirmationSchedule(parsed)).toEqual({
      departureDate: '2026-09-27',
      departureMinutes: 90,
      arrivalDate: '2026-09-27',
      arrivalMinutes: 11 * 60 + 29,
      durationMinutes: 2 * 60 + 51,
    });

    expect(
      flightConfirmationSchedule(
        parseFlightConfirmation(sourceText, {
          startDate: '2026-08-12',
          endDate: '2026-08-19',
        }),
      ),
    ).toMatchObject({
      departureDate: '2026-09-27',
      arrivalDate: '2026-09-27',
    });
  });

  it('uses a document-level OCR date when the parsed leg has no date', () => {
    const parsed = parseFlightConfirmation('Sun, Sep 27, 2O26\nUA 1907\nGUA → LGA');
    parsed.date = undefined;
    parsed.segments = parsed.segments.map((segment) => ({
      ...segment,
      date: undefined,
    }));

    expect(flightConfirmationSchedule(parsed)).toMatchObject({
      departureDate: '2026-09-27',
      arrivalDate: '2026-09-27',
    });
  });
});
