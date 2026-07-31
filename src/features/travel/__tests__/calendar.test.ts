import { travelCalendarDrafts } from '../calendar';
import type { TravelPlan } from '../types';

const PLAN: TravelPlan = {
  id: 'trip-1',
  title: 'Lisbon weekend',
  destination: 'Lisbon',
  startDate: '2026-09-04',
  endDate: '2026-09-07',
  itinerary: [
    {
      id: 'item-1',
      kind: 'flight',
      title: 'Flight to Lisbon',
      date: '2026-09-04',
      startMinutes: 480,
      durationMinutes: 420,
      details: 'Meet at Terminal 4',
      flight: {
        airline: 'TAP Air Portugal',
        flightNumber: 'TP 202',
        confirmationCode: 'LIS123',
        departureAirport: 'EWR',
        arrivalAirport: 'LIS',
        seat: '12A',
      },
    },
  ],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-07-26T00:00:00.000Z',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

describe('travel calendar adapter', () => {
  it('creates a trip event for every day and every itinerary event', () => {
    const drafts = travelCalendarDrafts(PLAN);
    const tripDays = drafts.filter((draft) => !draft.travelItemId);

    expect(tripDays).toEqual([
      expect.objectContaining({ date: '2026-09-04', title: '✈️ Day 1 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-05', title: '✈️ Day 2 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-06', title: '✈️ Day 3 · Lisbon weekend' }),
      expect.objectContaining({ date: '2026-09-07', title: '✈️ Day 4 · Lisbon weekend' }),
    ]);
    expect(drafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: '✈️ Day 1 · Lisbon weekend',
          date: '2026-09-04',
          travelPlanId: PLAN.id,
        }),
        expect.objectContaining({
          title: '✈️ Flight to Lisbon',
          date: '2026-09-04',
          travelPlanId: PLAN.id,
          travelItemId: 'item-1',
        }),
      ]),
    );
    expect(drafts.find((draft) => draft.travelItemId === 'item-1')?.notes).toContain(
      'Confirmation: LIS123',
    );
    expect(drafts).toHaveLength(5);
  });
});
