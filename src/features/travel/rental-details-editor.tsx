import { StyleSheet, View } from 'react-native';

import { AppText, Button, DateField, ErrorMessage, Input, TimeField } from '@/components/primitives';
import { spacing } from '@/design-system';

import type { RentalDetailsDraft } from './rental-details';
import { travelOverlineStyle } from './travel-chrome';

interface RentalDetailsEditorProps {
  value: RentalDetailsDraft;
  onChange: (value: RentalDetailsDraft) => void;
  error?: string;
  onImport?: () => void;
  importing?: boolean;
  importedFileName?: string;
  planStartDate?: string;
  planEndDate?: string;
}

export function RentalDetailsEditor({
  value,
  onChange,
  error,
  onImport,
  importing = false,
  importedFileName,
  planStartDate,
  planEndDate,
}: RentalDetailsEditorProps) {
  const update = (field: keyof RentalDetailsDraft, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  const dropoffMinutes = value.dropoffMinutes.trim()
    ? Number(value.dropoffMinutes)
    : 10 * 60;
  const dropoffTimeValue =
    Number.isFinite(dropoffMinutes) &&
    dropoffMinutes >= 0 &&
    dropoffMinutes < 24 * 60
      ? dropoffMinutes
      : 10 * 60;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
          Rental Details
        </AppText>
        {onImport ? (
          <Button
            variant="secondary"
            icon="scan-document"
            disabled={importing}
            onPress={onImport}
            accessibilityLabel="Import car rental confirmation document or screenshots">
            {importing ? 'Reading…' : 'Import Confirmation'}
          </Button>
        ) : null}
      </View>
      {importedFileName ? (
        <AppText variant="caption" color="secondary" selectable>
          Imported from {importedFileName}. Review the details before saving.
        </AppText>
      ) : null}
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <Input
            label="Company"
            value={value.company}
            onChangeText={(nextValue) => update('company', nextValue)}
            placeholder="Hertz"
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Confirmation"
            value={value.confirmationCode}
            onChangeText={(nextValue) => update('confirmationCode', nextValue)}
            placeholder="K12345"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
      </View>
      <Input
        label="Pick Up Location"
        value={value.pickupLocation}
        onChangeText={(nextValue) => update('pickupLocation', nextValue)}
        placeholder="Keflavik Airport (KEF)"
      />
      <Input
        label="Drop Off Location"
        value={value.dropoffLocation}
        onChangeText={(nextValue) => update('dropoffLocation', nextValue)}
        placeholder="Same as pick-up"
      />
      <Input
        label="Vehicle"
        value={value.vehicleClass}
        onChangeText={(nextValue) => update('vehicleClass', nextValue)}
        placeholder="Compact SUV"
      />
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <DateField
            label="Drop Off Date"
            value={value.dropoffDate || planStartDate || ''}
            minimumDate={planStartDate}
            maximumDate={planEndDate}
            onChange={(nextValue) => update('dropoffDate', nextValue)}
          />
        </View>
        <View style={styles.flex}>
          <TimeField
            label="Drop Off Time"
            value={dropoffTimeValue}
            onChange={(nextValue) => update('dropoffMinutes', String(nextValue))}
          />
        </View>
      </View>
      {error ? <ErrorMessage message={error} selectable /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
});
