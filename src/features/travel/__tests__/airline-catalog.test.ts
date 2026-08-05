import {
  airlineIataCode,
  airlineLogoUrl,
  airlineName,
  CONFIRMATION_AIRLINE_CODES,
  formatFlightNumber,
} from '../airline-catalog';

describe('airline catalog', () => {
  it('resolves the carrier from a stored flight number', () => {
    expect(airlineIataCode({ flightNumber: 'UA 1454' })).toBe('UA');
    expect(airlineIataCode({ flightNumber: 'ua1454' })).toBe('UA');
    expect(airlineIataCode({ flightNumber: 'B6-202' })).toBe('B6');
    expect(airlineIataCode({ flightNumber: '6E 1234' })).toBe('6E');
  });

  it('formats flight numbers with a space between code and digits', () => {
    expect(formatFlightNumber('UA1907')).toBe('UA 1907');
    expect(formatFlightNumber('ua-1907')).toBe('UA 1907');
    expect(formatFlightNumber('UA 1907')).toBe('UA 1907');
    expect(formatFlightNumber('B6-202')).toBe('B6 202');
    expect(formatFlightNumber('  ')).toBeUndefined();
  });

  it('resolves the carrier from an airline name with or without a suffix', () => {
    expect(airlineIataCode({ airline: 'United Airlines' })).toBe('UA');
    expect(airlineIataCode({ airline: 'United' })).toBe('UA');
    expect(airlineIataCode({ airline: 'delta air lines' })).toBe('DL');
    expect(airlineIataCode({ airline: 'Aeroméxico' })).toBe('AM');
    expect(airlineIataCode({ airline: 'Aeromexico' })).toBe('AM');
  });

  it('prefers the flight number over a mismatched airline name', () => {
    expect(
      airlineIataCode({ airline: 'Delta', flightNumber: 'UA 1454' }),
    ).toBe('UA');
  });

  it('returns nothing for unknown carriers so no wrong brand is shown', () => {
    expect(airlineIataCode({})).toBeUndefined();
    expect(airlineIataCode({ airline: 'Rocky Air Charter' })).toBeUndefined();
    expect(airlineIataCode({ flightNumber: 'ZZ 999' })).toBeUndefined();
    expect(airlineIataCode({ flightNumber: '1454' })).toBeUndefined();
  });

  it('names carriers beyond the confirmation-scan list', () => {
    expect(airlineName('UA')).toBe('United Airlines');
    expect(airlineName('sq')).toBe('Singapore Airlines');
    expect(airlineName('ZZ')).toBeUndefined();
  });

  it('keeps confirmation scanning limited to unambiguous codes', () => {
    expect(CONFIRMATION_AIRLINE_CODES).toContain('UA');
    // Codes that collide with prose ("CA 90210", "LA 12") stay out of the scan.
    expect(CONFIRMATION_AIRLINE_CODES).not.toContain('CA');
    expect(CONFIRMATION_AIRLINE_CODES).not.toContain('LA');
  });

  it('builds a clamped square logo url', () => {
    expect(airlineLogoUrl('UA', 144)).toBe(
      'https://pics.avs.io/al_square/144/144/UA.png',
    );
    expect(airlineLogoUrl('ua', 4000)).toBe(
      'https://pics.avs.io/al_square/512/512/UA.png',
    );
  });
});
