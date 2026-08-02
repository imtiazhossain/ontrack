import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  abbreviatedPersonName,
  createExpenseDraft,
  settleBalances,
  settleTransfers,
  totalInBase,
  upsertTravelExpense,
} from '../expense-math';
import type { FxRates } from '../fx-rates';
import type { TravelExpense, TravelPlan } from '../../types';
import { TRAVEL_EXPENSE_SELF_ID } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
const rates: FxRates = {
  date: '2026-07-30',
  base: 'USD',
  rates: { USD: 1, ISK: 138, EUR: 0.92 },
  fetchedAt: '2026-07-30T12:00:00.000Z',
};

const plan: TravelPlan = {
  id: 'trip-1',
  title: 'Iceland',
  destination: 'Iceland',
  startDate: '2026-09-08',
  endDate: '2026-09-14',
  itinerary: [],
  participants: [
    {
      id: 'friend-1',
      name: 'Alex',
      inviteCode: 'aaaaaaaaaaaaaaaaaaaa',
      invitedAt: '2026-07-01T00:00:00.000Z',
    },
  ],
  baseCurrency: 'USD',
  expenses: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function expense(partial: Partial<TravelExpense> & Pick<TravelExpense, 'id' | 'amount' | 'currency' | 'paidById' | 'splitWithIds'>): TravelExpense {
  return {
    title: 'Item',
    date: '2026-09-09',
    category: 'food',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...partial,
  };
}

describe('expense math', () => {
  it('abbreviates multi-word names to initials', () => {
    expect(abbreviatedPersonName('Farhana Tasmin')).toBe('FT');
    expect(abbreviatedPersonName('You')).toBe('You');
    expect(abbreviatedPersonName('Alex')).toBe('Alex');
  });

  it('converts ISK totals into the trip base currency', () => {
    const expenses = [
      expense({
        id: 'e1',
        amount: 13800,
        currency: 'ISK',
        paidById: TRAVEL_EXPENSE_SELF_ID,
        splitWithIds: [TRAVEL_EXPENSE_SELF_ID],
      }),
    ];
    expect(totalInBase(expenses, 'USD', rates)).toEqual({ total: 100, convertible: true });
  });

  it('settles equal splits between You and a friend', () => {
    const expenses = [
      expense({
        id: 'e1',
        amount: 100,
        currency: 'USD',
        paidById: TRAVEL_EXPENSE_SELF_ID,
        splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
      }),
    ];
    const balances = settleBalances(expenses, 'USD', rates);
    expect(balances).toEqual([
      { personId: TRAVEL_EXPENSE_SELF_ID, net: 50 },
      { personId: 'friend-1', net: -50 },
    ]);
    expect(settleTransfers(balances!)).toEqual([
      { fromId: 'friend-1', toId: TRAVEL_EXPENSE_SELF_ID, amount: 50 },
    ]);
  });

  it('upserts expenses onto a plan', () => {
    const draft = createExpenseDraft({
      title: 'Hot dogs',
      amount: 2500,
      currency: 'ISK',
      date: '2026-09-10',
      category: 'food',
      paidById: TRAVEL_EXPENSE_SELF_ID,
      splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
    });
    const next = upsertTravelExpense(plan, draft);
    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0].title).toBe('Hot dogs');
    expect(next.expenses[0].currency).toBe('ISK');
  });
});
