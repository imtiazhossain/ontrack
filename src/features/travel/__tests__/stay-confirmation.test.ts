import { parseStayConfirmation } from '../stay-confirmation-parser';

const BOOKING_CENTERHOTEL = `
Booking.com Confirmation
Confirmation number: 4521.8832.0199
Hotel: Centerhotel Miðgarður
Address: Laugavegur 120, 105 Reykjavik, Iceland
Check-in: Tuesday 8 September 2026 from 15:00
Check-out: Monday 14 September 2026 until 11:00
https://www.booking.com/hotel/is/centerhotel-midgardur.html
`;

const MARRIOTT_STAY = `
Marriott Bonvoy
Confirmation Number: 8349201756
Hotel Name: Reykjavik Edition
Check-in Date: 09/10/2026
Check-in Time: 4:00 PM
Check-out Date: 09/12/2026
Check-out Time: 12:00 PM
Address: 70 Austurstræti, Reykjavik
`;

/** Real embedded text from trivago DEALS PDF printout (print headers included). */
const TRIVAGO_CENTERHOTEL = `
8/1/26, 11:10 AM Booking: Centerhotel Miðgarður
Your booking is confirmed
Booking number: 13460175
Centerhotel Miðgarður
Laugavegi 120, 105 Reykjavik, Reykjavík, Iceland
Standard Room
Room only
Non-Refundable
Booking details
Booked for Imtiaz Hossain
Check-in Sep 09, 2026
Check-out Sep 14, 2026
Number of nights 5 Nights
Number of rooms 1 Room
https://www.trivago.deals/my-trips/403123/805959a3-19ed-4810-90d3-846bbc1e9f3c?languageCode=EN 1/3

8/1/26, 11:10 AM Booking: Centerhotel Miðgarður
Room 1 2 Adults
Arrival details
Check-in
From 12:00 PM
Check-out
Until 12:00 PM
Special check-in instructions
Minimum check-in age is 21
You may need to show a government-issued ID at check-in.
Price summary 1 room x 5 nights $213.06 average per night per room
https://www.trivago.deals/my-trips/403123/805959a3-19ed-4810-90d3-846bbc1e9f3c?languageCode=EN 2/3
`;

describe('stay confirmation parser', () => {
  it('extracts hotel, confirmation, check-in/out, and booking link', () => {
    const parsed = parseStayConfirmation(BOOKING_CENTERHOTEL, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    expect(parsed.title).toContain('Centerhotel');
    expect(parsed.stay.confirmationCode).toBe('452188320199');
    expect(parsed.date).toBe('2026-09-08');
    expect(parsed.startMinutes).toBe(15 * 60);
    expect(parsed.stay.checkoutDate).toBe('2026-09-14');
    expect(Number(parsed.stay.checkoutMinutes)).toBe(11 * 60);
    expect(parsed.details).toContain('Reykjavik');
    expect(parsed.bookingUrl).toContain('booking.com');
    expect(parsed.detectedFieldCount).toBeGreaterThan(0);
  });

  it('parses Marriott-style labels', () => {
    const parsed = parseStayConfirmation(MARRIOTT_STAY, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    expect(parsed.title).toMatch(/Edition|Reykjavik/i);
    expect(parsed.stay.confirmationCode).toBe('8349201756');
    expect(parsed.date).toBe('2026-09-10');
    expect(parsed.startMinutes).toBe(16 * 60);
    expect(parsed.stay.checkoutDate).toBe('2026-09-12');
    expect(Number(parsed.stay.checkoutMinutes)).toBe(12 * 60);
  });

  it('falls back to hotel name from the confirmation file name', () => {
    const parsed = parseStayConfirmation(
      'Confirmation number: ABC123\nCheck-in: Sep 09, 2026 3:00 PM\nCheck-out: Sep 11, 2026 11:00 AM',
      { startDate: '2026-09-08', endDate: '2026-09-14' },
      { fileName: 'Booking_ Centerhotel Miðgarður.pdf' },
    );
    expect(parsed.title).toContain('Centerhotel');
    expect(parsed.stay.confirmationCode).toBe('ABC123');
  });

  it('parses trivago DEALS PDF text without print-header pollution', () => {
    const parsed = parseStayConfirmation(
      TRIVAGO_CENTERHOTEL,
      { startDate: '2026-09-08', endDate: '2026-09-14' },
      { fileName: 'Booking_ Centerhotel Miðgarður.pdf' },
    );
    expect(parsed.title).toContain('Centerhotel');
    expect(parsed.stay.confirmationCode).toBe('13460175');
    expect(parsed.date).toBe('2026-09-09');
    expect(parsed.stay.checkoutDate).toBe('2026-09-14');
    expect(parsed.startMinutes).toBe(12 * 60);
    expect(Number(parsed.stay.checkoutMinutes)).toBe(12 * 60);
    expect(parsed.details).toMatch(/Laugavegi/i);
    expect(parsed.details).not.toMatch(/AM Booking/i);
    expect(parsed.bookingUrl).toContain('trivago.deals');
  });
});
