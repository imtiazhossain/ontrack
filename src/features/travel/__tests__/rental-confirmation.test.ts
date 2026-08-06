import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { parseRentalConfirmation } from '../rental-confirmation-parser';
import {
  expandedTripRangeForRental,
  mergeImportedRental,
} from '../rental-confirmation-itinerary';
import { applyImportedRentalToPlan } from '../apply-imported-rental';
import type { TravelPlan } from '../types';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const HERTZ_CONFIRMATION = `
Hertz Confirmation
Confirmation Number: K98M7X2PQ1
Pick-up: Sep 09, 2026 6:30 AM
Keflavik International Airport (KEF)
Drop-off: Sep 14, 2026 3:00 PM
Keflavik International Airport (KEF)
Vehicle class: Compact SUV
Estimated Total: USD $487.32
`;

const HERTZ_COMPACT_CARD = `
Hertz
Confirmation Number: L666EBA86A0
Compact Elite 4 Door
VW ID.3 EV
Keflavik International Airport
Sep 09 | 6:30 am • Sep 14 | 3:00 pm
Total USD $373.83
`;

describe('rental confirmation parser', () => {
  it('extracts company, locations, times, and total', () => {
    const parsed = parseRentalConfirmation(HERTZ_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    expect(parsed.rental.company).toBe('Hertz');
    expect(parsed.rental.confirmationCode).toBe('K98M7X2PQ1');
    expect(parsed.rental.pickupLocation).toContain('Keflavik');
    expect(parsed.rental.dropoffLocation).toContain('Keflavik');
    expect(parsed.rental.dropoffDate).toBe('2026-09-14');
    expect(parsed.date).toBe('2026-09-09');
    expect(parsed.startMinutes).toBe(6 * 60 + 30);
    expect(Number(parsed.rental.dropoffMinutes)).toBe(15 * 60);
    expect(parsed.amount).toBe(487.32);
    expect(parsed.currency).toBe('USD');
    expect(parsed.detectedFieldCount).toBeGreaterThan(0);
  });

  it('parses compact Hertz card range lines without Pick-up/Drop-off labels', () => {
    const parsed = parseRentalConfirmation(HERTZ_COMPACT_CARD, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    expect(parsed.rental.confirmationCode).toBe('L666EBA86A0');
    expect(parsed.date).toBe('2026-09-09');
    expect(parsed.startMinutes).toBe(6 * 60 + 30);
    expect(parsed.rental.dropoffDate).toBe('2026-09-14');
    expect(Number(parsed.rental.dropoffMinutes)).toBe(15 * 60);
    expect(parsed.rental.pickupLocation).toContain('Keflavik');
    expect(parsed.rental.vehicleClass).toContain('Compact');
  });

  it('computes overnight rental duration under 24 hours', () => {
    const parsed = parseRentalConfirmation(
      `
        Hertz Confirmation Number: OVERNITE01
        Pick-up: Sep 09, 2026 10:00 PM
        Keflavik International Airport (KEF)
        Drop-off: Sep 10, 2026 8:00 AM
        Keflavik International Airport (KEF)
      `,
      { startDate: '2026-09-08', endDate: '2026-09-14' },
    );
    expect(parsed.date).toBe('2026-09-09');
    expect(parsed.startMinutes).toBe(22 * 60);
    expect(parsed.durationMinutes).toBe(10 * 60);
    expect(parsed.rental.dropoffDate).toBe('2026-09-10');
  });

  it('ignores flight times outside the pick-up / drop-off sections', () => {
    const parsed = parseRentalConfirmation(
      `
        Icelandair FI 622 Depart: Tue, Sep 08, 2026 08:25 pm Arrive 06:15 am
        Hertz Confirmation Number: L666EBA86A0
        Pick-up: Sep 09, 2026 6:30 AM
        Keflavik International Airport (KEF)
        Drop-off: Sep 14, 2026 3:00 PM
        Keflavik International Airport (KEF)
        Vehicle class: Compact Elite
        Estimated Total: USD $373.83
      `,
      { startDate: '2026-09-08', endDate: '2026-09-14' },
    );
    expect(parsed.date).toBe('2026-09-09');
    expect(parsed.startMinutes).toBe(6 * 60 + 30);
    expect(parsed.rental.dropoffDate).toBe('2026-09-14');
    expect(Number(parsed.rental.dropoffMinutes)).toBe(15 * 60);
    expect(parsed.rental.confirmationCode).toBe('L666EBA86A0');
    expect(parsed.rental.vehicleClass).toContain('Compact');
  });
});

describe('rental confirmation itinerary + expense', () => {
  const basePlan = (): TravelPlan => ({
    id: 'trip-1',
    title: 'Iceland',
    destination: 'Iceland',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    itinerary: [],
    participants: [],
    baseCurrency: 'USD',
    expenses: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  });

  it('merges a rental item and expands the trip range when needed', () => {
    const parsed = parseRentalConfirmation(HERTZ_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    const range = expandedTripRangeForRental(
      { startDate: '2026-09-10', endDate: '2026-09-12' },
      parsed,
    );
    expect(range.startDate).toBe('2026-09-09');
    expect(range.endDate).toBe('2026-09-14');

    const itinerary = mergeImportedRental({
      itinerary: [],
      parsed,
      tripRange: { startDate: '2026-09-08', endDate: '2026-09-14' },
      createId: () => 'rental-1',
    });
    expect(itinerary).toHaveLength(1);
    expect(itinerary[0]).toMatchObject({
      id: 'rental-1',
      kind: 'rental',
      date: '2026-09-09',
      startMinutes: 6 * 60 + 30,
      rental: {
        company: 'Hertz',
        confirmationCode: 'K98M7X2PQ1',
        pickupLocation: expect.stringContaining('Keflavik'),
        dropoffLocation: expect.stringContaining('Keflavik'),
        dropoffDate: '2026-09-14',
        dropoffMinutes: 15 * 60,
      },
    });
  });

  it('adds a transport expense for the parsed total', () => {
    const parsed = parseRentalConfirmation(HERTZ_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    const next = applyImportedRentalToPlan({
      plan: basePlan(),
      imported: parsed,
      createId: () => 'rental-1',
    });
    expect(next.itinerary).toHaveLength(1);
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0]).toMatchObject({
      category: 'transport',
      amount: 487.32,
      currency: 'USD',
      notes: 'Confirmation: K98M7X2PQ1',
    });
  });

  it('updates an existing rental expense when the confirmation matches', () => {
    const parsed = parseRentalConfirmation(HERTZ_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    const first = applyImportedRentalToPlan({
      plan: basePlan(),
      imported: parsed,
      createId: () => 'rental-1',
    });
    const second = applyImportedRentalToPlan({
      plan: first,
      imported: { ...parsed, amount: 512.1 },
      createId: () => 'rental-2',
    });
    expect(second.itinerary).toHaveLength(1);
    expect(second.expenses).toHaveLength(1);
    expect(second.expenses[0].amount).toBe(512.1);
    expect(second.expenses[0].id).toBe(first.expenses[0].id);
  });
});
