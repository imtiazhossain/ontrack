import {
  expensesForPublish,
  expensesFromRemote,
  mergeSharedExpenseSnapshot,
  peopleFromRemote,
  peopleForPublish,
  travelExpenseMemberId,
  type TravelExpenseSnapshot,
} from '../expense-collaboration';
import {
  TRAVEL_EXPENSE_HOST_ID,
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelPlan,
} from '@/features/travel/types';

jest.mock('@/services/cloud/supabase', () => ({
  getSupabaseClient: () => undefined,
}));

jest.mock('@/store/preferences', () => ({
  usePreferences: {
    getState: () => ({ name: 'Friend' }),
  },
}));

jest.mock('@/store/travel', () => ({
  useTravel: {
    getState: () => ({
      savePlan: jest.fn(),
      plans: [],
    }),
  },
}));

const basePlan: TravelPlan = {
  id: 'trip-host-1',
  title: 'Iceland',
  destination: 'Reykjavík',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary: [],
  participants: [
    {
      id: 'friend-1',
      name: 'Jordan Lee',
      inviteCode: 'aaaaaaaaaaaaaaaaaaaa',
      invitedAt: '2026-07-01T00:00:00.000Z',
    },
  ],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function expense(
  partial: Partial<TravelExpense> & Pick<TravelExpense, 'id' | 'paidById' | 'splitWithIds'>,
): TravelExpense {
  return {
    title: 'Taxi',
    amount: 40,
    currency: 'USD',
    date: '2026-09-09',
    category: 'transport',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial,
  };
}

describe('travel expense collaboration helpers', () => {
  it('keeps host self ids when publishing from the host plan', () => {
    const plan = {
      ...basePlan,
      expenses: [
        expense({
          id: 'e1',
          paidById: TRAVEL_EXPENSE_SELF_ID,
          splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
        }),
      ],
    };
    expect(expensesForPublish(plan, 'user-host')).toEqual(plan.expenses);
    expect(peopleForPublish(plan, 'Rocky', undefined)[0]).toEqual({
      id: TRAVEL_EXPENSE_SELF_ID,
      name: 'Rocky',
    });
  });

  it('remaps member self ↔ host around the shared document', () => {
    const memberUserId = 'user-friend';
    const memberId = travelExpenseMemberId(memberUserId);
    const memberPlan: TravelPlan = {
      ...basePlan,
      id: 'trip-invite-abc',
      chatAccessCode: 'bbbbbbbbbbbbbbbbbbbb',
      hostTripId: 'trip-host-1',
      hostDisplayName: 'Rocky',
      expenses: [
        expense({
          id: 'e1',
          paidById: TRAVEL_EXPENSE_HOST_ID,
          splitWithIds: [TRAVEL_EXPENSE_HOST_ID, TRAVEL_EXPENSE_SELF_ID],
        }),
        expense({
          id: 'e2',
          paidById: TRAVEL_EXPENSE_SELF_ID,
          splitWithIds: [TRAVEL_EXPENSE_SELF_ID, TRAVEL_EXPENSE_HOST_ID],
        }),
      ],
    };

    const published = expensesForPublish(memberPlan, memberUserId);
    expect(published[0]?.paidById).toBe(TRAVEL_EXPENSE_SELF_ID);
    expect(published[0]?.splitWithIds).toEqual([
      TRAVEL_EXPENSE_SELF_ID,
      memberId,
    ]);
    expect(published[1]?.paidById).toBe(memberId);

    const roundTrip = expensesFromRemote(published, memberUserId, true);
    expect(roundTrip[0]?.paidById).toBe(TRAVEL_EXPENSE_HOST_ID);
    expect(roundTrip[1]?.paidById).toBe(TRAVEL_EXPENSE_SELF_ID);
  });

  it('merges a newer shared snapshot onto a member plan', () => {
    const memberUserId = 'user-friend';
    const memberId = travelExpenseMemberId(memberUserId);
    const memberPlan: TravelPlan = {
      ...basePlan,
      id: 'trip-invite-abc',
      chatAccessCode: 'bbbbbbbbbbbbbbbbbbbb',
      hostTripId: 'trip-host-1',
      expenses: [],
      sharedExpensesUpdatedAt: '2026-07-01T00:00:00.000Z',
    };
    const snapshot: TravelExpenseSnapshot = {
      tripId: 'trip-host-1',
      baseCurrency: 'USD',
      updatedAt: '2026-08-02T12:00:00.000Z',
      people: [
        { id: TRAVEL_EXPENSE_SELF_ID, name: 'Rocky' },
        { id: 'friend-1', name: 'Jordan Lee' },
        { id: memberId, name: 'Friend' },
      ],
      expenses: [
        expense({
          id: 'e1',
          title: 'Hertz Rental',
          amount: 373.83,
          paidById: TRAVEL_EXPENSE_SELF_ID,
          splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
        }),
      ],
    };

    const merged = mergeSharedExpenseSnapshot(memberPlan, snapshot, memberUserId);
    expect(merged).toBeDefined();
    expect(merged?.hostDisplayName).toBe('Rocky');
    expect(merged?.expenses[0]?.paidById).toBe(TRAVEL_EXPENSE_HOST_ID);
    expect(merged?.sharedExpensePeople).toEqual(
      peopleFromRemote(snapshot.people, memberUserId, true),
    );
    expect(merged?.sharedExpensesUpdatedAt).toBe(snapshot.updatedAt);
  });
});
