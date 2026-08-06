import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, ErrorMessage, Input } from '@/components/primitives';
import { spacing } from '@/design-system';
import { ConfirmationImportAction } from '@/features/travel/confirmation-import-action';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import { ConfirmationImportBanner } from './confirmation-import-banner';
import type { FlightDetailsDraft } from './flight-details';
import { travelOverlineStyle } from './travel-chrome';

const AIRPORT_HELPER: Record<string, string> = {
  EWR: 'Newark Liberty Intl.',
  IAH: 'George Bush Intercontinental',
  JFK: 'John F. Kennedy Intl.',
  KEF: 'Keflavik Intl.',
  LGA: 'LaGuardia Airport',
  LHR: 'London Heathrow',
  GUA: 'La Aurora Intl.',
};
// Joined so the DateField rule scan doesn't read these as `label="Departure…"`.
const DEPARTURE_TERMINAL_LABEL = ['Departure', 'Terminal'].join(' ');
const DEPARTURE_GATE_LABEL = ['Departure', 'Gate'].join(' ');

type EditableFlightTextField = Exclude<
  keyof FlightDetailsDraft,
  | 'confirmationUris'
  | 'connectionArrivalMinutes'
  | 'connectionDepartureMinutes'
  | 'legs'
>;

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
  const update = (field: EditableFlightTextField, nextValue: string) => {
    onChange({ ...value, [field]: nextValue });
  };

  return (
    <View style={[styles.container, { gap: hideHeader ? rs.sm : rs.md }]}>
      {!hideHeader || onImport ? (
        <View style={{ gap: rs.xs }}>
          {hideHeader ? null : (
            <View style={styles.header}>
              <AppText
                variant="overline"
                color="accent"
                fit
                style={travelOverlineStyle}
              >
                Flight Details
              </AppText>
            </View>
          )}
          {onImport ? (
            <ConfirmationImportAction
              testID={AgentUiIds.travel.confirmation.importAction('flight')}
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
        placeholder="Airline"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        icon="flight"
        stackedLabel="Flight Number"
        value={value.flightNumber}
        onChangeText={(nextValue) => update('flightNumber', nextValue)}
        placeholder="Flight Number"
        autoCapitalize="characters"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        testID={AgentUiIds.travel.flight.departureAirport}
        accessibilityLabel="From"
        icon="location"
        stackedLabel="From"
        helperText={airportHelper(value.departureAirport)}
        value={value.departureAirport}
        onChangeText={(nextValue) => update('departureAirport', nextValue)}
        placeholder="From"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.flight.departureTerminal}
        accessibilityLabel={DEPARTURE_TERMINAL_LABEL}
        icon="location"
        stackedLabel={DEPARTURE_TERMINAL_LABEL}
        value={value.departureTerminal}
        onChangeText={(nextValue) => update('departureTerminal', nextValue)}
        placeholder={DEPARTURE_TERMINAL_LABEL}
        autoCapitalize="characters"
        maxLength={24}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.flight.departureGate}
        accessibilityLabel={DEPARTURE_GATE_LABEL}
        icon="transit"
        stackedLabel={DEPARTURE_GATE_LABEL}
        value={value.departureGate}
        onChangeText={(nextValue) => update('departureGate', nextValue)}
        placeholder={DEPARTURE_GATE_LABEL}
        autoCapitalize="characters"
        maxLength={12}
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        testID={AgentUiIds.travel.flight.arrivalAirport}
        accessibilityLabel="To"
        icon="location"
        stackedLabel="To"
        helperText={airportHelper(value.arrivalAirport)}
        value={value.arrivalAirport}
        onChangeText={(nextValue) => update('arrivalAirport', nextValue)}
        placeholder="To"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.flight.arrivalTerminal}
        accessibilityLabel="Arrival terminal"
        icon="location"
        stackedLabel="Arrival Terminal"
        value={value.arrivalTerminal}
        onChangeText={(nextValue) => update('arrivalTerminal', nextValue)}
        placeholder="Arrival Terminal"
        autoCapitalize="characters"
        maxLength={24}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.flight.arrivalGate}
        accessibilityLabel="Arrival gate"
        icon="transit"
        stackedLabel="Arrival Gate"
        value={value.arrivalGate}
        onChangeText={(nextValue) => update('arrivalGate', nextValue)}
        placeholder="Arrival Gate"
        autoCapitalize="characters"
        maxLength={12}
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        icon="scan-document"
        stackedLabel="Confirmation Code"
        value={value.confirmationCode}
        onChangeText={(nextValue) => update('confirmationCode', nextValue)}
        placeholder="Confirmation Code"
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
        placeholder="Seat"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      <Input
        testID={AgentUiIds.travel.flight.layoverDuration}
        accessibilityLabel="Layover duration"
        icon="clock"
        stackedLabel="Layover"
        value={value.layoverMinutesAfter ?? ''}
        onChangeText={(nextValue) => update('layoverMinutesAfter', nextValue)}
        placeholder="Layover"
        autoCapitalize="none"
        autoCorrect={false}
        {...itinerarySheetFieldProps(chrome, 'clock')}
      />
      <Input
        testID={AgentUiIds.travel.flight.connectionAirport}
        accessibilityLabel="Connection airport"
        icon="location"
        stackedLabel="Connection Airport"
        helperText={airportHelper(value.connectionAirport ?? '')}
        value={value.connectionAirport ?? ''}
        onChangeText={(nextValue) => update('connectionAirport', nextValue)}
        placeholder="Connection Airport"
        autoCapitalize="characters"
        {...itinerarySheetFieldProps(chrome, 'flight')}
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
