import {
  airportCodesForLocation,
  locationQueryCandidates,
} from '../location-resolver';

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

  it('accepts city names with region or country suffixes', () => {
    expect(
      airportCodesForLocation('San Francisco, CA', [
        { type: 'city', code: 'SFO', name: 'San Francisco' },
      ]),
    ).toEqual(['SFO']);
  });

  it('matches accented city names to unaccented API results', () => {
    expect(
      airportCodesForLocation('Reykjavík, Iceland', [
        { type: 'city', code: 'REK', name: 'Reykjavik' },
        { type: 'airport', code: 'KEF', city_code: 'REK' },
        { type: 'airport', code: 'RKV', city_code: 'REK' },
      ]),
    ).toEqual(['KEF', 'RKV']);
  });

  it('builds lookup candidates from City, Region entries', () => {
    expect(locationQueryCandidates('San Francisco, CA')).toEqual([
      'San Francisco, CA',
      'San Francisco',
    ]);
    expect(locationQueryCandidates('Reykjavík, Iceland')).toEqual([
      'Reykjavík, Iceland',
      'Reykjavík',
    ]);
    expect(locationQueryCandidates('  SFO  ')).toEqual(['SFO']);
  });
});
