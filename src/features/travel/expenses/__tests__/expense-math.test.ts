import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import type { TravelExpense, TravelPlan } from '../../types';
import { TRAVEL_EXPENSE_SELF_ID } from '../../types';
import {
    abbreviatedPersonName,
    createExpenseDraft,
    enrichExpensePeopleAvatars,
    expensePeople,
    firstNamePersonLabel,
    personName,
    settleBalances,
    settleTransfers,
    totalInBase,
    upsertTravelExpense,
} from '../expense-math';
import type { FxRates } from '../fx-rates';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
const rates: FxRates = {
  date: '2026-07-30',
  base: 'USD',
  rates: { USD: 1, ISK: 138, EUR: 0.92 },
  fetchedAt: '2026-07-30T12:00:00.000Z',
  provider: 'frankfurter',
  sourceLabel: 'Frankfurter',
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
    expect(abbreviatedPersonName('Jordan Lee')).toBe('JL');
    expect(abbreviatedPersonName('You')).toBe('You');
    expect(abbreviatedPersonName('Alex')).toBe('Alex');
  });

  it('uses first names for expense payer labels, with last initial on collision', () => {
    expect(firstNamePersonLabel('Jordan Lee', ['Jordan Lee', 'You'])).toBe('Jordan');
    expect(firstNamePersonLabel('You', ['Jordan Lee', 'You'])).toBe('You');
    expect(firstNamePersonLabel('Alex', ['Alex', 'You'])).toBe('Alex');
    expect(
      firstNamePersonLabel('Jordan Lee', ['Jordan Lee', 'Jordan Khan', 'You']),
    ).toBe('Jordan L.');
    expect(
      firstNamePersonLabel('Jordan Khan', ['Jordan Lee', 'Jordan Khan', 'You']),
    ).toBe('Jordan K.');
  });

  it('keeps local invite ids and resolves shared member: ids by auth user', () => {
    const people = expensePeople({
      ...plan,
      sharedExpensePeople: [
        { id: 'self', name: 'Host' },
        { id: 'member:uid-alex', name: 'Alex' },
      ],
    });
    expect(people.find((person) => person.id === TRAVEL_EXPENSE_SELF_ID)?.isSelf).toBe(
      true,
    );
    expect(people.find((person) => person.id === 'friend-1')).toMatchObject({
      name: 'Alex',
      userId: 'uid-alex',
    });
    expect(personName(people, 'friend-1')).toBe('Alex');
    expect(personName(people, 'member:uid-alex')).toBe('Alex');
  });

  it('enriches avatar user ids from friends / roster lookup', () => {
    const people = enrichExpensePeopleAvatars(expensePeople(plan), [
      { userId: 'uid-alex', displayName: 'Alex' },
    ]);
    expect(
      people.find((person) => person.name === 'Alex')?.userId,
    ).toBe('uid-alex');
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

  it('allocates residual cents so three-way splits sum to zero', () => {
    const expenses = [
      expense({
        id: 'e1',
        amount: 100,
        currency: 'USD',
        paidById: TRAVEL_EXPENSE_SELF_ID,
        splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1', 'friend-2'],
      }),
    ];
    const balances = settleBalances(expenses, 'USD', rates)!;
    const total = balances.reduce((sum, row) => sum + row.net, 0);
    expect(Math.round(total * 100) / 100).toBe(0);
    expect(settleTransfers(balances).reduce((sum, row) => sum + row.amount, 0)).toBe(
      balances.find((row) => row.personId === TRAVEL_EXPENSE_SELF_ID)?.net,
    );
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

  it('deduplicates imported stay expenses by confirmation code', () => {
    const existing = createExpenseDraft({
      title: 'Centerhotel Midgardur',
      amount: 1065.32,
      currency: 'USD',
      date: '2026-09-09',
      category: 'stay',
      notes: 'Confirmation: 13460175',
      paidById: TRAVEL_EXPENSE_SELF_ID,
      splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
    });
    const withExisting = upsertTravelExpense(plan, existing);
    const duplicateAttempt = createExpenseDraft({
      title: 'Centerhotel Midgardur',
      amount: 1065.32,
      currency: 'USD',
      date: '2026-09-09',
      category: 'stay',
      notes: 'Confirmation: 13460175',
      paidById: TRAVEL_EXPENSE_SELF_ID,
      splitWithIds: [TRAVEL_EXPENSE_SELF_ID, 'friend-1'],
    });
    const next = upsertTravelExpense(withExisting, duplicateAttempt);

    expect(next.expenses).toHaveLength(1);
    expect(next.expenses[0].id).toBe(existing.id);
    expect(next.expenses[0].title).toBe('Centerhotel Midgardur');
  });
});
