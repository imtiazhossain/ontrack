import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  ErrorMessage,
  Input,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { ConfirmationImportAction } from '@/features/travel/confirmation-import-action';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { ConfirmationImportBanner } from './confirmation-import-banner';
import type { FlightDetailsDraft } from './flight-details';
import { travelOverlineStyle } from './travel-chrome';

const AIRPORT_HELPER: Record<string, string> = {
  EWR: 'Newark Liberty Intl.',
  JFK: 'John F. Kennedy Intl.',
  KEF: 'Keflavik Intl.',
  LGA: 'LaGuardia Airport',
  LHR: 'London Heathrow',
};

function airportHelper(value: string): string | undefined {
  return AIRPORT_HELPER[value.trim().toUpperCase()];
}

interface FlightDetailsEditorProps {
  value: FlightDetailsDraft;
  onChange: (value: FlightDetailsDraft) => void;
  error?: string;
  onImport?: () => void;
  importing?: boolean;
  importedFileName?: string;
  scheduleFields?: ReactNode;
  /** When the parent already shows the Flight Details title / import. */
  hideHeader?: boolean;
}

export function FlightDetailsEditor({
  value,
  onChange,
  error,
  onImport,
  importing = false,
  importedFileName,
  scheduleFields,
  hideHeader = false,
}: FlightDetailsEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing: rs } = useResponsive();
  const update = (field: keyof FlightDetailsDraft, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <View style={[styles.container, { gap: hideHeader ? rs.sm : rs.md }]}>
      {!hideHeader || onImport ? (
        <View style={{ gap: rs.xs }}>
          {hideHeader ? null : (
            <View style={styles.header}>
              <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
                Flight Details
              </AppText>
            </View>
          )}
          {onImport ? (
            <ConfirmationImportAction
              accessibilityLabel="Import flight confirmation document or screenshots"
              importing={importing}
              onPress={onImport}
            />
          ) : null}
        </View>
      ) : null}
      {importedFileName ? (
        <ConfirmationImportBanner
          fileName={importedFileName}
          uris={value.confirmationUris}
          kind="flight"
        />
      ) : null}
      {scheduleFields}
      <Input
        icon="flight"
        stackedLabel="Airline"
        value={value.airline}
        onChangeText={(nextValue) => update('airline', nextValue)}
        placeholder="Icelandair"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        icon="flight"
        stackedLabel="Flight Number"
        value={value.flightNumber}
        onChangeText={(nextValue) => update('flightNumber', nextValue)}
        placeholder="FI 614"
        autoCapitalize="characters"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        icon="location"
        stackedLabel="From"
        helperText={airportHelper(value.departureAirport)}
        value={value.departureAirport}
        onChangeText={(nextValue) => update('departureAirport', nextValue)}
        placeholder="JFK"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        icon="location"
        stackedLabel="To"
        helperText={airportHelper(value.arrivalAirport)}
        value={value.arrivalAirport}
        onChangeText={(nextValue) => update('arrivalAirport', nextValue)}
        placeholder="KEF"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        icon="scan-document"
        stackedLabel="Confirmation Code"
        value={value.confirmationCode}
        onChangeText={(nextValue) => update('confirmationCode', nextValue)}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={12}
        {...itinerarySheetFieldProps(chrome, 'import')}
      />
      <Input
        icon="note"
        stackedLabel="Seat"
        value={value.seat}
        onChangeText={(nextValue) => update('seat', nextValue)}
        placeholder="Seat Number"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
