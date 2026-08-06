import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { emptyFlightDetailsDraft } from '@/features/travel/flight-details';
import { applyFlightExpenseFromImport } from '@/features/travel/flight-expense-from-import';
import {
    TRAVEL_EXPENSE_HOST_ID,
    TRAVEL_EXPENSE_SELF_ID,
    type TravelPlan,
} from '@/features/travel/types';

function basePlan(overrides?: Partial<TravelPlan>): TravelPlan {
  return {
    id: 'trip-1',
    title: 'Demo',
    destination: 'Reykjavik',
    startDate: '2026-09-01',
    endDate: '2026-09-10',
    baseCurrency: 'USD',
    participants: [
      {
        id: 'friend-1',
        name: 'Alex',
        inviteCode: 'inv-1',
        invitedAt: '2026-08-01T00:00:00.000Z',
      },
    ],
    itinerary: [],
    expenses: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('flight expense from import', () => {
  it('includes the host in splits on member-plan copies', () => {
    const next = applyFlightExpenseFromImport(
      basePlan({
        hostTripId: 'trip-host',
        chatAccessCode: 'join-abc',
      }),
      {
        amount: 420,
        currency: 'USD',
        title: 'Flight',
        date: '2026-09-08',
        flight: {
          airline: 'United',
          confirmationCode: 'ABC123',
          flightNumber: 'UA 1',
        },
      },
    );
    expect(next.expenses[0]?.splitWithIds).toEqual(
      expect.arrayContaining([
        TRAVEL_EXPENSE_SELF_ID,
        TRAVEL_EXPENSE_HOST_ID,
        'friend-1',
      ]),
    );
  });

  it('uses OCR itinerary dates when segment dates are missing', () => {
    const next = applyImportedFlightsToPlan({
      plan: basePlan(),
      imported: {
        ...{
          flight: {
            ...emptyFlightDetailsDraft(),
            airline: 'United',
            flightNumber: 'UA 1907',
            departureAirport: 'GUA',
            arrivalAirport: 'LGA',
          },
          title: 'Flight GUA → LGA',
          startMinutes: 90,
          durationMinutes: 480,
          detectedFieldCount: 4,
        },
        date: undefined,
        itineraryDates: ['2026-09-27'],
        amount: 350,
        currency: 'USD',
        segments: [
          {
            flight: {
              ...emptyFlightDetailsDraft(),
              airline: 'United',
              flightNumber: 'UA 1907',
              departureAirport: 'GUA',
              arrivalAirport: 'LGA',
            },
            title: 'Flight GUA → LGA',
            startMinutes: 90,
            durationMinutes: 480,
            detectedFieldCount: 4,
          },
        ],
      },
      createId: () => 'item-1',
    });

    expect(next.itinerary[0]?.date).toBe('2026-09-27');
    expect(next.expenses[0]?.date).toBe('2026-09-27');
  });
});
