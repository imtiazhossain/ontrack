import { airportCodeForCityName } from '../airport-catalog';
import { mergeFlightConfirmationDraftDetails } from '../flight-confirmation-draft';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import {
    findLayoverCityAirportCode,
    repairConnectingSegments,
    resolveConnectingHub,
} from '../flight-connection-hub';
import { emptyFlightDetailsDraft } from '../flight-details';
import { formatFlightTitle } from '../flight-route-label';

describe('flight connection hub', () => {
  it('maps layover city names to known airport codes', () => {
    expect(airportCodeForCityName('Houston')).toBe('IAH');
    expect(findLayoverCityAirportCode('1h 39m layover in Houston')).toBe('IAH');
  });

  it('prefers the second-leg origin when OCR puts the final destination on leg 1 arrival', () => {
    const noisy = repairConnectingSegments(
      [
        {
          detectedFieldCount: 3,
          layoverMinutesAfter: 99,
          flight: {
            ...emptyFlightDetailsDraft(),
            departureAirport: 'GUA',
            arrivalAirport: 'LGA',
            flightNumber: 'UA 1907',
          },
        },
        {
          detectedFieldCount: 3,
          flight: {
            ...emptyFlightDetailsDraft(),
            departureAirport: 'IAH',
            arrivalAirport: 'LGA',
            flightNumber: 'UA 1697',
          },
        },
      ],
      '1h 39m layover in Houston',
    );

    expect(resolveConnectingHub(noisy)).toBe('IAH');
    expect(noisy[0]).toMatchObject({
      layoverMinutesAfter: 99,
      flight: { departureAirport: 'GUA', arrivalAirport: 'IAH' },
    });
    expect(noisy[1].flight).toMatchObject({
      departureAirport: 'IAH',
      arrivalAirport: 'LGA',
    });
  });

  it('recovers IAH from noisy timed OCR that pairs LGA onto the first arrival', () => {
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
        New York, US (LGA)
        1h 39m layover in Houston
        7:00 am
        Houston, US (IAH)
        United Airlines
        UA 1697
        3h 29m
        11:29 am
        New York, US (LGA)
      `,
      { startDate: '2026-09-27', endDate: '2026-09-27' },
    );

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.segments[0]).toMatchObject({
      layoverMinutesAfter: 99,
      flight: {
        departureAirport: 'GUA',
        arrivalAirport: 'IAH',
      },
    });
    expect(parsed.segments[1].flight).toMatchObject({
      departureAirport: 'IAH',
      arrivalAirport: 'LGA',
    });
    const draft = mergeFlightConfirmationDraftDetails(
      emptyFlightDetailsDraft(),
      parsed,
    );
    expect(draft).toMatchObject({
      departureAirport: 'GUA',
      arrivalAirport: 'LGA',
      connectionAirport: 'IAH',
      layoverMinutesAfter: '1h 39m',
    });
    expect(formatFlightTitle(draft)).toBe('Flight GUA → IAH → LGA');
    expect(parsed.title).toBe('Flight GUA → IAH → LGA');
  });

  it('drops layover minutes when no hub distinct from the destination exists', () => {
    const repaired = repairConnectingSegments(
      [
        {
          detectedFieldCount: 2,
          layoverMinutesAfter: 99,
          flight: {
            ...emptyFlightDetailsDraft(),
            departureAirport: 'GUA',
            arrivalAirport: 'LGA',
          },
        },
        {
          detectedFieldCount: 2,
          flight: {
            ...emptyFlightDetailsDraft(),
            departureAirport: 'LGA',
            arrivalAirport: 'LGA',
          },
        },
      ],
      '',
    );

    expect(resolveConnectingHub(repaired)).toBeUndefined();
    expect(repaired[0].layoverMinutesAfter).toBeUndefined();
  });
});
