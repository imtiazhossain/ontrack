import {
    canAutofillTrivagoStayBooking,
    isTrivagoDealsMyTripsUrl,
    resolveStayBookingOpen,
    trivagoFindBookingInjectScript,
} from '../booking-open';

describe('booking-open', () => {
  const trivagoUrl =
    'https://www.trivago.deals/my-trips/403123/805959a3-19ed-4810-90d3-846bbc1e9f3c?languageCode=EN';

  it('detects trivago my-trips URLs', () => {
    expect(isTrivagoDealsMyTripsUrl(trivagoUrl)).toBe(true);
    expect(isTrivagoDealsMyTripsUrl('https://trivago.deals/my-trips/1/abc')).toBe(
      true,
    );
    expect(isTrivagoDealsMyTripsUrl('https://www.booking.com/hotel/x.html')).toBe(
      false,
    );
    expect(isTrivagoDealsMyTripsUrl('https://www.trivago.deals/faq')).toBe(false);
  });

  it('opens trivago booking links in the browser (inject requires a future WebView)', () => {
    expect(
      resolveStayBookingOpen({
        bookingUrl: trivagoUrl,
        stay: {
          confirmationCode: '13460175',
          reservationEmail: 'alex.rivera@example.com',
        },
      }),
    ).toEqual({ mode: 'browser', url: trivagoUrl });
  });

  it('detects when trivago credentials are available for a future autofill WebView', () => {
    expect(
      canAutofillTrivagoStayBooking(
        {
          bookingUrl: trivagoUrl,
          stay: { confirmationCode: '13460175' },
        },
        { fallbackEmail: 'Host@Example.COM' },
      ),
    ).toBe(true);
    expect(
      canAutofillTrivagoStayBooking({
        bookingUrl: trivagoUrl,
        stay: { confirmationCode: '13460175' },
      }),
    ).toBe(false);
  });

  it('opens non-trivago https booking links in the browser', () => {
    const url = 'https://www.booking.com/confirmation.html';
    expect(
      resolveStayBookingOpen({
        bookingUrl: url,
        stay: {
          confirmationCode: 'ABC123',
          reservationEmail: 'a@b.com',
        },
      }),
    ).toEqual({ mode: 'browser', url });
  });

  it('returns undefined for missing or unsafe urls', () => {
    expect(resolveStayBookingOpen({ bookingUrl: undefined })).toBeUndefined();
    expect(
      resolveStayBookingOpen({ bookingUrl: 'javascript:alert(1)' }),
    ).toBeUndefined();
  });

  it('builds an inject script that embeds credentials safely', () => {
    const script = trivagoFindBookingInjectScript(
      'alex.rivera@example.com',
      '13460175',
    );
    expect(script).toContain('"alex.rivera@example.com"');
    expect(script).toContain('"13460175"');
    expect(script).toContain('find my booking');
    expect(script).toContain('__onTrackTrivagoSubmitted');
  });
});
