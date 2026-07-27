import { googleWeatherUrl } from '../google-weather';

describe('Google weather link', () => {
  it('includes the destination and complete trip range', () => {
    const url = new URL(googleWeatherUrl('Iceland', '2026-09-08', '2026-09-13'));
    expect(url.origin).toBe('https://www.google.com');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('q')).toBe(
      'weather in Iceland from 2026-09-08 to 2026-09-13',
    );
  });

  it('uses a single-date query for a day trip', () => {
    const url = new URL(googleWeatherUrl('Lisbon, Portugal', '2026-08-01', '2026-08-01'));
    expect(url.searchParams.get('q')).toBe(
      'weather in Lisbon, Portugal on 2026-08-01',
    );
  });
});
