import { airportCodesForLocation } from '../location-resolver';

describe('flight location resolver', () => {
  it('returns every airport associated with a city', () => {
    expect(
      airportCodesForLocation('New York', [
        { type: 'city', code: 'NYC', name: 'New York' },
        { type: 'airport', code: 'JFK', city_code: 'NYC' },
        { type: 'airport', code: 'EWR', city_code: 'NYC' },
        { type: 'airport', code: 'LGA', city_code: 'NYC' },
      ]),
    ).toEqual(['JFK', 'EWR', 'LGA']);
  });

  it('preserves an explicitly entered airport code', () => {
    expect(
      airportCodesForLocation('JFK', [
        { type: 'city', code: 'NYC', name: 'New York' },
        { type: 'airport', code: 'JFK', city_code: 'NYC' },
      ]),
    ).toEqual(['JFK']);
  });

  it('uses a city code when the city and its only airport share a code', () => {
    expect(
      airportCodesForLocation('Lisbon', [
        { type: 'city', code: 'LIS', name: 'Lisbon' },
      ]),
    ).toEqual(['LIS']);
  });
});
