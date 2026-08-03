import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  AppText,
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
  isRoundTripFlightExpense,
  withRoundTripFlightExpenseTitles,
} from '@/features/travel/flight-expense-title';
import {
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelExpenseCategory,
  type TravelItemKind,
  type TravelPlan,
} from '@/features/travel/types';
import { kindChrome } from '@/features/travel/travel-kind-chrome';
import {
  travelAccent,
  TravelSectionLabel,
  TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import {
  TravelRemoveConfirmModal,
  type TravelRemoveConfirmPayload,
} from '@/features/travel/travel-remove-confirm-modal';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  publishTravelTripExpenses,
  pullTravelTripExpenses,
  isTravelExpenseMemberPlan,
  shouldSyncTravelExpenses,
} from '@/services/travel/expense-collaboration';
import { usePreferences } from '@/store/preferences';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

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

/** Map expense categories onto itinerary kind chrome when they have a counterpart. */
function expenseCategoryKind(category: TravelExpenseCategory): TravelItemKind | undefined {
  switch (category) {
    case 'flight':
      return 'flight';
    case 'stay':
      return 'stay';
    case 'transport':
      return 'rental';
    case 'activity':
      return 'activity';
    default:
      return undefined;
  }
}

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
  const [rates, setRates] = useState<FxRates | undefined>();
  const [form, setForm] = useState<ExpenseFormState | undefined>();
  const [formError, setFormError] = useState<string>();
  const [removeConfirm, setRemoveConfirm] =
    useState<TravelRemoveConfirmPayload | null>(null);

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
    const next = withRoundTripFlightExpenseTitles(plan);
    if (next !== plan) onSavePlan(next);
  }, [visible, plan, onSavePlan]);

  useEffect(() => {
    if (!visible || !shouldSyncTravelExpenses(plan)) return;
    let active = true;
    void pullTravelTripExpenses(plan)
      .then(async (merged) => {
        if (!active) return;
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

  const beginAdd = () => {
    setFormError(undefined);
    setRemoveConfirm(null);
    setForm(emptyExpenseForm(plan));
  };

  const beginEdit = (expense: TravelExpense) => {
    setFormError(undefined);
    setRemoveConfirm(null);
    setForm(expenseFormFromExpense(expense));
  };

  const saveForm = () => {
    if (!form) return;
    const built = buildExpenseFromForm(form);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    const next = upsertTravelExpense(plan, built.expense);
    onSavePlan(next);
    syncSharedExpenses(next);
    setForm(undefined);
    setFormError(undefined);
    setRemoveConfirm(null);
  };

  const requestDelete = () => {
    if (!form?.existing) return;
    const expense = form.existing;
    setRemoveConfirm({
      title: 'Delete Expense?',
      message: `This action will permanently remove “${expense.title}”.`,
      actionLabel: 'Delete Expense',
      onConfirm: () => {
        const next = removeTravelExpense(plan, expense.id);
        onSavePlan(next);
        syncSharedExpenses(next);
        setForm(undefined);
        setFormError(undefined);
      },
    });
  };

  const dismissForm = () => {
    setForm(undefined);
    setFormError(undefined);
    setRemoveConfirm(null);
  };

  const closeSheet = () => {
    dismissForm();
    onClose();
  };

  const editingExpense = Boolean(form?.existing);

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
          : 'Track Spending · Settle up with co-travelers'
      }
      closeAccessibilityLabel={form ? 'Close expense editor' : 'Close Expenses'}
      closeTestID={AgentUiIds.travel.expenses.close}
      onClose={form ? dismissForm : closeSheet}
      scrollKey={form ? (form.existing?.id ?? 'add') : 'list'}
      footer={
        form ? (
          <ItinerarySheetSubmitButton
            label={editingExpense ? 'Save Expense' : 'Add Expense'}
            icon="receipt"
            onPress={saveForm}
          />
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
                    setRemoveConfirm(null);
                    setForm(next);
                  }}
                  onDelete={form.existing ? requestDelete : undefined}
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
                        <AppText variant="callout">
                          {transfer.fromId === TRAVEL_EXPENSE_SELF_ID
                            ? `You owe ${personName(people, transfer.toId)}`
                            : `${personName(people, transfer.fromId)} owes ${personName(people, transfer.toId)}`}
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
                    const title = flightExpenseDisplayTitle(expense, plan);
                    const categoryLabel =
                      expense.category === 'flight' && isRoundTripFlightExpense(expense, plan)
                        ? 'Flights'
                        : CATEGORY_LABELS[expense.category];
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
                        <TravelSurfaceCard bodyStyle={styles.expenseCard} padding={rs.md}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                width: Math.max(48, s(52)),
                                height: Math.max(48, s(52)),
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
                            <View style={styles.expenseTitleRow}>
                              <View style={styles.expenseTitle}>
                                <AppText
                                  variant="subheading"
                                  numberOfLines={1}
                                  ellipsizeMode="tail">
                                  {title}
                                </AppText>
                              </View>
                              <View style={styles.amountCol}>
                                <AppText variant="subheading" color="accent" numberOfLines={1}>
                                  {formatMoney(expense.amount, expense.currency, dateLocale)}
                                </AppText>
                                {converted !== undefined &&
                                expense.currency !== plan.baseCurrency ? (
                                  <AppText
                                    variant="callout"
                                    color="secondary"
                                    fit
                                    numberOfLines={1}>
                                    ≈ {formatMoney(converted, plan.baseCurrency, dateLocale)}
                                  </AppText>
                                ) : null}
                              </View>
                              <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
                            </View>
                            <AppText variant="body" color="secondary" numberOfLines={1}>
                              {categoryLabel} · {expensePayerLabel(people, expense.paidById)} paid
                            </AppText>
                          </View>
                        </TravelSurfaceCard>
                      </ExpenseRowButton>
                    );
                  })
                )}

              </View>
            )}
    </TravelSheetModal>
    <TravelRemoveConfirmModal
      payload={removeConfirm}
      onCancel={() => setRemoveConfirm(null)}
    />
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
  const agent = useAgentUiTarget(testID, { label, onPress });
  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [style, pressed ? styles.pressed : undefined]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listBody: { gap: spacing.lg },
  summaryCard: { justifyContent: 'center', gap: spacing.xxs },
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
    gap: spacing.sm,
  },
  categoryBadge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: spacing.xxs },
  expenseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  expenseTitle: { flex: 1, flexShrink: 1, minWidth: 0 },
  amountCol: { alignItems: 'flex-end', flexShrink: 0, gap: 2 },
});
