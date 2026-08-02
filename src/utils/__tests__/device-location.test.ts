import { formatPlaceAddress } from '@/utils/device-location';

describe('device place address formatting', () => {
  it('uses city and region for North American locations', () => {
    expect(formatPlaceAddress({
      city: 'Brooklyn',
      district: null,
      subregion: null,
      region: 'New York',
      country: 'United States',
      isoCountryCode: 'US',
    })).toBe('Brooklyn, New York');
  });

  it('uses city and country for other locations', () => {
    expect(formatPlaceAddress({
      city: 'Lisbon',
      district: null,
      subregion: null,
      region: 'Lisbon District',
      country: 'Portugal',
      isoCountryCode: 'PT',
    })).toBe('Lisbon, Portugal');
  });

  it('falls back to district and removes duplicate areas', () => {
    expect(formatPlaceAddress({
      city: null,
      district: 'Manhattan',
      subregion: null,
      region: 'Manhattan',
      country: 'United States',
      isoCountryCode: 'US',
    })).toBe('Manhattan');
  });

  it('returns no suggestion without a city-level value', () => {
    expect(formatPlaceAddress({
      city: null,
      district: null,
      subregion: null,
      region: null,
      country: 'United States',
      isoCountryCode: 'US',
    })).toBeUndefined();
  });
});
