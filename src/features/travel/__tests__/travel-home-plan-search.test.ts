import { filterTravelPlansByQuery } from '@/features/travel/travel-home-plan-search';
import type { TravelPlan } from '@/features/travel/types';

function plan(
  partial: Pick<TravelPlan, 'id' | 'title' | 'destination'> &
    Partial<Pick<TravelPlan, 'origin' | 'notes'>>,
): TravelPlan {
  return {
    id: partial.id,
    title: partial.title,
    destination: partial.destination,
    origin: partial.origin,
    notes: partial.notes,
    startDate: '2026-08-01',
    endDate: '2026-08-08',
    baseCurrency: 'USD',
    itinerary: [],
    participants: [],
    expenses: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('filterTravelPlansByQuery', () => {
  const plans = [
    plan({
      id: 'trip-1',
      title: 'Iceland Aurora',
      destination: 'Reykjavik',
      origin: 'Boston',
      notes: 'Blue Lagoon day',
    }),
    plan({
      id: 'trip-2',
      title: 'Antigua Escape',
      destination: 'St. John\'s',
      notes: 'beach week',
    }),
  ];

  it('returns all plans for blank query', () => {
    expect(filterTravelPlansByQuery(plans, '  ')).toEqual(plans);
  });

  it('matches title, destination, origin, and notes', () => {
    expect(filterTravelPlansByQuery(plans, 'aurora').map((p) => p.id)).toEqual([
      'trip-1',
    ]);
    expect(filterTravelPlansByQuery(plans, 'st. john').map((p) => p.id)).toEqual([
      'trip-2',
    ]);
    expect(filterTravelPlansByQuery(plans, 'boston').map((p) => p.id)).toEqual([
      'trip-1',
    ]);
    expect(filterTravelPlansByQuery(plans, 'beach').map((p) => p.id)).toEqual([
      'trip-2',
    ]);
  });

  it('is case-insensitive', () => {
    expect(filterTravelPlansByQuery(plans, 'ICELAND').map((p) => p.id)).toEqual([
      'trip-1',
    ]);
  });
});
