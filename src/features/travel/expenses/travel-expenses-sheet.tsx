import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  Card,
  IconButton,
  SectionHeader,
  Symbol,
} from '@/components/primitives';
import { MetricDisplay } from '@/components/shared';
import type { AppIconName } from '@/design-system';
import { layout, radii, spacing } from '@/design-system';
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
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { formatDateKey } from '@/utils/date';const CATEGORY_ICONS: Record<TravelExpenseCategory, AppIconName> = {
  flight: 'flight',
  stay: 'lodging',
  food: 'food',
  transport: 'flight',
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
  const insets = useSafeAreaInsets();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [rates, setRates] = useState<FxRates | undefined>();
  const [ratesStale, setRatesStale] = useState(false);
  const [form, setForm] = useState<ExpenseFormState | undefined>();
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void loadFxRates({ signal: controller.signal })
      .then((result) => {
        setRates(result.rates);
        setRatesStale(result.stale);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setForm(undefined);
      setFormError(undefined);
    }
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
    setForm(emptyExpenseForm(plan));
  };

  const beginEdit = (expense: TravelExpense) => {
    setFormError(undefined);
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
  };

  const deleteCurrent = () => {
    if (!form?.existing) return;
    confirmDestructiveAction({
      title: 'Delete expense?',
      message: `Remove “${form.existing.title}”?`,
      onConfirm: () => {
        onSavePlan(removeTravelExpense(plan, form.existing!.id));
        setForm(undefined);
        setFormError(undefined);
      },
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.overlayScrim, paddingTop: insets.top },
        ]}>
        <Pressable
          accessibilityLabel="Close expenses"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundPrimary,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.separator }]} />
          </View>
          <View style={styles.sheetHeader}>
            <View style={styles.flex}>
              <AppText variant="overline" color="accent">
                Expenses
              </AppText>
              <AppText variant="title">{plan.title}</AppText>
              <AppText variant="callout" color="secondary">
                Track spending in any currency · settle up with friends
              </AppText>
            </View>
            <IconButton
              icon="close"
              accessibilityLabel="Close expenses"
              onPress={onClose}
            />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.sheetContent}>
            {form ? (
              <TravelExpenseForm
                plan={plan}
                form={form}
                rates={rates}
                error={formError}
                onChange={setForm}
                onSave={saveForm}
                onCancel={() => {
                  setForm(undefined);
                  setFormError(undefined);
                }}
                onDelete={form.existing ? deleteCurrent : undefined}
              />
            ) : (
              <View style={styles.listBody}>
                <MetricDisplay
                  label={`Trip total · ${plan.baseCurrency}`}
                  value={
                    convertible || plan.expenses.length === 0
                      ? formatMoney(total, plan.baseCurrency, dateLocale)
                      : '—'
                  }
                  detail={
                    plan.expenses.length === 0
                      ? 'No expenses yet'
                      : convertible
                        ? `${plan.expenses.length} expense${plan.expenses.length === 1 ? '' : 's'}${
                            ratesStale && rates
                              ? ` · rates as of ${rates.date}`
                              : rates
                                ? ` · rates ${rates.date}`
                                : ' · conversion pending'
                          }`
                        : 'Some amounts need exchange rates'
                  }
                  accent={theme.accentPrimary}
                />

                {transfers.length > 0 ? (
                  <View style={styles.block}>
                    <SectionHeader title="Settle up" detail={`${transfers.length}`} />
                    {transfers.map((transfer) => (
                      <Card key={`${transfer.fromId}-${transfer.toId}`} variant="sunken" style={styles.settleCard}>
                        <AppText variant="callout">
                          {personName(people, transfer.fromId)} owes{' '}
                          {personName(people, transfer.toId)}
                        </AppText>
                        <AppText variant="subheading" color="accent">
                          {formatMoney(transfer.amount, plan.baseCurrency, dateLocale)}
                        </AppText>
                      </Card>
                    ))}
                  </View>
                ) : null}

                <SectionHeader
                  title="All expenses"
                  detail={`${sortedExpenses.length}`}
                />
                {sortedExpenses.length === 0 ? (
                  <Card variant="sunken" style={styles.emptyCard}>
                    <Symbol name="receipt" size="lg" color={theme.accentPrimary} />
                    <AppText variant="subheading">Start tracking</AppText>
                    <AppText variant="body" color="secondary" style={styles.emptyCopy}>
                      Add flights, food, taxis — in ISK, USD, or whatever you paid. We’ll convert
                      amounts for you.
                    </AppText>
                  </Card>
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
                        <Card variant="sunken" style={styles.expenseCard}>
                          <View
                            style={[
                              styles.categoryBadge,
                              { backgroundColor: theme.accentFaint },
                            ]}>
                            <Symbol
                              name={CATEGORY_ICONS[expense.category]}
                              size="sm"
                              color={theme.accentPrimary}
                            />
                          </View>
                          <View style={styles.expenseCopy}>
                            <AppText variant="subheading">{expense.title}</AppText>
                            <AppText variant="caption" color="secondary">
                              {CATEGORY_LABELS[expense.category]} ·{' '}
                              {formatDateKey(expense.date, dateDisplayFormat)} ·{' '}
                              {personName(people, expense.paidById)} paid
                            </AppText>
                          </View>
                          <View style={styles.amountCol}>
                            <AppText variant="subheading" color="accent">
                              {formatMoney(expense.amount, expense.currency, dateLocale)}
                            </AppText>
                            {converted !== undefined && expense.currency !== plan.baseCurrency ? (
                              <AppText variant="caption" color="secondary">
                                ≈ {formatMoney(converted, plan.baseCurrency, dateLocale)}
                              </AppText>
                            ) : null}
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })
                )}

                <Button icon="add" onPress={beginAdd}>
                  Add expense
                </Button>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: { flex: 1, gap: spacing.xxs },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listBody: { gap: spacing.lg },
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
    gap: spacing.md,
  },
  categoryBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseCopy: { flex: 1, gap: spacing.xxs },
  amountCol: { alignItems: 'flex-end', gap: 2 },
});
