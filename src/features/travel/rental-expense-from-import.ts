import {
    createExpenseDraft,
    defaultSplitIds,
    upsertTravelExpense,
} from '@/features/travel/expenses/expense-math';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import type { ParsedRentalConfirmation } from '@/features/travel/rental-confirmation-parser';
import { isTravelMemberPlan } from '@/features/travel/trip-roster';
import {
    TRAVEL_EXPENSE_SELF_ID,
    type TravelExpense,
    type TravelPlan,
    type TravelRentalDetails,
} from '@/features/travel/types';

function confirmationNote(code?: string): string | undefined {
  const trimmed = code?.trim();
  return trimmed ? `Confirmation: ${trimmed.toUpperCase()}` : undefined;
}

export function findRentalExpense(
  expenses: TravelExpense[],
  confirmationCode?: string,
): TravelExpense | undefined {
  const note = confirmationNote(confirmationCode)?.toUpperCase();
  if (!note) return undefined;
  return expenses.find(
    (expense) =>
      expense.category === 'transport' &&
      expense.notes?.toUpperCase().includes(note),
  );
}

/** Upsert a Transit expense from a parsed rental total when amount is present. */
export function applyRentalExpenseFromImport(
  plan: TravelPlan,
  parsed: Pick<ParsedRentalConfirmation, 'amount' | 'currency' | 'title' | 'date'> & {
    rental: Pick<TravelRentalDetails, 'company' | 'confirmationCode'> | {
      company?: string;
      confirmationCode?: string;
    };
  },
): TravelPlan {
  if (parsed.amount === undefined || !(parsed.amount > 0)) return plan;
  const confirmationCode =
    'confirmationCode' in parsed.rental
      ? parsed.rental.confirmationCode
      : undefined;
  const existing = findRentalExpense(plan.expenses, confirmationCode);
  const title =
    parsed.title?.trim() ||
    (parsed.rental.company
      ? `${parsed.rental.company} car rental`
      : 'Car rental');
  const expense = createExpenseDraft({
    title,
    amount: parsed.amount,
    currency: normalizeCurrencyCode(
      parsed.currency ?? plan.baseCurrency,
      plan.baseCurrency,
    ),
    date: parsed.date ?? plan.startDate,
    category: 'transport',
    notes: confirmationNote(confirmationCode),
    paidById: TRAVEL_EXPENSE_SELF_ID,
    splitWithIds: defaultSplitIds(
      plan.participants,
      isTravelMemberPlan(plan),
    ),
    existing,
  });
  return upsertTravelExpense(plan, expense);
}
