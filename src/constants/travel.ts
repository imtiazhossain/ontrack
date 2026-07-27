import type { TravelPlan } from '@/features/travel/types';

/**
 * Temporary shared fixture for testing the travel experience across accounts.
 * Keep the stable ID so hydration and cloud sync never create duplicate copies.
 */
export const ALL_ACCOUNTS_TEST_TRIP: TravelPlan = {
  id: 'trip-all-accounts-test',
  chatAccessCode: '00000000000000000001',
  title: 'Test trip',
  destination: 'New York, New York',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  notes: 'Shared test trip visible to every account.',
  itinerary: [],
  participants: [],
  createdAt: '2026-07-27T00:00:00.000Z',
  updatedAt: '2026-07-27T00:00:00.000Z',
};

export function withAllAccountsTestTrip(plans: TravelPlan[]): TravelPlan[] {
  return [
    ALL_ACCOUNTS_TEST_TRIP,
    ...plans.filter((plan) => plan.id !== ALL_ACCOUNTS_TEST_TRIP.id),
  ];
}
