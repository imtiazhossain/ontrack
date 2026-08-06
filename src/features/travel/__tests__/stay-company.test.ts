import {
  stayBrandDomain,
  stayBrandDomainFromBookingUrl,
  stayBrandDomainFromTitle,
} from '../stay-company';

describe('stayBrandDomainFromBookingUrl', () => {
  it('uses the booking host', () => {
    expect(
      stayBrandDomainFromBookingUrl(
        'https://www.booking.com/hotel/pt/avenida-palace.html',
      ),
    ).toBe('booking.com');
  });

  it('skips redirect / map hosts', () => {
    expect(
      stayBrandDomainFromBookingUrl('https://trivago.deals/abc'),
    ).toBeUndefined();
  });
});

describe('stayBrandDomainFromTitle', () => {
  it('resolves known hotel chains', () => {
    expect(stayBrandDomainFromTitle('Hilton Lisbon')).toBe('hilton.com');
    expect(stayBrandDomainFromTitle('Four Seasons Hotel Ritz')).toBe(
      'fourseasons.com',
    );
  });
});

describe('stayBrandDomain', () => {
  it('prefers the booking URL over the title chain', () => {
    expect(
      stayBrandDomain({
        title: 'Hilton Lisbon',
        bookingUrl: 'https://www.airbnb.com/rooms/1',
      }),
    ).toBe('airbnb.com');
  });

  it('falls back to the title chain when the URL is missing', () => {
    expect(stayBrandDomain({ title: 'Marriott Marquis' })).toBe('marriott.com');
  });
});
