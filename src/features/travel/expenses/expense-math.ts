import {
  TRAVEL_EXPENSE_HOST_ID,
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelParticipant,
  type TravelPlan,
} from '@/features/travel/types';
import {
  isTravelExpenseMemberId,
} from '@/services/travel/expense-collaboration';
import { newId } from '@/utils/id';

import { normalizeCurrencyCode } from './format-money';
import type { FxRates } from './fx-rates';
import { convertAmount } from './fx-rates';

export type ExpensePerson = {
  id: string;
  name: string;
  /** Current signed-in user — uses preferences avatar. */
  isSelf?: boolean;
  /** Auth user id when known (`member:<uid>` / friends / roster). */
  userId?: string;
};

function memberUserId(id: string): string | undefined {
  if (!isTravelExpenseMemberId(id)) return undefined;
  const userId = id.slice('member:'.length).trim();
  return userId || undefined;
}

function samePersonName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function expensePeople(
  plan: Pick<
    TravelPlan,
    'id' | 'participants' | 'chatAccessCode' | 'hostTripId' | 'hostDisplayName' | 'sharedExpensePeople'
  >,
): ExpensePerson[] {
  const isMember =
    Boolean(plan.chatAccessCode) ||
    Boolean(plan.hostTripId?.trim() && plan.hostTripId.trim() !== plan.id);
  const people: ExpensePerson[] = [
    { id: TRAVEL_EXPENSE_SELF_ID, name: 'You', isSelf: true },
  ];
  if (isMember) {
    people.push({
      id: TRAVEL_EXPENSE_HOST_ID,
      name: plan.hostDisplayName?.trim() || 'Host',
    });
  }
  for (const participant of plan.participants) {
    if (!people.some((person) => person.id === participant.id)) {
      people.push({ id: participant.id, name: participant.name });
    }
  }
  for (const person of plan.sharedExpensePeople ?? []) {
    if (person.id === TRAVEL_EXPENSE_SELF_ID) continue;
    const userId = memberUserId(person.id);
    const existingIndex = people.findIndex(
      (entry) =>
        entry.id === person.id || samePersonName(entry.name, person.name),
    );
    if (existingIndex >= 0) {
      const existing = people[existingIndex]!;
      if (userId && !existing.userId) {
        people[existingIndex] = { ...existing, userId };
      }
      continue;
    }
    people.push({
      id: person.id,
      name: person.name,
      ...(userId ? { userId } : {}),
    });
  }
  return people;
}

/** Attach friend / roster auth ids so ProfileAvatar can show custom icons. */
export function enrichExpensePeopleAvatars(
  people: ExpensePerson[],
  lookup: Array<{ userId: string; displayName: string }>,
): ExpensePerson[] {
  if (lookup.length === 0) return people;
  return people.map((person) => {
    if (person.isSelf || person.userId) return person;
    const match = lookup.find((entry) =>
      samePersonName(entry.displayName, person.name),
    );
    return match ? { ...person, userId: match.userId } : person;
  });
}

export function personName(
  people: ExpensePerson[],
  id: string,
): string {
  return people.find((p) => p.id === id)?.name ?? 'Someone';
}

/** Compact chip label: "You" stays; "Farhana Tasmin" → "FT". */
export function abbreviatedPersonName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.trim();
  if (parts.length === 1) return parts[0]!;
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * First-name label for expense rows.
 * "You" stays; "Farhana Tasmin" → "Farhana".
 * When multiple people share a first name, append last initial: "Farhana T.".
 */
export function firstNamePersonLabel(name: string, allNames: string[]): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/^you$/i.test(trimmed)) return 'You';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]!;
  if (parts.length === 1) return first;

  const firstLower = first.toLowerCase();
  const sameFirstCount = allNames.reduce((count, other) => {
    const otherFirst = other.trim().split(/\s+/).filter(Boolean)[0]?.toLowerCase();
    return otherFirst === firstLower ? count + 1 : count;
  }, 0);
  if (sameFirstCount <= 1) return first;

  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export function expensePayerLabel(people: ExpensePerson[], paidById: string): string {
  return firstNamePersonLabel(
    personName(people, paidById),
    people.map((person) => person.name),
  );
}

/** Convert expense amount into the trip base currency when rates allow. */
export function expenseInBase(
  expense: TravelExpense,
  baseCurrency: string,
  rates: FxRates | undefined,
): number | undefined {
  const base = normalizeCurrencyCode(baseCurrency);
  if (expense.currency === base) return expense.amount;
  if (!rates) return undefined;
  return convertAmount(expense.amount, expense.currency, base, rates);
}

