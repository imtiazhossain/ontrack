import {
  createExpenseDraft,
  defaultSplitIds,
  upsertTravelExpense,
} from '@/features/travel/expenses/expense-math';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import type { ParsedFlightConfirmation } from '@/features/travel/flight-confirmation-parser';
import {
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelFlightDetails,
  type TravelPlan,
} from '@/features/travel/types';

function confirmationNote(code?: string): string | undefined {
  const trimmed = code?.trim();
  return trimmed ? `Confirmation: ${trimmed.toUpperCase()}` : undefined;
}

export function findFlightExpense(
  expenses: TravelExpense[],
  confirmationCode?: string,
): TravelExpense | undefined {
  const note = confirmationNote(confirmationCode)?.toUpperCase();
  if (!note) return undefined;
  return expenses.find(
    (expense) =>
      expense.category === 'flight' &&
      expense.notes?.toUpperCase().includes(note),
  );
}

/** Upsert a Flight expense from a parsed confirmation total when amount is present. */
export function applyFlightExpenseFromImport(
  plan: TravelPlan,
  parsed: Pick<
    ParsedFlightConfirmation,
    'amount' | 'currency' | 'title' | 'date' | 'flight'
  > & {
    flight: Pick<TravelFlightDetails, 'airline' | 'confirmationCode' | 'flightNumber'> | {
      airline?: string;
      confirmationCode?: string;
      flightNumber?: string;
    };
  },
): TravelPlan {
  if (parsed.amount === undefined || !(parsed.amount > 0)) return plan;
  const confirmationCode =
    'confirmationCode' in parsed.flight
      ? parsed.flight.confirmationCode
      : undefined;
  const existing = findFlightExpense(plan.expenses, confirmationCode);
  const airline =
    'airline' in parsed.flight ? parsed.flight.airline?.trim() : undefined;
  const title =
    parsed.title?.trim() ||
    (airline ? `${airline} flight` : 'Flight');
  const expense = createExpenseDraft({
    title,
    amount: parsed.amount,
    currency: normalizeCurrencyCode(
      parsed.currency ?? plan.baseCurrency,
      plan.baseCurrency,
    ),
    date: parsed.date ?? plan.startDate,
    category: 'flight',
    notes: confirmationNote(confirmationCode),
    paidById: TRAVEL_EXPENSE_SELF_ID,
    splitWithIds: defaultSplitIds(plan.participants),
    existing,
  });
  return upsertTravelExpense(plan, expense);
}
