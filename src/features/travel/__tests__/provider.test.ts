import { googleFlightsSearchUrl } from '../provider';

describe('travel comparison links', () => {
  it('carries the route, dates, and traveler count to Google Flights', () => {
    const url = googleFlightsSearchUrl({
      origin: 'JFK',
      destination: 'KEF',
      departureDate: '2026-09-08',
      returnDate: '2026-09-14',
      adults: 2,
    });

    expect(url).toContain('https://www.google.com/travel/flights?q=');
    expect(decodeURIComponent(url)).toContain(
      'Flights from JFK to KEF departing 2026-09-08 returning 2026-09-14 for 2 adults',
    );
  });
});
