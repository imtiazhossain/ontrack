import { StyleSheet, View } from 'react-native';

import { ErrorMessage, Input } from '@/components/primitives';
import { AddressAutofindField } from '@/features/travel/address-autofind-field';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import type { useAutoGrowingNote } from '@/features/travel/use-auto-growing-note';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type StayAddressFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TravelItineraryStayAddressField({
  value,
  onChange,
}: StayAddressFieldProps) {
  const chrome = itinerarySheetChrome(useTheme());

  return (
    <AddressAutofindField
      value={value}
      onChange={onChange}
      stackedLabel="Address"
      placeholder="Enter the full address"
      accessibilityLabel="Address, optional"
      {...itinerarySheetFieldProps(chrome, 'location')}
    />
  );
}

type StayFieldsProps = {
  value: StayDetailsDraft;
  error?: string;
  onChange: (value: StayDetailsDraft) => void;
};

export function TravelItineraryStayFields({
  value,
  error,
  onChange,
}: StayFieldsProps) {
  const chrome = itinerarySheetChrome(useTheme());
  const { spacing: rs } = useResponsive();

  return (
    <>
      <Input
        value={value.confirmationCode}
        onChangeText={(confirmationCode) => onChange({ ...value, confirmationCode })}
        icon="shield"
        stackedLabel="Confirmation Code"
        placeholder="Enter confirmation or reservation code"
        accessibilityLabel="Confirmation Code"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={24}
        {...itinerarySheetFieldProps(chrome, 'shield')}
      />
      <View style={[styles.twoColumns, { gap: rs.sm }]}>
        <View style={styles.flex}>
          <Input
            value={value.price}
            onChangeText={(price) => onChange({ ...value, price })}
            icon="currency"
            stackedLabel="Price"
            placeholder="0.00"
            accessibilityLabel="Price"
            keyboardType="decimal-pad"
            {...itinerarySheetFieldProps(chrome, 'import')}
          />
        </View>
        <View style={styles.flex}>
          <Input
            value={value.currency}
            onChangeText={(currency) =>
              onChange({ ...value, currency: currency.toUpperCase() })
            }
            icon="wallet"
            stackedLabel="Currency"
            placeholder="USD"
            accessibilityLabel="Currency"
            autoCapitalize="characters"
            maxLength={3}
            autoCorrect={false}
            {...itinerarySheetFieldProps(chrome, 'shield')}
          />
        </View>
      </View>
      <Input
        value={value.reservationEmail}
        onChangeText={(reservationEmail) =>
          onChange({ ...value, reservationEmail })
        }
        icon="personal"
        stackedLabel="Reservation Email"
        placeholder="Email used when booking"
        accessibilityLabel="Reservation Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={120}
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
    </>
  );
}

type StayNotesFieldProps = {
  value: StayDetailsDraft;
  maxLength: number;
  note: ReturnType<typeof useAutoGrowingNote>;
  onChange: (value: StayDetailsDraft) => void;
};

export function TravelItineraryStayNotesField({
  value,
  maxLength,
  note,
  onChange,
}: StayNotesFieldProps) {
  const chrome = itinerarySheetChrome(useTheme());

  return (
    <Input
      value={value.notes}
      onChangeText={(nextValue) => {
        const notes = nextValue.slice(0, maxLength);
        note.collapseWhenEmpty(notes);
        onChange({ ...value, notes });
      }}
      icon="note"
      stackedLabel="Notes"
      placeholder="Wifi, door codes, parking, or anything helpful…"
      accessibilityLabel="Notes"
      multiline
      scrollEnabled={false}
      maxLength={maxLength}
      textAlignVertical="top"
      onContentSizeChange={note.onContentSizeChange}
      style={note.style}
      {...itinerarySheetFieldProps(chrome, 'note')}
    />
  );
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
});
