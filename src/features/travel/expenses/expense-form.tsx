import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useState } from 'react';

import {
  AppText,
  Button,
  DateField,
  ErrorMessage,
  Input,
} from '@/components/primitives';
import { FieldLeadingIcon } from '@/components/primitives/field-leading-icon';
import { radii, spacing } from '@/design-system';
import {
  CurrencyDropdown,
  ScrollableDropdown,
  currencyDisplayLabel,
} from '@/features/travel/expenses/currency-dropdown';
import {
  createExpenseDraft,
  defaultSplitIds,
  expensePeople,
  type ExpensePerson,
} from '@/features/travel/expenses/expense-math';
import { formatMoney } from '@/features/travel/expenses/format-money';
import {
  convertAmount,
  currencyOptionsForTrip,
  type FxRates,
} from '@/features/travel/expenses/fx-rates';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import {
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelExpenseCategory,
  type TravelPlan,
} from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { asPositiveNumber } from '@/utils/parse';

const CATEGORIES: { value: TravelExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transit' },
  { value: 'stay', label: 'Stay' },
  { value: 'flight', label: 'Flight' },
  { value: 'activity', label: 'Activity' },
  { value: 'shopping', label: 'Shop' },
  { value: 'other', label: 'Other' },
];

export interface ExpenseFormState {
  title: string;
  amountText: string;
  currency: string;
  date: string;
  category: TravelExpenseCategory;
  notes: string;
  paidById: string;
  splitWithIds: string[];
  existing?: TravelExpense;
}

export function emptyExpenseForm(
  plan: TravelPlan,
  preferredCurrency?: string,
): ExpenseFormState {
  return {
    title: '',
    amountText: '',
    currency: preferredCurrency ?? plan.baseCurrency,
    date: plan.startDate,
    category: 'food',
    notes: '',
    paidById: TRAVEL_EXPENSE_SELF_ID,
    splitWithIds: defaultSplitIds(plan.participants),
  };
}

export function expenseFormFromExpense(expense: TravelExpense): ExpenseFormState {
  return {
    title: expense.title,
    amountText: String(expense.amount),
    currency: expense.currency,
    date: expense.date,
    category: expense.category,
    notes: expense.notes ?? '',
    paidById: expense.paidById,
    splitWithIds: expense.splitWithIds,
    existing: expense,
  };
}

