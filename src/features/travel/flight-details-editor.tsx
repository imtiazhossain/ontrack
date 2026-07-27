import { StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Input } from '@/components/primitives';
import { spacing } from '@/design-system';

import type { FlightDetailsDraft } from './flight-details';

interface FlightDetailsEditorProps {
  value: FlightDetailsDraft;
  onChange: (value: FlightDetailsDraft) => void;
  error?: string;
  onImport?: () => void;
  importing?: boolean;
  importedFileName?: string;
}

export function FlightDetailsEditor({
  value,
  onChange,
  error,
  onImport,
  importing = false,
  importedFileName,
}: FlightDetailsEditorProps) {
  const update = (field: keyof FlightDetailsDraft, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="overline" color="accent">Flight details</AppText>
        {onImport ? (
          <Button
            variant="secondary"
            icon="doc.text.viewfinder"
            disabled={importing}
            onPress={onImport}
            accessibilityLabel="Import flight confirmation document or screenshots">
            {importing ? 'Reading…' : 'Import confirmation'}
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
            label="Airline"
            value={value.airline}
            onChangeText={(nextValue) => update('airline', nextValue)}
            placeholder="Icelandair"
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Flight number"
            value={value.flightNumber}
            onChangeText={(nextValue) => update('flightNumber', nextValue)}
            placeholder="FI 614"
            autoCapitalize="characters"
          />
        </View>
      </View>
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <Input
            label="From"
            value={value.departureAirport}
            onChangeText={(nextValue) => update('departureAirport', nextValue)}
            placeholder="JFK"
            autoCapitalize="characters"
            maxLength={8}
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="To"
            value={value.arrivalAirport}
            onChangeText={(nextValue) => update('arrivalAirport', nextValue)}
            placeholder="KEF"
            autoCapitalize="characters"
            maxLength={8}
          />
        </View>
      </View>
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <Input
            label="Confirmation code"
            value={value.confirmationCode}
            onChangeText={(nextValue) => update('confirmationCode', nextValue)}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
          />
        </View>
        <View style={styles.flex}>
          <Input
            label="Seat"
            value={value.seat}
            onChangeText={(nextValue) => update('seat', nextValue)}
            placeholder="14A"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
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
  flex: { flex: 1 },
});
