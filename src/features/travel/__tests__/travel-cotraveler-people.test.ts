import { resolveTravelCoTravelerPeople } from '@/features/travel/travel-cotraveler-people';
import type { TravelPlan } from '@/features/travel/types';

const base: TravelPlan = {
  id: 'trip-1',
  title: 'Iceland',
  destination: 'Reykjavík, Iceland',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary: [],
  participants: [],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-01T12:00:00.000Z',
};

describe('resolveTravelCoTravelerPeople', () => {
  it('includes the host on member copies so the stack is mutual', () => {
    expect(
      resolveTravelCoTravelerPeople(
        {
          ...base,
          chatAccessCode: 'aaaaaaaaaaaaaaaaaaaa',
          hostTripId: 'trip-host-1',
          hostDisplayName: 'Alex Rivera',
        },
        'Jordan Lee',
      ),
    ).toEqual([
      { id: 'trip-1-self', name: 'Jordan Lee', isSelf: true },
      { id: 'trip-1-host', name: 'Alex Rivera' },
    ]);
  });

  it('lists accepted invitees on host plans', () => {
    expect(
      resolveTravelCoTravelerPeople(
        {
          ...base,
          participants: [
            {
              id: 'p1',
              name: 'Jordan Lee',
              inviteCode: 'bbbbbbbbbbbbbbbbbbbb',
              invitedAt: '2026-08-02T12:00:00.000Z',
              acceptedAt: '2026-08-02T13:00:00.000Z',
            },
          ],
        },
        'Alex Rivera',
      ),
    ).toEqual([
      { id: 'trip-1-self', name: 'Alex Rivera', isSelf: true },
      { id: 'p1', name: 'Jordan Lee' },
    ]);
  });
});
