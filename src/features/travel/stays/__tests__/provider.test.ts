import {
  airbnbSearchUrl,
  bookingSearchUrl,
  googleFaviconLogoUrl,
  hostelworldSearchUrl,
  stayProviderLogoUrl,
  type StaySearchInput,
} from '../provider';
import { cityFromAutocompleteResults } from '../hostelworld-city';

const input: StaySearchInput = {
  destination: 'Lisbon, Portugal',
  checkIn: '2026-09-08',
  checkOut: '2026-09-14',
  guests: 3,
};

describe('stay provider links', () => {
  it('pre-populates Booking.com', () => {
    const params = new URL(bookingSearchUrl(input)).searchParams;

    expect(params.get('ss')).toBe(input.destination);
    expect(params.get('checkin')).toBe(input.checkIn);
    expect(params.get('checkout')).toBe(input.checkOut);
    expect(params.get('group_adults')).toBe('3');
  });

  it('pre-populates Airbnb', () => {
    const url = new URL(airbnbSearchUrl(input));

    expect(decodeURIComponent(url.pathname)).toContain('Lisbon--Portugal');
    expect(url.searchParams.get('checkin')).toBe(input.checkIn);
    expect(url.searchParams.get('checkout')).toBe(input.checkOut);
    expect(url.searchParams.get('adults')).toBe('3');
  });

  it('pre-populates Hostelworld dates on /pwa/s when city is resolved', () => {
    const url = new URL(
      hostelworldSearchUrl(input, {
        id: 725,
        city: 'Lisbon',
        country: 'Portugal',
        label: 'Lisbon, Portugal',
      }),
    );

    expect(url.pathname).toBe('/pwa/s');
    expect(url.searchParams.get('q')).toBe('Lisbon');
    expect(url.searchParams.get('city')).toBe('Lisbon');
    expect(url.searchParams.get('country')).toBe('Portugal');
    expect(url.searchParams.get('type')).toBe('city');
    expect(url.searchParams.get('id')).toBe('725');
    expect(url.searchParams.get('from')).toBe(input.checkIn);
    expect(url.searchParams.get('to')).toBe(input.checkOut);
    expect(url.searchParams.get('guests')).toBe('3');
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('falls back to hostels listing without a resolved city', () => {
    const url = new URL(hostelworldSearchUrl(input));

    expect(url.pathname).toBe('/hostels/');
    expect(url.searchParams.get('q')).toBe(input.destination);
    expect(url.searchParams.get('from')).toBe(input.checkIn);
    expect(url.searchParams.get('to')).toBe(input.checkOut);
    expect(url.searchParams.get('guests')).toBe('3');
  });

  it('maps Hostelworld autocomplete cities for deep links', () => {
    const city = cityFromAutocompleteResults('Lisbon, Portugal', [
      {
        id: 725,
        name: 'Lisbon, Portugal',
        type: 'city',
      },
      {
        id: 1,
        name: 'Some Hostel, Lisbon, Portugal',
        type: 'property',
        city: { id: 725, name: 'Lisbon', country: 'Portugal' },
      },
    ]);

    expect(city).toEqual({
      id: 725,
      city: 'Lisbon',
      country: 'Portugal',
      label: 'Lisbon, Portugal',
    });
  });

  it('prefers first-party brand icons when available', () => {
    expect(stayProviderLogoUrl('booking.com')).toBe('https://unavatar.io/booking.com');
    expect(stayProviderLogoUrl('airbnb.com')).toBe('https://unavatar.io/airbnb.com');
    expect(stayProviderLogoUrl('hostelworld.com')).toBe(
      'https://www.hostelworld.com/hw-icon.svg',
    );
  });

  it('falls back to Google high-res favicons for unknown domains', () => {
    const url = new URL(googleFaviconLogoUrl('example.com', 256));

    expect(url.hostname).toBe('t2.gstatic.com');
    expect(url.pathname).toBe('/faviconV2');
    expect(url.searchParams.get('url')).toBe('https://example.com');
    expect(url.searchParams.get('size')).toBe('256');
  });
});
