import { validateFlightSearch } from '../server';

describe('flight search validation', () => {
  const valid = {
    origin: 'JFK',
    destination: 'KEF',
    departureDate: '2026-09-08',
    returnDate: '2026-09-14',
    adults: 1,
    currencyCode: 'USD',
  };

  it('accepts a bounded round-trip search', () => {
    expect(validateFlightSearch(valid)).toEqual(valid);
  });

  it('rejects invalid dates and traveler counts', () => {
    expect(validateFlightSearch({ ...valid, departureDate: '2026-99-99' })).toBeUndefined();
    expect(validateFlightSearch({ ...valid, adults: 10 })).toBeUndefined();
  });
});
