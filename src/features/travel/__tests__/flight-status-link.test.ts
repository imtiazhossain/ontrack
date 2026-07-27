import { googleFlightStatusUrl } from '../flight-status-link';

describe('Google flight status link', () => {
  it('builds a dated status search from saved flight details', () => {
    expect(
      googleFlightStatusUrl(
        { airline: 'Delta', flightNumber: 'DL 123' },
        '2026-08-03',
      ),
    ).toBe(
      'https://www.google.com/search?q=Delta%20DL%20123%20flight%20status%202026-08-03',
    );
  });

  it('normalizes whitespace and works without an airline or date', () => {
    expect(
      googleFlightStatusUrl({ flightNumber: '  BA   178  ' }),
    ).toBe('https://www.google.com/search?q=BA%20178%20flight%20status');
  });

  it('does not offer a status link without a flight number', () => {
    expect(
      googleFlightStatusUrl({ airline: 'Icelandair' }, '2026-08-03'),
    ).toBeUndefined();
    expect(googleFlightStatusUrl(undefined, '2026-08-03')).toBeUndefined();
  });
});
