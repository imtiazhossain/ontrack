import {
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

  it('packages webview open when trivago url + email + confirmation exist', () => {
    expect(
      resolveStayBookingOpen(
        {
          bookingUrl: trivagoUrl,
          stay: {
            confirmationCode: '13460175',
            reservationEmail: 'imtihoss@gmail.com',
          },
        },
      ),
    ).toEqual({
      mode: 'webview',
      url: trivagoUrl,
      email: 'imtihoss@gmail.com',
      bookingNumber: '13460175',
    });
  });

  it('uses fallback email when stay reservation email is missing', () => {
    expect(
      resolveStayBookingOpen(
        {
          bookingUrl: trivagoUrl,
          stay: { confirmationCode: '13460175' },
        },
        { fallbackEmail: 'Host@Example.COM' },
      ),
    ).toEqual({
      mode: 'webview',
      url: trivagoUrl,
      email: 'host@example.com',
      bookingNumber: '13460175',
    });
  });

  it('falls back to browser when credentials are incomplete', () => {
    expect(
      resolveStayBookingOpen({
        bookingUrl: trivagoUrl,
        stay: { confirmationCode: '13460175' },
      }),
    ).toEqual({ mode: 'browser', url: trivagoUrl });

    expect(
      resolveStayBookingOpen({
        bookingUrl: trivagoUrl,
        stay: { reservationEmail: 'a@b.com' },
      }),
    ).toEqual({ mode: 'browser', url: trivagoUrl });
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
      'imtihoss@gmail.com',
      '13460175',
    );
    expect(script).toContain('"imtihoss@gmail.com"');
    expect(script).toContain('"13460175"');
    expect(script).toContain('find my booking');
    expect(script).toContain('__onTrackTrivagoSubmitted');
  });
});
