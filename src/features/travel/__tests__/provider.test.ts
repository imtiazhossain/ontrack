import {
  googleFlightsSearchUrl,
  isValidFlightLocation,
} from '../provider';

describe('travel comparison links', () => {
  it('passes typed locations, dates, travelers, and currency directly to Google Flights', () => {
    const url = new URL(
      googleFlightsSearchUrl({
        origin: 'Union Square, CA',
        destination: 'Reykjavík, Iceland',
        departureDate: '2026-09-08',
        returnDate: '2026-09-14',
        adults: 2,
        currencyCode: 'usd',
      }),
    );

    expect(`${url.origin}${url.pathname}`).toBe('https://www.google.com/travel/flights');
    expect(url.searchParams.get('q')).toBe(
      'Flights from Union Square, CA to Reykjavík, Iceland from 2026-09-08 through 2026-09-14 for 2 adults',
    );
    expect(url.searchParams.get('curr')).toBe('USD');
    expect(url.searchParams.get('hl')).toBe('en');
  });

  it('accepts city names and airport codes but rejects empty or punctuation-only locations', () => {
    expect(isValidFlightLocation('San Francisco, CA')).toBe(true);
    expect(isValidFlightLocation('KEF')).toBe(true);
    expect(isValidFlightLocation('Reykjavík')).toBe(true);
    expect(isValidFlightLocation('')).toBe(false);
    expect(isValidFlightLocation('---')).toBe(false);
  });

  it('requires 1–9 travelers', () => {
    expect(() =>
      googleFlightsSearchUrl({
        origin: 'New York',
        destination: 'Reykjavík',
        departureDate: '2026-09-08',
        returnDate: '2026-09-14',
        adults: 10,
      }),
    ).toThrow('1–9 travelers');
  });
});
