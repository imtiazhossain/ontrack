import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

import {
    AppText,
    Button,
    Symbol,
} from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { appTextStyle, radii, spacing } from '@/design-system';
import {
    buildExpenseFromForm,
    emptyExpenseForm,
    expenseFormFromExpense,
    TravelExpenseForm,
    type ExpenseFormState,
} from '@/features/travel/expenses/expense-form';
import {
    expenseInBase,
    expensePayerLabel,
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
import {
    flightExpenseDisplayTitle,
    withRoundTripFlightExpenseTitles,
} from '@/features/travel/flight-expense-title';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { kindChrome } from '@/features/travel/travel-kind-chrome';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import {
    travelAccent,
    TravelSectionLabel,
    TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import {
    TRAVEL_EXPENSE_SELF_ID,
    type TravelExpense,
    type TravelExpenseCategory,
    type TravelItemKind,
    type TravelPlan,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
    isTravelExpenseMemberPlan,
    publishTravelTripExpenses,
    pullTravelTripExpenses,
    shouldSyncTravelExpenses,
} from '@/services/travel/expense-collaboration';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { formatDateLong } from '@/utils/date';

const CATEGORY_ICONS: Record<TravelExpenseCategory, AppIconName> = {
  flight: 'flight',
  stay: 'lodging',
  food: 'food',
  transport: 'vehicles',
  activity: 'list',
  shopping: 'groceries',
  other: 'receipt',
};

/** Map expense categories onto itinerary kind chrome when they have a counterpart. */
function expenseCategoryKind(category: TravelExpenseCategory): TravelItemKind | undefined {
  switch (category) {
    case 'flight':
      return 'flight';
    case 'stay':
      return 'stay';
    case 'transport':
      return 'transport';
    case 'activity':
      return 'activity';
    default:
      return undefined;
  }
}

export function TravelExpensesSheet({
  plan,
  visible,
  initialForm,
  onClose,
  onSavePlan,
  onSaved,
}: {
  plan: TravelPlan;
  visible: boolean;
  initialForm?: ExpenseFormState;
  onClose: () => void;
  onSavePlan: (plan: TravelPlan) => void;
  onSaved?: (result: { mode: 'create' | 'edit' }) => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const [rates, setRates] = useState<FxRates | undefined>();
  const [form, setForm] = useState<ExpenseFormState | undefined>();
  const [formError, setFormError] = useState<string>();
  const [editingExpenseId, setEditingExpenseId] = useState<string | undefined>();
  const hasLocalExpenseEditsRef = useRef(false);
  const formRef = useRef<ExpenseFormState | undefined>(undefined);
  const editingExpenseIdRef = useRef<string | undefined>(undefined);
  const repairAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    editingExpenseIdRef.current = editingExpenseId;
  }, [editingExpenseId]);

  useEffect(() => {
    if (visible) return;
    hasLocalExpenseEditsRef.current = false;
  }, [visible]);

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

  useEffect(() => {
    if (!visible) return;
    if (initialForm) {
      queueMicrotask(() => {
        setForm(initialForm);
        setEditingExpenseId(initialForm.existing?.id);
      });
    }
  }, [visible, initialForm]);

  useEffect(() => {
    if (!visible) {
      repairAppliedRef.current = null;
      return;
    }
    if (repairAppliedRef.current === plan.id) return;
    const next = withRoundTripFlightExpenseTitles(plan);
    if (next !== plan) {
      repairAppliedRef.current = plan.id;
      onSavePlan(next);
    }
  }, [visible, plan.id, onSavePlan]);

  useEffect(() => {
    if (!visible || !shouldSyncTravelExpenses(plan)) return;
    let active = true;
    void pullTravelTripExpenses(plan)
      .then(async (merged) => {
        if (!active) return;
        if (hasLocalExpenseEditsRef.current) return;
        const current = merged ?? plan;
        if (merged) onSavePlan(merged);
        // Host: push local expenses so friends can pull them.
        if (
          !isTravelExpenseMemberPlan(current) &&
          current.expenses.length > 0
        ) {
          await publishTravelTripExpenses(current).catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // Pull when the sheet opens for a trip — not on every plan field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only sync
  }, [visible, plan.id]);

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

  const syncSharedExpenses = (next: TravelPlan) => {
    if (!shouldSyncTravelExpenses(next)) return;
    void publishTravelTripExpenses(next).catch(() => undefined);
  };

  const applyLocalExpenseEdit = (next: TravelPlan): TravelPlan => {
    hasLocalExpenseEditsRef.current = true;
    if (!shouldSyncTravelExpenses(next)) return next;
    return {
      ...next,
      sharedExpensesUpdatedAt: new Date().toISOString(),
    };
  };

  const beginAdd = () => {
    setFormError(undefined);
    setEditingExpenseId(undefined);
    setForm(emptyExpenseForm(plan));
  };

  const beginEdit = (expense: TravelExpense) => {
    setFormError(undefined);
    setEditingExpenseId(expense.id);
    setForm(expenseFormFromExpense(expense));
  };

  const saveForm = () => {
    if (!form) return;
    const built = buildExpenseFromForm(form);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    const latestPlan =
      useTravel.getState().plans.find((entry) => entry.id === plan.id) ?? plan;
    const existingForEdit = editingExpenseId
      ? latestPlan.expenses.find((entry) => entry.id === editingExpenseId)
      : undefined;
    const saveMode = existingForEdit ? 'edit' : 'create';
    const expenseToSave = existingForEdit
      ? {
          ...built.expense,
          id: existingForEdit.id,
          createdAt: existingForEdit.createdAt,
        }
      : built.expense;
    const next = applyLocalExpenseEdit(upsertTravelExpense(latestPlan, expenseToSave));
    onSavePlan(next);
    syncSharedExpenses(next);
    setForm(undefined);
    setFormError(undefined);
    setEditingExpenseId(undefined);
    onSaved?.({ mode: saveMode });
  };

  const deleteExpense = (expenseId: string) => {
    const latestPlan =
      useTravel.getState().plans.find((entry) => entry.id === plan.id) ?? plan;
    const next = applyLocalExpenseEdit(removeTravelExpense(latestPlan, expenseId));
    onSavePlan(next);
    syncSharedExpenses(next);
    setForm(undefined);
    setFormError(undefined);
    setEditingExpenseId(undefined);
  };

  const requestDelete = () => {
    const expenseId = editingExpenseIdRef.current ?? formRef.current?.existing?.id;
    if (!expenseId) return;
    const title =
      formRef.current?.existing?.title?.trim() ||
      formRef.current?.title?.trim() ||
      'this expense';
    confirmDestructiveAction({
      title: 'Delete Expense?',
      message: `This action will permanently remove “${title}”.`,
      actionLabel: 'Delete Expense',
      confirmTestID: AgentUiIds.travel.expenses.confirmDelete,
      onConfirm: () => deleteExpense(expenseId),
    });
  };

  const dismissForm = () => {
    setForm(undefined);
    setFormError(undefined);
    setEditingExpenseId(undefined);
  };

  const closeSheet = () => {
    dismissForm();
    onClose();
  };

  const editingExpense = Boolean(editingExpenseId ?? form?.existing?.id);

  return (
    <>
    <TravelSheetModal
      visible={visible}
      eyebrow="Expenses"
      title={form ? (editingExpense ? 'Edit Expense' : 'Add Expense') : plan.title}
      subtitle={
        form
          ? editingExpense
            ? 'Update what you spent and who shared it'
            : 'Add what you spent and who shared it'
          : 'Track spending · Settle up with co-travelers'
      }
      closeAccessibilityLabel={form ? 'Close expense editor' : 'Close Expenses'}
      closeTestID={AgentUiIds.travel.expenses.close}
      onClose={form ? dismissForm : closeSheet}
      scrollKey={form ? (form.existing?.id ?? 'add') : 'list'}
      footer={
        form ? (
          <View style={styles.editorFooterActions}>
            <ItinerarySheetSubmitButton
              label={editingExpense ? 'Save Expense' : 'Add Expense'}
              icon="receipt"
              testID={
                editingExpense
                  ? AgentUiIds.travel.expenses.saveExpense
                  : AgentUiIds.travel.expenses.submitExpense
              }
              onPress={saveForm}
            />
            {editingExpense ? (
              <Button
                variant="danger"
                icon="delete"
                testID={AgentUiIds.travel.expenses.deleteExpenseFooter}
                onPress={requestDelete}
              >
                Delete Expense
              </Button>
            ) : null}
          </View>
        ) : (
          <TravelSheetPrimaryAction
            label="Add Expense"
            testID={AgentUiIds.travel.expenses.addExpense}
            onPress={beginAdd}
          />
        )
      }>
            {form ? (
                <TravelExpenseForm
                  plan={plan}
                  form={form}
                  rates={rates}
                  error={formError}
                  onChange={(next) => {
                    setForm(next);
                  }}
                  onDelete={undefined}
                />
              ) : (
              <View style={styles.listBody}>
                <TravelSurfaceCard bodyStyle={styles.summaryCard} padding={rs.md}>
                  <AppText
                    variant="overline"
                    fit
                    style={[styles.summaryLabel, { color: travelAccent(theme) }]}>
                    Trip total · {plan.baseCurrency}
                  </AppText>
                  <AppText
                    fit
                    selectable
                    numberOfLines={1}
                    style={[
                      styles.summaryValue,
                      {
                        color: travelAccent(theme),
                        fontSize: Math.max(32, s(38)),
                        lineHeight: Math.max(38, s(44)),
                      },
                    ]}>
                    {convertible || plan.expenses.length === 0
                      ? formatMoney(total, plan.baseCurrency, dateLocale)
                      : '—'}
                  </AppText>
                </TravelSurfaceCard>

                {transfers.length > 0 ? (
                  <View style={styles.block}>
                    <TravelSectionLabel title="Settle Up" count={transfers.length} />
                    {transfers.map((transfer) => (
                      <TravelSurfaceCard key={`${transfer.fromId}-${transfer.toId}`} bodyStyle={styles.settleCard}>
                        <View
                          style={[
                            styles.settleIcon,
                            { backgroundColor: theme.accentFaint },
                          ]}>
                          <Symbol name="wallet" size="sm" color={theme.accentPrimary} />
                        </View>
                        <View style={styles.settleCopy}>
                          <AppText variant="callout" fit numberOfLines={1}>
                            {transfer.fromId === TRAVEL_EXPENSE_SELF_ID
                              ? `You owe ${personName(people, transfer.toId)}`
                              : `${personName(people, transfer.fromId)} owes ${personName(people, transfer.toId)}`}
                          </AppText>
                        </View>
                        <AppText variant="subheading" color="accent" fit selectable>
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
                    const title = flightExpenseDisplayTitle(expense, plan);
                    const kind = expenseCategoryKind(expense.category);
                    const chrome = kind
                      ? kindChrome(kind, theme)
                      : { accent: theme.accentPrimary, tint: theme.accentFaint };
                    return (
                      <ExpenseRowButton
                        key={expense.id}
                        testID={AgentUiIds.travel.expenses.row(expense.id)}
                        label={`Edit ${title}`}
                        onPress={() => beginEdit(expense)}
                        style={styles.expensePress}>
                        <TravelSurfaceCard bodyStyle={styles.expenseCard} padding={rs.sm}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                width: s(44),
                                height: s(44),
                                backgroundColor: chrome.tint,
                              },
                            ]}>
                            <Symbol
                              name={CATEGORY_ICONS[expense.category]}
                              size="sm"
                              color={chrome.accent}
                            />
                          </View>
                          <View style={styles.expenseCopy}>
                            <AppText variant="body" fit numberOfLines={1} ellipsizeMode="tail">
                              {title}
                            </AppText>
                            <AppText variant="callout" color="secondary" fit numberOfLines={1}>
                              {formatDateLong(expense.date)} ·{' '}
                              {expensePayerLabel(people, expense.paidById)} paid
                            </AppText>
                          </View>
                          <View style={styles.amountCol}>
                            <AppText
                              variant="body"
                              color="accent"
                              fit
                              numberOfLines={1}
                              style={styles.expenseAmount}>
                              {formatMoney(expense.amount, expense.currency, dateLocale)}
                            </AppText>
                            {converted !== undefined && expense.currency !== plan.baseCurrency ? (
                              <AppText
                                variant="caption"
                                color="secondary"
                                fit
                                numberOfLines={1}
                                style={styles.expenseAmount}>
                                ≈ {formatMoney(converted, plan.baseCurrency, dateLocale)}
                              </AppText>
                            ) : null}
                          </View>
                          <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
                        </TravelSurfaceCard>
                      </ExpenseRowButton>
                    );
                  })
                )}

              </View>
            )}
      </TravelSheetModal>
    </>
  );
}

function ExpenseRowButton({
  testID,
  label,
  onPress,
  style,
  children,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  return (
    <AgentTestId testID={testID} label={label} onPress={onPress} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [pressed ? styles.pressed : undefined]}>
        {children}
      </Pressable>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  editorFooterActions: {
    gap: spacing.sm,
  },
  listBody: { gap: spacing.lg },
  summaryCard: { justifyContent: 'center', gap: spacing.sm },
  summaryLabel: {
    ...appTextStyle('overline'),
    letterSpacing: 2,
  },
  summaryValue: {
    ...appTextStyle('title'),
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  block: { gap: spacing.sm },
  settleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settleIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settleCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
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
    gap: spacing.xs,
  },
  categoryBadge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  amountCol: { alignItems: 'flex-end', flexShrink: 0, gap: spacing.xxs },
  expenseAmount: { fontVariant: ['tabular-nums'] },
});
