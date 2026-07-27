import { googleFlightsSearchUrl } from '../provider';

describe('travel comparison links', () => {
  it('carries the route, dates, and traveler count to Google Flights', () => {
    const url = googleFlightsSearchUrl({
      origins: ['JFK'],
      destinations: ['KEF'],
      departureDate: '2026-09-08',
      returnDate: '2026-09-14',
      adults: 2,
    });

    expect(url).toContain('https://www.google.com/travel/flights/search?tfs=');
    expect(new URL(url).searchParams.get('hl')).toBe('en');
    expect(new URL(url).searchParams.get('tfs')).toBe(
      'CBwQAhoeEgoyMDI2LTA5LTA4agcIARIDSkZLcgcIARIDS0VGGh4SCjIwMjYtMDktMTRqBwgBEgNLRUZyBwgBEgNKRktAAUABSAFwAYIBCwj___________8BmAEB',
    );
  });

  it('carries every airport resolved for a multi-airport city', () => {
    const url = googleFlightsSearchUrl({
      origins: ['JFK', 'LGA', 'EWR'],
      destinations: ['CDG', 'ORY'],
      departureDate: '2026-09-08',
      returnDate: '2026-09-14',
      adults: 1,
    });
    const payload = Buffer.from(
      new URL(url).searchParams.get('tfs') ?? '',
      'base64url',
    ).toString('latin1');

    expect(payload).toContain('2026-09-08');
    expect(payload).toContain('2026-09-14');
    for (const code of ['JFK', 'LGA', 'EWR', 'CDG', 'ORY']) {
      expect(payload).toContain(code);
    }
  });
});
