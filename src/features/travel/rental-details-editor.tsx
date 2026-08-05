import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, DateField, ErrorMessage, Input, TimeField } from '@/components/primitives';
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
  scheduleFields?: ReactNode;
  /** When schedule is edited in the parent form (pick-up / drop-off). */
  hideDropoffFields?: boolean;
  /** When the parent already shows the Rental Details title / import. */
  hideHeader?: boolean;
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
  scheduleFields,
  hideDropoffFields = false,
  hideHeader = false,
}: RentalDetailsEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const columnMinWidth = Math.max(132, s(150));
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
    <View
      style={[
        styles.container,
        { gap: hideHeader ? rs.sm : rs.md },
      ]}>
      {!hideHeader || onImport ? (
        <View style={{ gap: rs.xs }}>
          {hideHeader ? null : (
            <View style={styles.header}>
              <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
                Rental Details
              </AppText>
            </View>
          )}
          {onImport ? (
            <ConfirmationImportAction
              testID={AgentUiIds.travel.confirmation.importAction('rental')}
              accessibilityLabel="Import car rental confirmation document or screenshots"
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
          kind="rental"
        />
      ) : null}
      {scheduleFields}
      <Input
        icon="vehicles"
        stackedLabel="Company"
        value={value.company}
        onChangeText={(nextValue) => update('company', nextValue)}
        placeholder="Hertz"
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      <Input
        icon="scan-document"
        stackedLabel="Confirmation Code"
        value={value.confirmationCode}
        onChangeText={(nextValue) => update('confirmationCode', nextValue)}
        placeholder="K12345"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={20}
        {...itinerarySheetFieldProps(chrome, 'import')}
      />
      <Input
        icon="location"
        stackedLabel="Pick Up Location"
        value={value.pickupLocation}
        onChangeText={(nextValue) => update('pickupLocation', nextValue)}
        placeholder="Keflavik Airport (KEF)"
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        icon="location"
        stackedLabel="Drop Off Location"
        value={value.dropoffLocation}
        onChangeText={(nextValue) => update('dropoffLocation', nextValue)}
        placeholder="Same as pick-up"
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        icon="vehicles"
        stackedLabel="Vehicle"
        value={value.vehicleClass}
        onChangeText={(nextValue) => update('vehicleClass', nextValue)}
        placeholder="Compact SUV"
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      {hideDropoffFields ? null : (
        <View style={[styles.twoColumns, { gap: rs.sm }]}>
          <View style={[styles.flex, { minWidth: columnMinWidth }]}>
            <DateField
              stackedLabel="Drop Off Date"
              value={value.dropoffDate || planStartDate || ''}
              minimumDate={planStartDate}
              maximumDate={planEndDate}
              onChange={(nextValue) => update('dropoffDate', nextValue)}
              {...itinerarySheetFieldProps(chrome, 'calendar')}
            />
          </View>
          <View style={[styles.flex, { minWidth: columnMinWidth }]}>
            <TimeField
              stackedLabel="Drop Off Time"
              value={dropoffTimeValue}
              onChange={(nextValue) => update('dropoffMinutes', String(nextValue))}
              showChevron
              {...itinerarySheetFieldProps(chrome, 'clock')}
            />
          </View>
        </View>
      )}
      {error ? <ErrorMessage message={error} selectable /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
});
