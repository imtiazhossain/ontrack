import {
  emptyFlightDetailsDraft,
  normalizeFlightDetails,
  validateFlightDetails,
} from '../flight-details';

describe('travel flight details', () => {
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

  it('accepts an empty optional flight record', () => {
    expect(validateFlightDetails(emptyFlightDetailsDraft())).toEqual({
      ok: true,
      value: undefined,
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
