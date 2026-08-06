import {
    createExpenseDraft,
    defaultSplitIds,
    upsertTravelExpense,
} from '@/features/travel/expenses/expense-math';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import type { ParsedStayConfirmation } from '@/features/travel/stay-confirmation-parser';
import { isTravelMemberPlan } from '@/features/travel/trip-roster';
import {
    TRAVEL_EXPENSE_SELF_ID,
    type TravelExpense,
    type TravelPlan,
    type TravelStayDetails,
} from '@/features/travel/types';

function confirmationNote(code?: string): string | undefined {
  const trimmed = code?.trim();
  return trimmed ? `Confirmation: ${trimmed.toUpperCase()}` : undefined;
}

export function findStayExpense(
  expenses: TravelExpense[],
  confirmationCode?: string,
): TravelExpense | undefined {
  const note = confirmationNote(confirmationCode)?.toUpperCase();
  if (!note) return undefined;
  return expenses.find(
    (expense) =>
      expense.category === 'stay' &&
      expense.notes?.toUpperCase().includes(note),
  );
}

/** Upsert a Stay expense from a parsed stay total when amount is present. */
export function applyStayExpenseFromImport(
  plan: TravelPlan,
  parsed: Pick<ParsedStayConfirmation, 'amount' | 'currency' | 'title' | 'date'> & {
    stay: Pick<TravelStayDetails, 'confirmationCode'> | {
      confirmationCode?: string;
    };
  },
): TravelPlan {
  if (parsed.amount === undefined || !(parsed.amount > 0)) return plan;
  const confirmationCode =
    'confirmationCode' in parsed.stay
      ? parsed.stay.confirmationCode
      : undefined;
  const existing = findStayExpense(plan.expenses, confirmationCode);
  const title = parsed.title?.trim() || 'Stay lodging';
  const expense = createExpenseDraft({
    title,
    amount: parsed.amount,
    currency: normalizeCurrencyCode(
      parsed.currency ?? plan.baseCurrency,
      plan.baseCurrency,
    ),
    date: parsed.date ?? plan.startDate,
    category: 'stay',
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
