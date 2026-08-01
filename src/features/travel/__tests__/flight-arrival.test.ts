import {
  calculateFlightArrival,
  formatFlightItineraryCaption,
  formatFlightLandingLabel,
} from '../flight-arrival';
import { airportTimeZone, normalizeAirportCode } from '../airport-timezones';

describe('airport timezones', () => {
  it('resolves IATA codes and parenthetical codes', () => {
    expect(normalizeAirportCode('ewr')).toBe('EWR');
    expect(normalizeAirportCode('Newark (EWR)')).toBe('EWR');
    expect(airportTimeZone('KEF')).toBe('Atlantic/Reykjavik');
    expect(airportTimeZone('EWR')).toBe('America/New_York');
  });
});

describe('flight arrival', () => {
  it('applies the EWR→KEF timezone shift for Icelandair block time', () => {
    // 8:25 PM EDT Sep 8 + 5h 50m → 6:15 AM next day in Reykjavik (GMT)
    const arrival = calculateFlightArrival({
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      durationMinutes: 5 * 60 + 50,
      departureAirport: 'EWR',
      arrivalAirport: 'KEF',
    });
    expect(arrival).toEqual({
      date: '2026-09-09',
      startMinutes: 6 * 60 + 15,
      dayOffset: 1,
      timeZoneAware: true,
    });
    expect(formatFlightLandingLabel(arrival)).toBe('6:15 AM (+1)');
  });

  it('handles a westward KEF→EWR flight with the opposite timezone shift', () => {
    // 5:00 PM GMT + 6h 15m → 7:15 PM same day EDT (UTC-4 in September)
    const arrival = calculateFlightArrival({
      date: '2026-09-14',
      startMinutes: 17 * 60,
      durationMinutes: 6 * 60 + 15,
      departureAirport: 'KEF',
      arrivalAirport: 'EWR',
    });
    expect(arrival).toEqual({
      date: '2026-09-14',
      startMinutes: 19 * 60 + 15,
      dayOffset: 0,
      timeZoneAware: true,
    });
  });

  it('applies the timezone shift for a later EWR→KEF departure', () => {
    // 5:00 PM EDT Sep 14 + 6h 15m → 3:15 AM next day Reykjavik
    const arrival = calculateFlightArrival({
      date: '2026-09-14',
      startMinutes: 17 * 60,
      durationMinutes: 6 * 60 + 15,
      departureAirport: 'EWR',
      arrivalAirport: 'KEF',
    });
    expect(arrival).toEqual({
      date: '2026-09-15',
      startMinutes: 3 * 60 + 15,
      dayOffset: 1,
      timeZoneAware: true,
    });
  });

  it('falls back to naive duration math when a zone is unknown', () => {
    const arrival = calculateFlightArrival({
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      durationMinutes: 5 * 60 + 50,
      departureAirport: 'EWR',
      arrivalAirport: 'ZZZ',
    });
    expect(arrival).toEqual({
      date: '2026-09-09',
      startMinutes: 2 * 60 + 15,
      dayOffset: 1,
      timeZoneAware: false,
    });
  });

  it('formats the itinerary caption with landing time', () => {
    expect(
      formatFlightItineraryCaption({
        date: '2026-09-08',
        dateLabel: '09/08/2026',
        startMinutes: 20 * 60 + 25,
        durationMinutes: 5 * 60 + 50,
        departureAirport: 'EWR',
        arrivalAirport: 'KEF',
      }),
    ).toBe('09/08/2026 · 8:25 PM → 6:15 AM (+1) · 5h 50m');
  });
});
