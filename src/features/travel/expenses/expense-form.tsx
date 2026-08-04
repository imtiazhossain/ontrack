import { useEffect, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  AppText,
  Button,
  DateField,
  ErrorMessage,
  Input,
  Symbol,
} from '@/components/primitives';
import { FieldLeadingIcon } from '@/components/primitives/field-leading-icon';
import { appTextStyle, radii, spacing } from '@/design-system';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import {
  CurrencyDropdown,
  ScrollableDropdown,
  currencyDisplayLabel,
} from '@/features/travel/expenses/currency-dropdown';
import {
  createExpenseDraft,
  defaultSplitIds,
  enrichExpensePeopleAvatars,
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
  travelInputFieldBackground,
  type SheetIconTone,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import {
  canonicalTravelTripId,
  isTravelMemberPlan,
  listTravelTripRoster,
} from '@/features/travel/trip-roster';
import {
  TRAVEL_EXPENSE_SELF_ID,
  type TravelExpense,
  type TravelExpenseCategory,
  type TravelPlan,
} from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useFriends } from '@/store/friends';
import { usePreferences } from '@/store/preferences';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
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

/** iOS decimal-pad has no return key — Done accessory dismisses the keyboard. */
const AMOUNT_ACCESSORY_ID = 'travel-expense-amount-done';

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
  const isMember = isTravelMemberPlan(plan);
  return {
    title: '',
    amountText: '',
    currency: preferredCurrency ?? plan.baseCurrency,
    date: plan.startDate,
    category: 'food',
    notes: '',
    paidById: TRAVEL_EXPENSE_SELF_ID,
    splitWithIds: defaultSplitIds(plan.participants, isMember),
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

function PersonAvatarToggle({
  person,
  active,
  single,
  selfDisplayName,
  testID,
  onToggle,
}: {
  person: ExpensePerson;
  active: boolean;
  single?: boolean;
  selfDisplayName: string;
  testID: string;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  const avatarSize = Math.max(36, s(38));
  const hit = Math.max(44, avatarSize + s(6));
  const displayName = person.isSelf
    ? selfDisplayName.trim() || person.name
    : person.name;
  return (
    <AgentTestId testID={testID} label={person.name} onPress={onToggle} style={styles.personAvatarHit}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={person.name}
        accessibilityState={{ selected: active }}
        onPress={onToggle}
        style={({ pressed }) => [
          {
            width: hit,
            height: hit,
            borderRadius: hit / 2,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ProfileAvatar
          displayName={displayName}
          userId={person.userId}
          isSelf={person.isSelf}
          size={avatarSize}
          accessibilityLabel={person.name}
          borderColor={active ? theme.accentPrimary : undefined}
          borderWidth={active ? 2 : undefined}
        />
        {!single && active ? (
          <View
            pointerEvents="none"
            style={[
              styles.personCheck,
              {
                width: Math.max(14, s(16)),
                height: Math.max(14, s(16)),
                borderRadius: Math.max(14, s(16)) / 2,
                backgroundColor: theme.accentPrimary,
                borderColor: theme.accentPrimary,
              },
            ]}>
            <Symbol name="check" size={12} color={theme.textOnAccent} />
          </View>
        ) : null}
      </Pressable>
    </AgentTestId>
  );
}

function PersonToggleRow({
  label,
  people,
  selectedIds,
  onToggle,
  single,
  tone,
  icon,
  selfDisplayName,
  testIdPrefix,
  style,
}: {
  label: string;
  people: ExpensePerson[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  single?: boolean;
  tone: SheetIconTone;
  icon: 'wallet' | 'people';
  selfDisplayName: string;
  testIdPrefix: string;
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
          backgroundColor: travelInputFieldBackground(theme),
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
            <PersonAvatarToggle
              key={person.id}
              person={person}
              active={active}
              single={single}
              selfDisplayName={selfDisplayName}
              testID={`${testIdPrefix}.${person.id}`}
              onToggle={() => onToggle(person.id)}
            />
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
  const friends = useFriends((state) => state.friends);
  const refreshFriends = useFriends((state) => state.refresh);
  const selfDisplayName = usePreferences((state) => state.name);
  const [rosterLookup, setRosterLookup] = useState<
    { userId: string; displayName: string }[]
  >([]);
  useEffect(() => {
    let active = true;
    void refreshFriends().catch(() => undefined);
    void listTravelTripRoster(canonicalTravelTripId(plan))
      .then((roster) => {
        if (!active) return;
        setRosterLookup(
          roster.map((person) => ({
            userId: person.userId,
            displayName: person.displayName,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [plan, refreshFriends]);
  const people = useMemo(
    () =>
      enrichExpensePeopleAvatars(expensePeople(plan), [
        ...friends.map((friend) => ({
          userId: friend.userId,
          displayName: friend.displayName,
        })),
        ...rosterLookup,
      ]),
    [plan, friends, rosterLookup],
  );
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
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
          <View
            style={[
              styles.accessory,
              {
                backgroundColor: chrome.sheetBg,
                borderTopColor: chrome.fieldBorder,
                paddingHorizontal: rs.lg,
                paddingVertical: rs.sm,
                minHeight: Math.max(44, rs.xl + rs.md),
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss keyboard"
              hitSlop={8}
              onPress={Keyboard.dismiss}
              style={({ pressed }) => [
                styles.accessoryDone,
                {
                  minHeight: Math.max(44, rs.xl),
                  paddingHorizontal: rs.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <AppText
                variant="callout"
                color="accent"
                fit
                numberOfLines={1}
                style={styles.accessoryDoneLabel}>
                Done
              </AppText>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      <Input
        icon="receipt"
        stackedLabel="What for?"
        value={form.title}
        onChangeText={(title) => onChange({ ...form, title })}
        placeholder="Dinner, taxi, museum…"
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={Keyboard.dismiss}
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
        inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
      />
      <CurrencyDropdown
        label="Currency"
        icon="wallet"
        value={form.currency}
        options={currencyOptions}
        open={openDropdown === 'currency'}
        onOpenChange={(next) => {
          Keyboard.dismiss();
          setOpenDropdown(next ? 'currency' : null);
        }}
        onChange={(currency) => onChange({ ...form, currency })}
        iconBackground={chrome.icons.shield.bg}
        iconColor={chrome.icons.shield.fg}
        fieldBackground={travelInputFieldBackground(theme)}
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
        onChange={(date) => {
          Keyboard.dismiss();
          onChange({ ...form, date });
        }}
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
        onOpenChange={(next) => {
          Keyboard.dismiss();
          setOpenDropdown(next ? 'category' : null);
        }}
        onChange={(category) =>
          onChange({ ...form, category: category as TravelExpenseCategory })
        }
        iconBackground={chrome.icons.lodging.bg}
        iconColor={chrome.icons.lodging.fg}
        fieldBackground={travelInputFieldBackground(theme)}
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
          selfDisplayName={selfDisplayName}
          testIdPrefix={AgentUiIds.travel.expenses.paidBy}
          style={styles.flex}
          onToggle={(paidById) => {
            Keyboard.dismiss();
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
          selfDisplayName={selfDisplayName}
          testIdPrefix={AgentUiIds.travel.expenses.splitWith}
          style={styles.flex}
          onToggle={(id) => {
            Keyboard.dismiss();
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
        <Button
          variant="danger"
          testID={AgentUiIds.travel.expenses.deleteExpense}
          onPress={onDelete}>
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
  personAvatarHit: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  personCheck: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  accessory: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryDone: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexShrink: 1,
    minWidth: 0,
  },
  accessoryDoneLabel: {
    ...appTextStyle('callout'),
  },
});
