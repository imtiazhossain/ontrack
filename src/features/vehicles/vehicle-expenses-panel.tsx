import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    AppText,
    Button,
    Card,
    DateField,
    EmptyState,
    ErrorMessage,
    GlassIconWell,
    GlassPlate,
    IconButton,
    Input,
    SectionHeader,
    Symbol,
} from '@/components/primitives';
import { ChipRow } from '@/components/shared';
import { radii, type AppIconName } from '@/design-system';
import { formatMoney } from '@/features/travel/expenses/format-money';
import type { Vehicle, VehicleExpense, VehicleExpenseCategory } from '@/features/vehicles/types';
import { VEHICLE_EXPENSE_CATEGORIES } from '@/features/vehicles/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { formatDateLong, todayKey } from '@/utils/date';
import { newUuid } from '@/utils/id';
import { asPositiveNumber } from '@/utils/parse';

const CATEGORY_LABELS: Record<VehicleExpenseCategory, string> = {
  fuel: 'Fuel',
  maintenance: 'Service',
  insurance: 'Insurance',
  registration: 'Registration',
  parts: 'Parts',
  parking: 'Parking',
  tolls: 'Tolls',
  other: 'Other',
};

const CATEGORY_ICONS: Record<VehicleExpenseCategory, AppIconName> = {
  fuel: 'vehicles',
  maintenance: 'maintenance',
  insurance: 'shield',
  registration: 'calendar',
  parts: 'maintenance',
  parking: 'vehicles',
  tolls: 'receipt',
  other: 'receipt',
};

