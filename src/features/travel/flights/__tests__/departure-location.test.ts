import { formatDepartureAddress } from '../departure-location';

describe('departure location formatting', () => {
  it('uses city and region for North American locations', () => {
    expect(formatDepartureAddress({
      city: 'Brooklyn',
      district: null,
      subregion: null,
      region: 'New York',
      country: 'United States',
      isoCountryCode: 'US',
    })).toBe('Brooklyn, New York');
  });

  it('uses the containing city instead of a neighborhood', () => {
    expect(formatDepartureAddress({
      city: 'San Francisco',
      district: 'Union Square',
      subregion: 'San Francisco County',
      region: 'California',
      country: 'United States',
      isoCountryCode: 'US',
    })).toBe('San Francisco, California');
  });

  it('uses city and country for other locations', () => {
    expect(formatDepartureAddress({
      city: 'Lisbon',
      district: null,
      subregion: null,
      region: 'Lisbon District',
      country: 'Portugal',
      isoCountryCode: 'PT',
    })).toBe('Lisbon, Portugal');
  });

  it('falls back to district and removes duplicate areas', () => {
    expect(formatDepartureAddress({
      city: null,
      district: 'Manhattan',
      subregion: null,
      region: 'Manhattan',
      country: 'United States',
      isoCountryCode: 'US',
    })).toBe('Manhattan');
  });

  it('returns no suggestion without a city-level value', () => {
    expect(formatDepartureAddress({
      city: null,
      district: null,
      subregion: null,
      region: null,
      country: 'United States',
      isoCountryCode: 'US',
    })).toBeUndefined();
  });
});
