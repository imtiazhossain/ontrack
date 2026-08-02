import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  Button,
  Symbol,
} from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { fontFamilies, radii, spacing } from '@/design-system';
import {
  buildExpenseFromForm,
  emptyExpenseForm,
  expenseFormFromExpense,
  TravelExpenseForm,
  type ExpenseFormState,
} from '@/features/travel/expenses/expense-form';
import {
  expenseInBase,
  expensePeople,
  personName,
  removeTravelExpense,
  settleBalances,
  settleTransfers,
  totalInBase,
  upsertTravelExpense,
} from '@/features/travel/expenses/expense-math';
import { formatMoney } from '@/features/travel/expenses/format-money';
import { loadFxRates, type FxRates } from '@/features/travel/expenses/fx-rates';
import type { TravelExpense, TravelExpenseCategory, TravelPlan } from '@/features/travel/types';
import {
  travelAccent,
  TravelSectionLabel,
  TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { formatDateKey } from '@/utils/date';

const CATEGORY_ICONS: Record<TravelExpenseCategory, AppIconName> = {
  flight: 'flight',
  stay: 'lodging',
  food: 'food',
  transport: 'vehicles',
  activity: 'list',
  shopping: 'groceries',
  other: 'receipt',
};

const CATEGORY_LABELS: Record<TravelExpenseCategory, string> = {
  flight: 'Flight',
  stay: 'Stay',
  food: 'Food',
  transport: 'Transit',
  activity: 'Activity',
  shopping: 'Shopping',
  other: 'Other',
};

export function TravelExpensesSheet({
  plan,
  visible,
  onClose,
  onSavePlan,
}: {
  plan: TravelPlan;
  visible: boolean;
  onClose: () => void;
  onSavePlan: (plan: TravelPlan) => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [rates, setRates] = useState<FxRates | undefined>();
  const [form, setForm] = useState<ExpenseFormState | undefined>();
  const [formError, setFormError] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void loadFxRates({ signal: controller.signal })
      .then((result) => {
        setRates(result.rates);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [visible]);

  const people = useMemo(() => expensePeople(plan), [plan]);
  const sortedExpenses = useMemo(
    () =>
      [...plan.expenses].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [plan.expenses],
  );
  const { total, convertible } = totalInBase(plan.expenses, plan.baseCurrency, rates);
  const balances = settleBalances(plan.expenses, plan.baseCurrency, rates);
  const transfers = balances ? settleTransfers(balances) : [];

  const beginAdd = () => {
    setFormError(undefined);
    setConfirmingDelete(false);
    setForm(emptyExpenseForm(plan));
  };

  const beginEdit = (expense: TravelExpense) => {
    setFormError(undefined);
    setConfirmingDelete(false);
    setForm(expenseFormFromExpense(expense));
  };

  const saveForm = () => {
    if (!form) return;
    const built = buildExpenseFromForm(form);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    onSavePlan(upsertTravelExpense(plan, built.expense));
    setForm(undefined);
    setFormError(undefined);
    setConfirmingDelete(false);
  };

  const requestDelete = () => {
    if (!form?.existing) return;
    // Confirm inside this Modal. Root appPrompt sits behind RN Modal windows,
    // so a nested confirm there is invisible / untappable.
    setConfirmingDelete(true);
  };

  const confirmDelete = () => {
    if (!form?.existing) return;
    const expenseId = form.existing.id;
    onSavePlan(removeTravelExpense(plan, expenseId));
    setForm(undefined);
    setFormError(undefined);
    setConfirmingDelete(false);
  };

  const dismissForm = () => {
    setForm(undefined);
    setFormError(undefined);
    setConfirmingDelete(false);
  };

  const closeSheet = () => {
    dismissForm();
    onClose();
  };

  const editingExpense = Boolean(form?.existing);

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="Expenses"
      title={form ? (editingExpense ? 'Edit Expense' : 'Add Expense') : plan.title}
      subtitle={
        form
          ? editingExpense
            ? 'Update what you spent and who shared it'
            : 'Add what you spent and who shared it'
          : 'Track Spending · Settle Up with Friends'
      }
      closeAccessibilityLabel={form ? 'Close expense editor' : 'Close Expenses'}
      onClose={form ? dismissForm : closeSheet}
      footer={
        form && !confirmingDelete ? (
          <ItinerarySheetSubmitButton
            label={editingExpense ? 'Save Expense' : 'Add Expense'}
            icon="receipt"
            onPress={saveForm}
          />
        ) : !form ? (
          <TravelSheetPrimaryAction label="Add expense" icon="add" onPress={beginAdd} />
        ) : undefined
      }>
            {form ? (
              confirmingDelete && form.existing ? (
                <View style={styles.deleteConfirm} accessibilityLabel="Confirm delete expense">
                  <Symbol name="delete" size="lg" color={theme.danger} />
                  <AppText variant="subheading" fit>
                    Delete expense?
                  </AppText>
                  <AppText variant="body" color="secondary" style={styles.deleteConfirmCopy}>
                    Remove “{form.existing.title}”? This can’t be undone.
                  </AppText>
                  <Button
                    variant="danger"
                    accessibilityLabel="Confirm delete expense"
                    onPress={confirmDelete}>
                    Delete expense
                  </Button>
                  <Button
                    variant="ghost"
                    accessibilityLabel="Cancel delete expense"
                    onPress={() => setConfirmingDelete(false)}>
                    Keep expense
                  </Button>
                </View>
              ) : (
                <TravelExpenseForm
                  plan={plan}
                  form={form}
                  rates={rates}
                  error={formError}
                  onChange={(next) => {
                    setConfirmingDelete(false);
                    setForm(next);
                  }}
                  onDelete={form.existing ? requestDelete : undefined}
                />
              )
            ) : (
              <View style={styles.listBody}>
                <TravelSurfaceCard bodyStyle={styles.summaryCard} padding={rs.lg}>
                  <AppText
                    variant="overline"
                    fit
                    style={[styles.summaryLabel, { color: travelAccent(theme) }]}>
                    Trip total · {plan.baseCurrency}
                  </AppText>
                  <AppText
                    fit
                    numberOfLines={1}
                    style={[
                      styles.summaryValue,
                      {
                        color: travelAccent(theme),
                        fontSize: Math.max(43, s(52)),
                        lineHeight: Math.max(49, s(58)),
                      },
                    ]}>
                    {convertible || plan.expenses.length === 0
                      ? formatMoney(total, plan.baseCurrency, dateLocale)
                      : '—'}
                  </AppText>
                  <AppText variant="callout" color="secondary" fit numberOfLines={1}>
                    {plan.expenses.length === 0
                      ? 'No expenses yet'
                      : convertible
                        ? `${plan.expenses.length} expense${plan.expenses.length === 1 ? '' : 's'}${
                            rates
                              ? ` · Rate from ${formatDateKey(rates.date, 'mdy')}`
                              : ' · conversion pending'
                          }`
                        : 'Some amounts need exchange rates'}
                  </AppText>
                </TravelSurfaceCard>

                {transfers.length > 0 ? (
                  <View style={styles.block}>
                    <TravelSectionLabel title="Settle Up" count={transfers.length} />
                    {transfers.map((transfer) => (
                      <TravelSurfaceCard key={`${transfer.fromId}-${transfer.toId}`} bodyStyle={styles.settleCard}>
                        <AppText variant="callout">
                          {personName(people, transfer.fromId)} owes{' '}
                          {personName(people, transfer.toId)}
                        </AppText>
                        <AppText variant="subheading" color="accent">
                          {formatMoney(transfer.amount, plan.baseCurrency, dateLocale)}
                        </AppText>
                      </TravelSurfaceCard>
                    ))}
                  </View>
                ) : null}

                <TravelSectionLabel title="All Expenses" count={sortedExpenses.length} />
                {sortedExpenses.length === 0 ? (
                  <TravelSurfaceCard bodyStyle={styles.emptyCard}>
                    <Symbol name="receipt" size="lg" color={theme.accentPrimary} />
                    <AppText variant="subheading">Start Tracking</AppText>
                    <AppText variant="body" color="secondary" style={styles.emptyCopy}>
                      Add flights, food, taxis — in ISK, USD, or whatever you paid. We’ll convert
                      amounts for you.
                    </AppText>
                  </TravelSurfaceCard>
                ) : (
                  sortedExpenses.map((expense) => {
                    const converted = expenseInBase(expense, plan.baseCurrency, rates);
                    return (
                      <Pressable
                        key={expense.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${expense.title}`}
                        onPress={() => beginEdit(expense)}
                        style={({ pressed }) => [
                          styles.expensePress,
                          pressed ? styles.pressed : undefined,
                        ]}>
                        <TravelSurfaceCard bodyStyle={styles.expenseCard} padding={rs.md}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                width: Math.max(48, s(52)),
                                height: Math.max(48, s(52)),
                                backgroundColor: theme.accentFaint,
                              },
                            ]}>
                            <Symbol
                              name={CATEGORY_ICONS[expense.category]}
                              size="sm"
                              color={theme.accentPrimary}
                            />
                          </View>
                          <View style={styles.expenseCopy}>
                            <AppText variant="subheading" fit numberOfLines={1}>
                              {expense.title}
                            </AppText>
                            <AppText variant="caption" color="secondary" fit numberOfLines={1}>
                              {CATEGORY_LABELS[expense.category]} ·{' '}
                              {formatDateKey(expense.date, dateDisplayFormat)} ·{' '}
                              {personName(people, expense.paidById)} paid
                            </AppText>
                          </View>
                          <View style={styles.amountCol}>
                            <AppText variant="subheading" color="accent" fit numberOfLines={1}>
                              {formatMoney(expense.amount, expense.currency, dateLocale)}
                            </AppText>
                            {converted !== undefined && expense.currency !== plan.baseCurrency ? (
                              <AppText variant="caption" color="secondary">
                                ≈ {formatMoney(converted, plan.baseCurrency, dateLocale)}
                              </AppText>
                            ) : null}
                          </View>
                          <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
                        </TravelSurfaceCard>
                      </Pressable>
                    );
                  })
                )}

              </View>
            )}
    </TravelSheetModal>
  );
}

const styles = StyleSheet.create({
  listBody: { gap: spacing.lg },
  summaryCard: { minHeight: 178, justifyContent: 'center' },
  summaryLabel: {
    fontFamily: fontFamilies.sans,
    fontWeight: '600',
    letterSpacing: 2,
  },
  summaryValue: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  block: { gap: spacing.sm },
  settleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyCopy: { textAlign: 'center' },
  expensePress: { borderRadius: radii.lg },
  pressed: { opacity: 0.72 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  amountCol: { alignItems: 'flex-end', flexShrink: 1, minWidth: 0, gap: 2 },
  deleteConfirm: {
    gap: spacing.md,
    alignItems: 'stretch',
    paddingVertical: spacing.md,
  },
  deleteConfirmCopy: { textAlign: 'center' },
});
