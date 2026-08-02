import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  DateField,
  ErrorMessage,
  Input,
  TimeField,
} from '@/components/primitives';
import { spacing } from '@/design-system';

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
  hideCheckoutFields = false,
  hideHeader = false,
}: StayDetailsEditorProps) {
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
    <View style={[styles.container, hideHeader ? styles.containerCompact : undefined]}>
      {hideHeader ? null : (
        <View
          style={[
            styles.header,
            onImport ? styles.headerWithAction : undefined,
          ]}>
          <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
            Stay Details
          </AppText>
          {onImport ? (
            <Button
              variant="secondary"
              icon="scan-document"
              loading={importing}
              onPress={onImport}
              accessibilityLabel="Import stay confirmation document or screenshots">
              Import Confirmation
            </Button>
          ) : null}
        </View>
      )}
      {importedFileName ? (
        <ConfirmationImportBanner
          fileName={importedFileName}
          uris={value.confirmationUris}
          kind="stay"
        />
      ) : null}
      <Input
        label="Confirmation Code"
        value={value.confirmationCode}
        onChangeText={(nextValue) =>
          onChange({ ...value, confirmationCode: nextValue })
        }
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={24}
      />
      <Input
        label="Reservation Email"
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
      />
      {hideCheckoutFields ? null : (
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <DateField
              label="Check Out Date"
              value={value.checkoutDate || planStartDate || ''}
              minimumDate={planStartDate}
              maximumDate={planEndDate}
              onChange={(nextValue) =>
                onChange({ ...value, checkoutDate: nextValue })
              }
            />
          </View>
          <View style={styles.flex}>
            <TimeField
              label="Check Out Time"
              value={checkoutTimeValue}
              onChange={(nextValue) =>
                onChange({ ...value, checkoutMinutes: String(nextValue) })
              }
            />
          </View>
        </View>
      )}
      <Input
        label="Notes"
        value={value.notes}
        onChangeText={(nextValue) =>
          onChange({ ...value, notes: nextValue.slice(0, 1000) })
        }
        placeholder="Wifi, door codes, parking…"
        multiline
        maxLength={1000}
        textAlignVertical="top"
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  containerCompact: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerWithAction: {
    minHeight: 44,
  },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
});
