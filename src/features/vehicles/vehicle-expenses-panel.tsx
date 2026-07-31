import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Card, DateField, Input, SectionHeader } from '@/components/primitives';
import { ChipRow } from '@/components/shared';
import { formatMoney } from '@/features/travel/expenses/format-money';
import type { Vehicle, VehicleExpense, VehicleExpenseCategory } from '@/features/vehicles/types';
import { VEHICLE_EXPENSE_CATEGORIES } from '@/features/vehicles/types';
import { useResponsive } from '@/hooks/use-responsive';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { todayKey } from '@/utils/date';
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

export function VehicleExpensesPanel({
  vehicle,
  onChange,
}: {
  vehicle: Vehicle;
  onChange: (next: Vehicle, summary: string, entityId?: string) => void;
}) {
  const { spacing: gap } = useResponsive();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [category, setCategory] = useState<VehicleExpenseCategory>('fuel');
  const [notes, setNotes] = useState('');

  const total = useMemo(
    () => vehicle.expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [vehicle.expenses],
  );

  const addExpense = () => {
    const name = title.trim();
    const value = asPositiveNumber(Number(amount));
    if (!name || value === undefined) return;
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
    setNotes('');
  };

  const removeExpense = (expense: VehicleExpense) => {
    confirmDestructiveAction({
      title: 'Delete expense?',
      message: `Remove “${expense.title}”?`,
      actionLabel: 'Delete',
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
      <SectionHeader
        title="Expenses"
        detail={formatMoney(total, vehicle.baseCurrency)}
      />
      {vehicle.expenses.slice(0, 20).map((expense) => (
        <Card key={expense.id} onPress={() => removeExpense(expense)}>
          <AppText variant="heading" fit numberOfLines={1}>
            {expense.title}
          </AppText>
          <AppText variant="caption" color="secondary" fit numberOfLines={1}>
            {CATEGORY_LABELS[expense.category]} · {expense.date} ·{' '}
            {formatMoney(expense.amount, expense.currency)}
          </AppText>
        </Card>
      ))}
      <Input label="Title" value={title} onChangeText={setTitle} placeholder="Fill-up" />
      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <DateField label="Date" value={date} onChange={setDate} />
      <ChipRow
        options={VEHICLE_EXPENSE_CATEGORIES.map((id) => ({
          value: id,
          label: CATEGORY_LABELS[id],
        }))}
        selected={category}
        onSelect={setCategory}
        scrollable
      />
      <Input label="Notes" value={notes} onChangeText={setNotes} />
      <Button onPress={addExpense} accessibilityLabel="Add vehicle expense">
        Add expense
      </Button>
    </View>
  );
}
