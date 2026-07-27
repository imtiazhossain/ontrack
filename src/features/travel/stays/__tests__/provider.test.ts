import {
  airbnbSearchUrl,
  bookingSearchUrl,
  hostelworldSearchUrl,
  type StaySearchInput,
} from '../provider';

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

  it('pre-populates Hostelworld', () => {
    const params = new URL(hostelworldSearchUrl(input)).searchParams;

    expect(params.get('q')).toBe(input.destination);
    expect(params.get('from')).toBe(input.checkIn);
    expect(params.get('to')).toBe(input.checkOut);
    expect(params.get('guests')).toBe('3');
  });
});
