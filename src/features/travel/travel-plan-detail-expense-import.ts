import { useRef } from 'react';

import {
  expenseFormFromExpense,
  type ExpenseFormState,
} from '@/features/travel/expenses/expense-form';
import { ITEM_KINDS } from '@/features/travel/travel-itinerary-form';
import type { TravelImportResult } from '@/features/travel/travel-import-result-modal';
import type { TravelItemKind, TravelPlan } from '@/features/travel/types';

export function matchingImportedExpense(
  sourcePlan: TravelPlan,
  draft: ExpenseFormState,
) {
  const draftNote = draft.notes.trim().toUpperCase();
  if (draftNote) {
    const byNote = sourcePlan.expenses.find(
      (expense) =>
        expense.category === draft.category &&
        (expense.notes ?? '').toUpperCase().includes(draftNote),
    );
    if (byNote) return byNote;
  }
  const amount = Number(draft.amountText);
  const normalizedTitle = draft.title.trim().toLowerCase();
  return sourcePlan.expenses.find((expense) => {
    if (expense.category !== draft.category) return false;
    if (expense.date !== draft.date || expense.currency !== draft.currency) return false;
    if (
      normalizedTitle &&
      expense.title.trim().toLowerCase() !== normalizedTitle
    ) {
      return false;
    }
    return Number.isFinite(amount) && expense.amount === amount;
  });
}

type ExpenseImportOptions = {
  kind: TravelItemKind;
  preparedExpenseDraft?: ExpenseFormState;
  setPreparedExpenseDraft: (draft: ExpenseFormState | undefined) => void;
  setExpenseDraft: (draft: ExpenseFormState | undefined) => void;
  setOpenExpenseSheet: (open: boolean) => void;
  setImportResult: (result: TravelImportResult | null) => void;
};

export function useTravelPlanDetailExpenseImport({
  kind,
  preparedExpenseDraft,
  setPreparedExpenseDraft,
  setExpenseDraft,
  setOpenExpenseSheet,
  setImportResult,
}: ExpenseImportOptions) {
  const importResultExpenseRef = useRef<{
    plan: TravelPlan;
    draft: ExpenseFormState;
  } | null>(null);

  const openImportedExpenseReview = (
    sourcePlan: TravelPlan,
    draft: ExpenseFormState,
  ) => {
    const existing = matchingImportedExpense(sourcePlan, draft);
    setExpenseDraft(existing ? expenseFormFromExpense(existing) : draft);
    setOpenExpenseSheet(true);
  };

  const maybeShowImportedAddPrompt = (
    sourcePlan: TravelPlan,
    duplicateItinerary: boolean,
  ) => {
    if (!preparedExpenseDraft) return;
    const draft = preparedExpenseDraft;
    setPreparedExpenseDraft(undefined);
    const kindLabel =
      ITEM_KINDS.find((entry) => entry.value === kind)?.label ?? 'Item';
    importResultExpenseRef.current = { plan: sourcePlan, draft };
    setImportResult({ stage: 'imported', kindLabel, duplicateItinerary });
  };

  return {
    importResultExpenseRef,
    openImportedExpenseReview,
    maybeShowImportedAddPrompt,
  };
}
