import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  mergeFlightConfirmationAI,
  parseFlightConfirmationWithFallback,
} from '../flight-confirmation-enrichment';
import { parseFlightConfirmation } from '../flight-confirmation-parser';
import { redactFlightConfirmationText } from '@/services/travel/flight-confirmation-redaction';
import type { FlightConfirmationAIResult } from '@/services/travel/flight-confirmation-ai-types';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('private flight confirmation fallback', () => {
  const noMemory = {
    read: async () => undefined,
    write: async () => undefined,
  };
  const source = `
    Passenger name: Jordan Lee
    Alex Rivera <alex.rivera@example.com>
    Phone: +1 (212) 555-0198
    Airline confirmation: AB2ZQV
    E-ticket number: 016-1234567890
    Frequent flyer number: UA1234567
    Seat: 14A
    United Airlines UA 1907
    Guatemala City (GUA) to New York (LGA)
    Depart September 27, 2026 at 1:30 AM
  `;

  it('removes identity and booking secrets while retaining editor values locally', () => {
    const privacy = redactFlightConfirmationText(source);

    expect(privacy.text).not.toContain('Jordan Lee');
    expect(privacy.text).not.toContain('alex.rivera@example.com');
    expect(privacy.text).not.toContain('212) 555-0198');
    expect(privacy.text).not.toContain('AB2ZQV');
    expect(privacy.text).not.toContain('016-1234567890');
    expect(privacy.text).not.toContain('UA1234567');
    expect(privacy.text).not.toContain('14A');
    expect(privacy.text).toContain('UA 1907');
    expect(privacy.text).toContain('(GUA) to New York (LGA)');
    expect(privacy.retained).toEqual({
      confirmationCodes: ['AB2ZQV'],
      seats: ['14A'],
    });
  });

  it('redacts unlabelled passenger names above flight chrome and passport numbers', () => {
    const privacy = redactFlightConfirmationText(`
John Doe
Flight UA 123
Passport number: X1234567
Depart September 27, 2026 at 1:30 AM
`);
    expect(privacy.text).not.toContain('John Doe');
    expect(privacy.text).not.toContain('X1234567');
    expect(privacy.text).toContain('[REDACTED_NAME]');
    expect(privacy.text).toContain('[REDACTED_PASSPORT]');
    expect(privacy.text).toContain('Flight UA 123');
  });

  it('sends only redacted OCR text and restores confirmation and seat in the draft', async () => {
    const analyze = jest.fn(async ({ redactedText }: { redactedText: string }) => {
      expect(redactedText).not.toContain('Jordan Lee');
      expect(redactedText).not.toContain('AB2ZQV');
      expect(redactedText).not.toContain('14A');
      return {
        itineraryDates: ['2026-09-27'],
        segments: [
          {
            airline: 'United Airlines',
            flightNumber: 'UA 1907',
            departureAirport: 'GUA',
            arrivalAirport: 'LGA',
            departureDate: '2026-09-27',
            departureMinutes: 90,
            arrivalDate: '2026-09-27',
            arrivalMinutes: 689,
            confidence: 0.96,
          },
        ],
      };
    });

    const parsed = await parseFlightConfirmationWithFallback(
      source,
      undefined,
      analyze,
      noMemory,
    );

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(parsed).toMatchObject({
      date: '2026-09-27',
      startMinutes: 90,
      arrivalDate: '2026-09-27',
      arrivalMinutes: 689,
      flight: {
        airline: 'United Airlines',
        flightNumber: 'UA 1907',
        confirmationCode: 'AB2ZQV',
        departureAirport: 'GUA',
        arrivalAirport: 'LGA',
        seat: '14A',
      },
    });
  });

  it('fills missing AI fields without overwriting locally parsed private values', () => {
    const local = parseFlightConfirmation(
      'Booking reference: K7P2ZX\nSeat: 8C\nFlight UA 1907',
    );
    const merged = mergeFlightConfirmationAI(local, {
      itineraryDates: ['2026-09-27'],
      segments: [
        {
          airline: 'United Airlines',
          flightNumber: 'UA 1907',
          departureAirport: 'GUA',
          arrivalAirport: 'IAH',
          departureDate: '2026-09-27',
          departureMinutes: 90,
          arrivalDate: '2026-09-27',
          arrivalMinutes: 321,
          durationMinutes: 171,
          confidence: 0.98,
        },
      ],
    });

    expect(merged.flight).toMatchObject({
      confirmationCode: 'K7P2ZX',
      seat: '8C',
      departureAirport: 'GUA',
      arrivalAirport: 'IAH',
    });
    expect(merged.date).toBe('2026-09-27');
    expect(merged.arrivalMinutes).toBe(321);
  });

  it('keeps the local result when the free service is unavailable', async () => {
    const parsed = await parseFlightConfirmationWithFallback(
      source,
      undefined,
      async () => {
        throw new Error('RATE_LIMITED');
      },
      noMemory,
    );

    expect(parsed.flight.confirmationCode).toBe('AB2ZQV');
    expect(parsed.flight.seat).toBe('14A');
    expect(parsed.date).toBe('2026-09-27');
  });

  it('learns a validated fallback once and reuses it without another request', async () => {
    const learned = new Map<string, FlightConfirmationAIResult>();
    const memory = {
      read: async (redactedText: string) => learned.get(redactedText),
      write: async (
        redactedText: string,
        result: FlightConfirmationAIResult,
      ) => {
        learned.set(redactedText, result);
      },
    };
    const analyze = jest.fn(async () => ({
      itineraryDates: ['2026-09-27'],
      segments: [
        {
          airline: 'United Airlines',
          flightNumber: 'UA 1907',
          departureAirport: 'GUA',
          arrivalAirport: 'LGA',
          departureDate: '2026-09-27',
          departureMinutes: 90,
          durationMinutes: 300,
          confidence: 0.98,
        },
      ],
    }));
    const incomplete = 'Passenger: Jordan\nFlight UA 1907\nGUA to LGA';

    await parseFlightConfirmationWithFallback(incomplete, undefined, analyze, memory);
    await parseFlightConfirmationWithFallback(incomplete, undefined, analyze, memory);

    expect(analyze).toHaveBeenCalledTimes(1);
    expect(learned.size).toBe(1);
  });
});
