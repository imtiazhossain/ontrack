import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  DateField,
  ErrorMessage,
  Input,
  TimeField,
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
import type { StayDetailsDraft } from './stay-details';
import { travelOverlineStyle } from './travel-chrome';

interface StayDetailsEditorProps {
  value: StayDetailsDraft;
  onChange: (value: StayDetailsDraft) => void;
  error?: string;
  onImport?: () => void;
  importing?: boolean;
  importedFileName?: string;
  planStartDate?: string;
  planEndDate?: string;
  scheduleFields?: ReactNode;
  /** When schedule is edited in the parent form (check-out). */
  hideCheckoutFields?: boolean;
  /** When the parent already shows the Stay Details title. */
  hideHeader?: boolean;
}

export function StayDetailsEditor({
  value,
  onChange,
  error,
  onImport,
  importing = false,
  importedFileName,
  planStartDate,
  planEndDate,
  scheduleFields,
  hideCheckoutFields = false,
  hideHeader = false,
}: StayDetailsEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const columnMinWidth = Math.max(132, s(150));
  const checkoutMinutes = value.checkoutMinutes.trim()
    ? Number(value.checkoutMinutes)
    : 11 * 60;
  const checkoutTimeValue =
    Number.isFinite(checkoutMinutes) &&
    checkoutMinutes >= 0 &&
    checkoutMinutes < 24 * 60
      ? checkoutMinutes
      : 11 * 60;

  return (
    <View style={[styles.container, { gap: hideHeader ? rs.sm : rs.md }]}>
      {!hideHeader || onImport ? (
        <View style={{ gap: rs.xs }}>
          {hideHeader ? null : (
            <View style={styles.header}>
              <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
                Stay Details
              </AppText>
            </View>
          )}
          {onImport ? (
            <ConfirmationImportAction
              accessibilityLabel="Import stay confirmation document or screenshots"
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
          kind="stay"
        />
      ) : null}
      {scheduleFields}
      <Input
        icon="scan-document"
        stackedLabel="Confirmation Code"
        value={value.confirmationCode}
        onChangeText={(nextValue) =>
          onChange({ ...value, confirmationCode: nextValue })
        }
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={24}
        {...itinerarySheetFieldProps(chrome, 'import')}
      />
      <Input
        icon="note"
        stackedLabel="Reservation Email"
        value={value.reservationEmail}
        onChangeText={(nextValue) =>
          onChange({ ...value, reservationEmail: nextValue })
        }
        placeholder="email@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={120}
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      {hideCheckoutFields ? null : (
        <View style={[styles.twoColumns, { gap: rs.sm }]}>
          <View style={[styles.flex, { minWidth: columnMinWidth }]}>
            <DateField
              stackedLabel="Check Out Date"
              value={value.checkoutDate || planStartDate || ''}
              minimumDate={planStartDate}
              maximumDate={planEndDate}
              onChange={(nextValue) =>
                onChange({ ...value, checkoutDate: nextValue })
              }
              {...itinerarySheetFieldProps(chrome, 'calendar')}
            />
          </View>
          <View style={[styles.flex, { minWidth: columnMinWidth }]}>
            <TimeField
              stackedLabel="Check Out Time"
              value={checkoutTimeValue}
              onChange={(nextValue) =>
                onChange({ ...value, checkoutMinutes: String(nextValue) })
              }
              showChevron
              {...itinerarySheetFieldProps(chrome, 'clock')}
            />
          </View>
        </View>
      )}
      <Input
        icon="note"
        stackedLabel="Notes"
        value={value.notes}
        onChangeText={(nextValue) =>
          onChange({ ...value, notes: nextValue.slice(0, 1000) })
        }
        placeholder="Wifi, door codes, parking…"
        multiline
        maxLength={1000}
        textAlignVertical="top"
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  twoColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
});
