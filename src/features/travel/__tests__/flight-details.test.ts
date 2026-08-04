import {
  emptyFlightDetailsDraft,
  flightDetailsDraft,
  formatLayoverDuration,
  normalizeFlightDetails,
  validateFlightDetails,
} from '../flight-details';

describe('travel flight details', () => {
  it('formats a layover as a compact hour and minute duration', () => {
    expect(formatLayoverDuration(99)).toBe('1h 39m');
    expect(
      flightDetailsDraft({ layoverMinutesAfter: 99 }).layoverMinutesAfter,
    ).toBe('1h 39m');
  });

  it('normalizes codes while preserving the airline name', () => {
    expect(
      normalizeFlightDetails({
        airline: ' Icelandair ',
        flightNumber: ' fi 614 ',
        confirmationCode: ' abc123 ',
        departureAirport: ' jfk ',
        arrivalAirport: ' kef ',
        seat: ' 14a ',
      }),
    ).toEqual({
      airline: 'Icelandair',
      flightNumber: 'FI 614',
      confirmationCode: 'ABC123',
      departureAirport: 'JFK',
      arrivalAirport: 'KEF',
      seat: '14A',
    });
  });

  it('keeps durable confirmation file URIs', () => {
    expect(
      normalizeFlightDetails({
        airline: 'Icelandair',
        confirmationUris: [
          'file:///var/mobile/Containers/Data/Application/x/Documents/travel-confirmations/flight/page-1.jpg',
          'https://evil.example/ignore.jpg',
        ],
      }),
    ).toEqual({
      airline: 'Icelandair',
      flightNumber: undefined,
      confirmationCode: undefined,
      departureAirport: undefined,
      arrivalAirport: undefined,
      seat: undefined,
      confirmationUris: [
        'file:///var/mobile/Containers/Data/Application/x/Documents/travel-confirmations/flight/page-1.jpg',
      ],
    });
  });

  it('preserves a recognized layover duration', () => {
    expect(
      normalizeFlightDetails({
        departureAirport: 'gua',
        arrivalAirport: 'iah',
        layoverMinutesAfter: '1h 39m',
      }),
    ).toMatchObject({
      departureAirport: 'GUA',
      arrivalAirport: 'IAH',
      layoverMinutesAfter: 99,
    });
  });

  it('accepts an empty optional flight record', () => {
    expect(validateFlightDetails(emptyFlightDetailsDraft())).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('rejects invalid layover durations', () => {
    expect(
      validateFlightDetails({
        ...emptyFlightDetailsDraft(),
        layoverMinutesAfter: '0',
      }),
    ).toEqual({
      ok: false,
      error: 'Use a layover like 1h 39m, up to 168 hours.',
    });
  });

  it('rejects malformed confirmation codes', () => {
    expect(
      validateFlightDetails({
        ...emptyFlightDetailsDraft(),
        confirmationCode: 'not valid!',
      }),
    ).toEqual({
      ok: false,
      error: 'Confirmation codes must use 3–12 letters, numbers, or hyphens.',
    });
  });
});