function PersonToggleRow({
  label,
  people,
  selectedIds,
  onToggle,
  single,
  tone,
  icon,
  style,
}: {
  label: string;
  people: ExpensePerson[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  single?: boolean;
  tone: SheetIconTone;
  icon: 'wallet' | 'people';
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const iconTone = chrome.icons[tone];
  return (
    <View
      style={[
        styles.personField,
        {
          minHeight: Math.max(72, s(76)),
          padding: rs.md,
          gap: rs.sm,
          backgroundColor: chrome.fieldBg,
        },
        style,
      ]}>
      <View style={[styles.personFieldHeader, { gap: rs.sm }]}>
        <FieldLeadingIcon
          name={icon}
          backgroundColor={iconTone.bg}
          color={iconTone.fg}
        />
        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={{ color: chrome.label, fontWeight: '600' }}>
          {label}
        </AppText>
      </View>
      <View style={[styles.personWrap, { gap: rs.xs }]}>
        {people.map((person) => {
          const active = selectedIds.includes(person.id);
          return (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onToggle(person.id)}
              style={[
                styles.personChip,
                {
                  minHeight: Math.max(36, s(38)),
                  paddingHorizontal: rs.md,
                  paddingVertical: rs.xs,
                  backgroundColor: active ? theme.accentFaint : chrome.sheetBg,
                  borderColor: active ? theme.accentPrimary : 'transparent',
                },
              ]}>
              <AppText
                variant="callout"
                color={active ? 'accent' : 'secondary'}
                fit
                numberOfLines={1}>
                {single ? person.name : active ? `✓ ${person.name}` : person.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TravelExpenseForm({
  plan,
  form,
  rates,
  error,
  onChange,
  onDelete,
}: {
  plan: TravelPlan;
  form: ExpenseFormState;
  rates: FxRates | undefined;
  error?: string;
  onChange: (next: ExpenseFormState) => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing: rs } = useResponsive();
  const people = expensePeople(plan);
  const [openDropdown, setOpenDropdown] = useState<'currency' | 'category' | null>(
    null,
  );
  const amount = asPositiveNumber(Number.parseFloat(form.amountText.replace(',', '.')));
  const converted =
    amount !== undefined && form.currency !== plan.baseCurrency && rates
      ? convertAmount(amount, form.currency, plan.baseCurrency, rates)
      : undefined;
  const currencyOptions = currencyOptionsForTrip([
    plan.baseCurrency,
    form.currency,
    ...plan.expenses.map((item) => item.currency),
  ]).map((option) => ({
    value: option.value,
    label: currencyDisplayLabel(option.value),
  }));

  return (
    <View style={[styles.form, { gap: rs.sm }]}>
      <Input
        icon="receipt"
        stackedLabel="What for?"
        value={form.title}
        onChangeText={(title) => onChange({ ...form, title })}
        placeholder="Dinner, taxi, museum…"
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      <Input
        icon="currency"
        stackedLabel="Amount"
        value={form.amountText}
        onChangeText={(amountText) => onChange({ ...form, amountText })}
        placeholder="0"
        keyboardType="decimal-pad"
        {...itinerarySheetFieldProps(chrome, 'import')}
      />
      <CurrencyDropdown
        label="Currency"
        icon="wallet"
        value={form.currency}
        options={currencyOptions}
        open={openDropdown === 'currency'}
        onOpenChange={(next) => setOpenDropdown(next ? 'currency' : null)}
        onChange={(currency) => onChange({ ...form, currency })}
        iconBackground={chrome.icons.shield.bg}
        iconColor={chrome.icons.shield.fg}
        fieldBackground={chrome.fieldBg}
        labelColor={chrome.label}
      />
      {converted !== undefined ? (
        <AppText variant="callout" color="accent">
          ≈ {formatMoney(converted, plan.baseCurrency)} {plan.baseCurrency}
        </AppText>
      ) : form.currency !== plan.baseCurrency && !rates ? (
        <AppText variant="caption" color="secondary">
          Conversion unavailable offline — amount stays in {form.currency}.
        </AppText>
      ) : null}

      <DateField
        stackedLabel="Date"
        value={form.date}
        onChange={(date) => onChange({ ...form, date })}
        minimumDate={plan.startDate}
        maximumDate={plan.endDate}
        {...itinerarySheetFieldProps(chrome, 'calendar')}
      />

      <ScrollableDropdown
        label="Category"
        icon="list"
        value={form.category}
        options={CATEGORIES}
        open={openDropdown === 'category'}
        onOpenChange={(next) => setOpenDropdown(next ? 'category' : null)}
        onChange={(category) =>
          onChange({ ...form, category: category as TravelExpenseCategory })
        }
        iconBackground={chrome.icons.lodging.bg}
        iconColor={chrome.icons.lodging.fg}
        fieldBackground={chrome.fieldBg}
        labelColor={chrome.label}
      />

      <View style={styles.row}>
        <PersonToggleRow
          label="Paid By"
          people={people}
          selectedIds={[form.paidById]}
          single
          icon="wallet"
          tone="shield"
          style={styles.flex}
          onToggle={(paidById) => {
            const splitWithIds = form.splitWithIds.includes(paidById)
              ? form.splitWithIds
              : [...form.splitWithIds, paidById];
            onChange({ ...form, paidById, splitWithIds });
          }}
        />
        <PersonToggleRow
          label="Split With"
          people={people}
          selectedIds={form.splitWithIds}
          icon="people"
          tone="lodging"
          style={styles.flex}
          onToggle={(id) => {
            const selected = form.splitWithIds.includes(id)
              ? form.splitWithIds.filter((item) => item !== id)
              : [...form.splitWithIds, id];
            onChange({
              ...form,
              splitWithIds: selected.length > 0 ? selected : [form.paidById],
            });
          }}
        />
      </View>

      <Input
        icon="note"
        stackedLabel="Notes"
        value={form.notes}
        onChangeText={(notes) => onChange({ ...form, notes })}
        placeholder="Optional"
        multiline
        maxLength={1000}
        {...itinerarySheetFieldProps(chrome, 'note')}
      />

      {error ? <ErrorMessage message={error} /> : null}

      {onDelete ? (
        <Button variant="danger" onPress={onDelete}>
          Delete expense
        </Button>
      ) : null}
    </View>
  );
}

export function buildExpenseFromForm(
  form: ExpenseFormState,
): { ok: true; expense: TravelExpense } | { ok: false; error: string } {
  const title = form.title.trim();
  if (!title) return { ok: false, error: 'Add a short description.' };
  const amount = asPositiveNumber(Number.parseFloat(form.amountText.replace(',', '.')));
  if (amount === undefined) return { ok: false, error: 'Enter an amount greater than zero.' };
  if (!/^[A-Z]{3}$/.test(form.currency)) return { ok: false, error: 'Pick a currency.' };
  if (form.splitWithIds.length === 0) return { ok: false, error: 'Split with at least one person.' };

  return {
    ok: true,
    expense: createExpenseDraft({
      title,
      amount,
      currency: form.currency,
      date: form.date,
      category: form.category,
      notes: form.notes,
      paidById: form.paidById,
      splitWithIds: form.splitWithIds,
      existing: form.existing,
    }),
  };
}

const styles = StyleSheet.create({
  form: {},
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  personField: { borderRadius: radii.lg, borderCurve: 'continuous' },
  personFieldHeader: { flexDirection: 'row', alignItems: 'center' },
  personWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  personChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: '100%',
  },
});
