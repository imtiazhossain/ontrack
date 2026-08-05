import {
  flightExpenseDisplayTitle,
  flightExpenseTitleFromSegments,
  formatRoundTripFlightTitle,
  isRoundTripFlightExpense,
  withRoundTripFlightExpenseTitles,
} from '@/features/travel/flight-expense-title';
import type { TravelExpense, TravelItineraryItem, TravelPlan } from '@/features/travel/types';

const outbound: TravelItineraryItem = {
  id: 'f1',
  kind: 'flight',
  title: 'Flight EWR → KEF',
  date: '2026-09-08',
  startMinutes: 20 * 60 + 25,
  durationMinutes: 350,
  flight: { departureAirport: 'EWR', arrivalAirport: 'KEF' },
};

const inbound: TravelItineraryItem = {
  id: 'f2',
  kind: 'flight',
  title: 'Flight KEF → EWR',
  date: '2026-09-14',
  startMinutes: 17 * 60,
  durationMinutes: 375,
  flight: { departureAirport: 'KEF', arrivalAirport: 'EWR' },
};

const expense = (title: string): TravelExpense => ({
  id: 'exp-1',
  title,
  amount: 916.46,
  currency: 'USD',
  date: '2026-09-08',
  category: 'flight',
  paidById: 'self',
  splitWithIds: ['self'],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
});

const plan = (itinerary: TravelItineraryItem[], title = 'Flight EWR → KEF'): TravelPlan => ({
  id: 'trip-1',
  title: 'Iceland',
  destination: 'Iceland',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary,
  participants: [],
  baseCurrency: 'USD',
  expenses: [expense(title)],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
});

describe('flightExpenseTitleFromSegments', () => {
  it('uses Flights and <-> for round trips', () => {
    expect(
      flightExpenseTitleFromSegments([
        { flight: { departureAirport: 'EWR', arrivalAirport: 'KEF' } },
        { flight: { departureAirport: 'KEF', arrivalAirport: 'EWR' } },
      ]),
    ).toBe('Flights EWR <-> KEF');
  });

  it('keeps one-way Flight wording', () => {
    expect(
      flightExpenseTitleFromSegments([
        { flight: { departureAirport: 'EWR', arrivalAirport: 'KEF' } },
      ]),
    ).toBe('Flight EWR → KEF');
  });
});

describe('flightExpenseDisplayTitle', () => {
  it('upgrades stored one-way titles when itinerary has a return', () => {
    expect(flightExpenseDisplayTitle(expense('Flight EWR → KEF'), plan([outbound, inbound]))).toBe(
      'Flights EWR <-> KEF',
    );
  });

  it('canonicalizes unicode round-trip titles to <->', () => {
    expect(flightExpenseDisplayTitle(expense('Flights EWR ↔ KEF'), plan([outbound, inbound]))).toBe(
      'Flights EWR <-> KEF',
    );
  });

  it('detects return legs nested on a connecting journey item', () => {
    const journey: TravelItineraryItem = {
      id: 'journey',
      kind: 'flight',
      title: 'Flight EWR → KEF',
      date: '2026-09-08',
      startMinutes: 20 * 60 + 25,
      durationMinutes: 120,
      flight: {
        departureAirport: 'EWR',
        arrivalAirport: 'KEF',
        legs: [
          { departureAirport: 'EWR', arrivalAirport: 'KEF' },
          { departureAirport: 'KEF', arrivalAirport: 'EWR' },
        ],
      },
    };
    expect(flightExpenseDisplayTitle(expense('Flight EWR → KEF'), plan([journey]))).toBe(
      'Flights EWR <-> KEF',
    );
  });

  it('upgrades when both legs wrongly share the outbound airports across dates', () => {
    const badReturn: TravelItineraryItem = {
      ...inbound,
      title: 'Flight EWR → KEF',
      flight: { departureAirport: 'EWR', arrivalAirport: 'KEF' },
    };
    expect(flightExpenseDisplayTitle(expense('Flight EWR → KEF'), plan([outbound, badReturn]))).toBe(
      'Flights EWR <-> KEF',
    );
  });

  it('leaves one-way titles alone without a return leg', () => {
    expect(flightExpenseDisplayTitle(expense('Flight EWR → KEF'), plan([outbound]))).toBe(
      'Flight EWR → KEF',
    );
  });
});

describe('withRoundTripFlightExpenseTitles', () => {
  it('persists round-trip titles onto expenses', () => {
    const next = withRoundTripFlightExpenseTitles(plan([outbound, inbound]));
    expect(next.expenses[0]?.title).toBe(formatRoundTripFlightTitle({ origin: 'EWR', destination: 'KEF' }));
    expect(next.expenses[0]?.title).toBe('Flights EWR <-> KEF');
    expect(isRoundTripFlightExpense(next.expenses[0]!, next)).toBe(true);
  });
});
