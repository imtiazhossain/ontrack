import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { travelCalendarDrafts } from '@/features/travel/calendar';
import type { TravelPlan } from '@/features/travel/types';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const plan = (id: string): TravelPlan => ({
  id,
  title: `${id} trip`,
  destination: 'Lisbon',
  startDate: '2026-09-04',
  endDate: '2026-09-05',
  itinerary: [],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
});

function addTripToCalendar(trip: TravelPlan) {
  useTravel.getState().savePlan(trip);
  useSchedule.getState().replaceTravelActivities(trip.id, travelCalendarDrafts(trip));
}

const calendarPlanIds = () =>
  useSchedule
    .getState()
    .activities.map((activity) => activity.travelPlanId)
    .filter(Boolean);

describe('removing a trip clears its calendar events', () => {
  beforeEach(() => {
    useSchedule.getState().resetAll();
    useTravel.getState().reset();
  });

  it('deletes only the removed trip’s events', () => {
    addTripToCalendar(plan('trip-1'));
    addTripToCalendar(plan('trip-2'));
    expect(calendarPlanIds().length).toBeGreaterThan(0);

    useTravel.getState().removePlan('trip-1');

    expect(calendarPlanIds()).not.toContain('trip-1');
    expect(calendarPlanIds()).toContain('trip-2');
  });

  it('keeps non-trip activities untouched', () => {
    addTripToCalendar(plan('trip-1'));
    const personal = useSchedule.getState().addActivity({
      date: '2026-09-04',
      title: 'Dentist',
      categoryId: 'personal',
      startMinutes: 600,
      durationMinutes: 30,
    });

    useTravel.getState().removePlan('trip-1');

    expect(useSchedule.getState().activities.map((activity) => activity.id)).toEqual([
      personal.id,
    ]);
  });

  it('drops events for trips that disappear during cloud sync', () => {
    addTripToCalendar(plan('trip-1'));
    addTripToCalendar(plan('trip-2'));

    useTravel.getState().replacePlans([plan('trip-2')]);

    expect(calendarPlanIds()).not.toContain('trip-1');
    expect(calendarPlanIds()).toContain('trip-2');
  });
});