export function totalInBase(
  expenses: TravelExpense[],
  baseCurrency: string,
  rates: FxRates | undefined,
): { total: number; convertible: boolean } {
  let total = 0;
  let convertible = true;
  for (const expense of expenses) {
    const value = expenseInBase(expense, baseCurrency, rates);
    if (value === undefined) {
      convertible = false;
      continue;
    }
    total += value;
  }
  return { total, convertible };
}

export interface SettleBalance {
  personId: string;
  /** Positive = others owe this person; negative = this person owes. */
  net: number;
}

/**
 * Equal-split settle-up in base currency.
 * Each split member owes amount/n; payer is credited the full amount.
 */
export function settleBalances(
  expenses: TravelExpense[],
  baseCurrency: string,
  rates: FxRates | undefined,
): SettleBalance[] | undefined {
  const nets = new Map<string, number>();
  for (const expense of expenses) {
    const amount = expenseInBase(expense, baseCurrency, rates);
    if (amount === undefined) return undefined;
    const splitIds = expense.splitWithIds.length > 0 ? expense.splitWithIds : [expense.paidById];
    const share = amount / splitIds.length;
    nets.set(expense.paidById, (nets.get(expense.paidById) ?? 0) + amount);
    for (const id of splitIds) {
      nets.set(id, (nets.get(id) ?? 0) - share);
    }
  }
  return [...nets.entries()]
    .map(([personId, net]) => ({ personId, net: Math.round(net * 100) / 100 }))
    .filter((row) => Math.abs(row.net) >= 0.01)
    .sort((a, b) => b.net - a.net);
}

export interface SettleTransfer {
  fromId: string;
  toId: string;
  amount: number;
}

/** Greedy minimize transfers from settleBalances. */
export function settleTransfers(balances: SettleBalance[]): SettleTransfer[] {
  const debtors = balances
    .filter((b) => b.net < -0.009)
    .map((b) => ({ id: b.personId, amount: -b.net }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.net > 0.009)
    .map((b) => ({ id: b.personId, amount: b.net }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettleTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const amount = Math.round(pay * 100) / 100;
    if (amount >= 0.01) {
      transfers.push({ fromId: debtors[i].id, toId: creditors[j].id, amount });
    }
    debtors[i].amount = Math.round((debtors[i].amount - pay) * 100) / 100;
    creditors[j].amount = Math.round((creditors[j].amount - pay) * 100) / 100;
    if (debtors[i].amount < 0.01) i += 1;
    if (creditors[j].amount < 0.01) j += 1;
  }
  return transfers;
}

export function upsertTravelExpense(
  plan: TravelPlan,
  expense: TravelExpense,
): TravelPlan {
  const expenses = plan.expenses.some((item) => item.id === expense.id)
    ? plan.expenses.map((item) => (item.id === expense.id ? expense : item))
    : [...plan.expenses, expense];
  return {
    ...plan,
    expenses,
    updatedAt: new Date().toISOString(),
  };
}

export function removeTravelExpense(plan: TravelPlan, expenseId: string): TravelPlan {
  return {
    ...plan,
    expenses: plan.expenses.filter((item) => item.id !== expenseId),
    updatedAt: new Date().toISOString(),
  };
}

export function createExpenseDraft(input: {
  title: string;
  amount: number;
  currency: string;
  date: string;
  category: TravelExpense['category'];
  notes?: string;
  paidById: string;
  splitWithIds: string[];
  existing?: TravelExpense;
}): TravelExpense {
  const now = new Date().toISOString();
  return {
    id: input.existing?.id ?? newId('expense'),
    title: input.title.trim(),
    amount: input.amount,
    currency: normalizeCurrencyCode(input.currency),
    date: input.date,
    category: input.category,
    notes: input.notes?.trim() || undefined,
    paidById: input.paidById,
    splitWithIds: input.splitWithIds.length > 0 ? input.splitWithIds : [input.paidById],
    createdAt: input.existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function defaultSplitIds(
  participants: TravelParticipant[],
  includeHost = false,
): string[] {
  const ids = [TRAVEL_EXPENSE_SELF_ID, ...participants.map((p) => p.id)];
  if (includeHost) ids.splice(1, 0, TRAVEL_EXPENSE_HOST_ID);
  return [...new Set(ids)];
}