export function VehicleExpensesPanel({
  vehicle,
  onChange,
}: {
  vehicle: Vehicle;
  onChange: (next: Vehicle, summary: string, entityId?: string) => void;
}) {
  const theme = useTheme();
  const { spacing: gap, s } = useResponsive();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [category, setCategory] = useState<VehicleExpenseCategory>('fuel');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string>();

  const total = useMemo(
    () => vehicle.expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [vehicle.expenses],
  );
  const sortedExpenses = useMemo(
    () =>
      [...vehicle.expenses].sort((left, right) => {
        const byDate = right.date.localeCompare(left.date);
        return byDate !== 0 ? byDate : right.createdAt.localeCompare(left.createdAt);
      }),
    [vehicle.expenses],
  );
  const average = vehicle.expenses.length > 0 ? total / vehicle.expenses.length : 0;

  const addExpense = () => {
    const name = title.trim();
    const value = asPositiveNumber(Number.parseFloat(amount.replace(',', '.')));
    if (!name) {
      setFormError('Add a short description.');
      return;
    }
    if (value === undefined) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    const now = new Date().toISOString();
    const expense: VehicleExpense = {
      id: newUuid(),
      title: name,
      amount: value,
      currency: vehicle.baseCurrency,
      date,
      category,
      notes: notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    onChange(
      {
        ...vehicle,
        expenses: [expense, ...vehicle.expenses],
        updatedAt: now,
      },
      `Added expense “${name}”`,
      expense.id,
    );
    setTitle('');
    setAmount('');
    setDate(todayKey());
    setCategory('fuel');
    setNotes('');
    setFormError(undefined);
  };

  const removeExpense = (expense: VehicleExpense) => {
    confirmDestructiveAction({
      title: 'Delete expense?',
      message: `This will permanently remove “${expense.title}”.`,
      actionLabel: 'Delete expense',
      confirmTestID: AgentUiIds.vehicles.expenses.confirmDelete,
      onConfirm: () => {
        onChange(
          {
            ...vehicle,
            expenses: vehicle.expenses.filter((item) => item.id !== expense.id),
            updatedAt: new Date().toISOString(),
          },
          `Removed expense “${expense.title}”`,
          expense.id,
        );
      },
    });
  };

  return (
    <View style={{ gap: gap.lg }}>
      <Card style={{ ...styles.summaryCard, gap: gap.md, padding: gap.lg }}>
        <View style={[styles.summaryTop, { gap: gap.md }]}>
          <GlassIconWell size={Math.max(48, s(52))} borderRadius={radii.md}>
            <Symbol name="receipt" size="md" color={theme.accentPrimary} />
          </GlassIconWell>
          <View style={styles.summaryCopy}>
            <AppText variant="overline" color="accent" fit>
              Total spent · {vehicle.baseCurrency}
            </AppText>
            <AppText
              variant="title"
              fit
              selectable
              style={styles.tabularNumber}>
              {formatMoney(total, vehicle.baseCurrency)}
            </AppText>
          </View>
        </View>
        <GlassPlate airy style={styles.summaryMetrics}>
          <View
            style={[
              styles.summaryMetricsInner,
              {
                gap: gap.md,
                padding: gap.md,
              },
            ]}>
            <View style={styles.summaryMetric}>
              <AppText variant="caption" color="tertiary" fit>
                Expenses
              </AppText>
              <AppText variant="callout" fit style={styles.tabularNumber}>
                {vehicle.expenses.length} recorded
              </AppText>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.separator }]} />
            <View style={styles.summaryMetric}>
              <AppText variant="caption" color="tertiary" fit>
                Average
              </AppText>
              <AppText variant="callout" fit selectable style={styles.tabularNumber}>
                {formatMoney(average, vehicle.baseCurrency)}
              </AppText>
            </View>
          </View>
        </GlassPlate>
      </Card>

      <View style={{ gap: gap.md }}>
        <SectionHeader
          title="Recent expenses"
          detail={`${vehicle.expenses.length}`}
        />
        {sortedExpenses.length === 0 ? (
          <Card>
            <EmptyState
              icon="receipt"
              title="No expenses yet"
              message="Track fuel, service, insurance, parking, and other vehicle costs here."
            />
          </Card>
        ) : (
          sortedExpenses.slice(0, 20).map((expense) => (
            <Card key={expense.id} style={{ padding: gap.md }}>
              <View style={[styles.expenseRow, { gap: gap.sm }]}>
                <GlassIconWell size={Math.max(44, s(46))} borderRadius={radii.md}>
                  <Symbol
                    name={CATEGORY_ICONS[expense.category]}
                    size="sm"
                    color={theme.accentPrimary}
                  />
                </GlassIconWell>
                <View style={[styles.expenseCopy, { gap: gap.xxs }]}>
                  <AppText variant="subheading" fit numberOfLines={1}>
                    {expense.title}
                  </AppText>
                  <AppText variant="caption" color="secondary" fit numberOfLines={1}>
                    {CATEGORY_LABELS[expense.category]} · {formatDateLong(expense.date)}
                  </AppText>
                  {expense.notes ? (
                    <AppText variant="caption" color="tertiary" numberOfLines={1}>
                      {expense.notes}
                    </AppText>
                  ) : null}
                </View>
                <AppText
                  variant="subheading"
                  fit
                  selectable
                  style={styles.tabularNumber}>
                  {formatMoney(expense.amount, expense.currency)}
                </AppText>
                <IconButton
                  icon="delete"
                  color={theme.danger}
                  accessibilityLabel={`Delete ${expense.title}`}
                  testID={AgentUiIds.vehicles.expenses.delete(expense.id)}
                  onPress={() => removeExpense(expense)}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="Add an expense" />
        <Card style={{ gap: gap.md, padding: gap.md }}>
          <Input
            icon="receipt"
            stackedLabel="What for?"
            value={title}
            onChangeText={(next) => {
              setTitle(next);
              setFormError(undefined);
            }}
            placeholder="Fill-up, oil change…"
            returnKeyType="next"
            testID={AgentUiIds.vehicles.expenses.title}
            accessibilityLabel="Expense description"
          />
          <Input
            icon="currency"
            stackedLabel={`Amount · ${vehicle.baseCurrency}`}
            value={amount}
            onChangeText={(next) => {
              setAmount(next);
              setFormError(undefined);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            testID={AgentUiIds.vehicles.expenses.amount}
            accessibilityLabel={`Expense amount in ${vehicle.baseCurrency}`}
          />
          <DateField
            stackedLabel="Date"
            value={date}
            onChange={setDate}
            testID={AgentUiIds.vehicles.expenses.date}
            accessibilityLabel="Expense date"
          />
          <View style={{ gap: gap.sm }}>
            <AppText variant="overline" color="tertiary" fit>
              Category
            </AppText>
            <ChipRow
              options={VEHICLE_EXPENSE_CATEGORIES.map((id) => ({
                value: id,
                label: CATEGORY_LABELS[id],
              }))}
              selected={category}
              onSelect={setCategory}
              scrollable
              testIDForOption={AgentUiIds.vehicles.expenses.category}
            />
          </View>
          <Input
            icon="note"
            stackedLabel="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional details"
            multiline
            maxLength={500}
            testID={AgentUiIds.vehicles.expenses.notes}
            accessibilityLabel="Expense notes"
          />
          {formError ? <ErrorMessage message={formError} selectable /> : null}
          <Button
            icon="add"
            onPress={addExpense}
            accessibilityLabel="Add vehicle expense"
            testID={AgentUiIds.vehicles.expenses.add}>
            Add expense
          </Button>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderCurve: 'continuous',
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  summaryCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  summaryMetrics: {
    borderRadius: radii.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  summaryMetricsInner: {
    flexDirection: 'row',
    zIndex: 1,
  },
  summaryMetric: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  expenseCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  tabularNumber: {
    fontVariant: ['tabular-nums'],
  },
});
