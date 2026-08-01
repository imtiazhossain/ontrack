import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AppText,
  Button,
  Card,
  Symbol,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { formatFlightItineraryCaption } from '@/features/travel/flight-arrival';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { googleFlightStatusUrl } from '@/features/travel/flight-status-link';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import { RentalDetailsSummary } from '@/features/travel/rental-details-summary';
import type { TravelPlan } from '@/features/travel/types';
import { travelOverlineStyle, titleCaseTravelKind } from '@/features/travel/travel-chrome';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatMinutes, type DateDisplayFormat } from '@/utils/date';
import { isHttpsUrl } from '@/utils/safe-url';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
}

function itineraryCaption(
  item: TravelItineraryItemModel,
  dateDisplayFormat: DateDisplayFormat,
): string {
  const dateLabel = formatDateKey(item.date, dateDisplayFormat);
  if (item.kind === 'flight') {
    return formatFlightItineraryCaption({
      date: item.date,
      dateLabel,
      startMinutes: item.startMinutes,
      durationMinutes: item.durationMinutes,
      departureAirport: item.flight?.departureAirport,
      arrivalAirport: item.flight?.arrivalAirport,
    });
  }
  if (item.kind === 'rental') {
    const pickup = `${dateLabel} · ${formatMinutes(item.startMinutes)}`;
    if (!item.rental?.dropoffDate && item.rental?.dropoffMinutes === undefined) {
      return pickup;
    }
    const dropoffDate = item.rental.dropoffDate
      ? formatDateKey(item.rental.dropoffDate, dateDisplayFormat)
      : undefined;
    const dropoffTime =
      item.rental.dropoffMinutes !== undefined
        ? formatMinutes(item.rental.dropoffMinutes)
        : undefined;
    const dropoff = [dropoffDate, dropoffTime].filter(Boolean).join(' · ');
    return dropoff ? `${pickup} → ${dropoff}` : pickup;
  }
  return `${dateLabel} · ${formatMinutes(item.startMinutes)} · ${item.durationMinutes} min`;
}

export function TravelItineraryItem({
  item,
  expanded,
  dateDisplayFormat,
  editingFlightItemId,
  editedFlightDetails,
  editedFlightDetailsError,
  editedFlightFileName,
  importingFlight,
  editingRentalItemId,
  editedRentalDetails,
  editedRentalDetailsError,
  editedRentalFileName,
  importingRental,
  planStartDate,
  planEndDate,
  onToggle,
  onEditedFlightDetailsChange,
  onImportFlight,
  onSaveFlightDetails,
  onCancelFlightEdit,
  onBeginFlightEdit,
  onEditedRentalDetailsChange,
  onImportRental,
  onSaveRentalDetails,
  onCancelRentalEdit,
  onBeginRentalEdit,
  onRemove,
}: {
  item: TravelItineraryItemModel;
  expanded: boolean;
  dateDisplayFormat: DateDisplayFormat;
  editingFlightItemId?: string;
  editedFlightDetails: FlightDetailsDraft;
  editedFlightDetailsError?: string;
  editedFlightFileName?: string;
  importingFlight: boolean;
  editingRentalItemId?: string;
  editedRentalDetails: RentalDetailsDraft;
  editedRentalDetailsError?: string;
  editedRentalFileName?: string;
  importingRental: boolean;
  planStartDate: string;
  planEndDate: string;
  onToggle: () => void;
  onEditedFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: () => void;
  onSaveFlightDetails: () => void;
  onCancelFlightEdit: () => void;
  onBeginFlightEdit: () => void;
  onEditedRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: () => void;
  onSaveRentalDetails: () => void;
  onCancelRentalEdit: () => void;
  onBeginRentalEdit: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const isExpanded = expanded;
  const editingStructured =
    editingFlightItemId === item.id || editingRentalItemId === item.id;
  return (
    <Animated.View layout={LinearTransition.duration(180)}>
      <Card variant="sunken" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.flex}>
            <AppText variant="subheading" fit>
              {item.title}
            </AppText>
            <AppText variant="caption" color="accent" fit>
              {itineraryCaption(item, dateDisplayFormat)}
            </AppText>
          </View>
          <View style={styles.itemHeaderActions}>
            <AppText variant="overline" color="tertiary" fit style={travelOverlineStyle}>
              {titleCaseTravelKind(item.kind)}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${isExpanded ? 'Minimize' : 'Maximize'} ${item.title}`}
              accessibilityHint={
                isExpanded
                  ? 'Hides the event details and actions'
                  : 'Shows the event details and actions'
              }
              accessibilityState={{ expanded: isExpanded }}
              hitSlop={8}
              onPress={onToggle}
              style={({ pressed }) => [
                styles.itemSizeAction,
                pressed ? styles.pressed : undefined,
              ]}>
              <Symbol
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size="sm"
                color={theme.textTertiary}
              />
            </Pressable>
          </View>
        </View>
        {isExpanded ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(120)}
            style={styles.itemDetails}>
            {item.details ? (
              <AppText variant="body" color="secondary">
                {item.details}
              </AppText>
            ) : null}
            {item.kind === 'flight' &&
            item.flight &&
            editingFlightItemId !== item.id ? (
              <FlightDetailsSummary
                details={item.flight}
                date={item.date}
                startMinutes={item.startMinutes}
                durationMinutes={item.durationMinutes}
              />
            ) : null}
            {item.kind === 'rental' &&
            item.rental &&
            editingRentalItemId !== item.id ? (
              <RentalDetailsSummary
                details={item.rental}
                pickupDate={item.date}
                pickupMinutes={item.startMinutes}
                dateDisplayFormat={dateDisplayFormat}
              />
            ) : null}
            {item.kind === 'flight' && editingFlightItemId === item.id ? (
              <View style={styles.structuredEditor}>
                <FlightDetailsEditor
                  value={editedFlightDetails}
                  onChange={onEditedFlightDetailsChange}
                  error={editedFlightDetailsError}
                  importedFileName={editedFlightFileName}
                  importing={importingFlight}
                  onImport={onImportFlight}
                />
                <View style={styles.structuredEditorActions}>
                  <Button
                    size="lg"
                    icon="check"
                    style={styles.fullWidthAction}
                    onPress={onSaveFlightDetails}>
                    Save flight details
                  </Button>
                  <View
                    style={[
                      styles.structuredEditorSecondaryActions,
                      { borderTopColor: theme.separator },
                    ]}>
                    <Button
                      variant="ghost"
                      style={styles.flex}
                      onPress={onCancelFlightEdit}>
                      Cancel
                    </Button>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title}`}
                      hitSlop={8}
                      onPress={onRemove}
                      style={({ pressed }) => [
                        styles.removeStructuredAction,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <Symbol name="trash" size="sm" color={theme.danger} />
                      <AppText variant="callout" color="danger" fit>
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {item.kind === 'rental' && editingRentalItemId === item.id ? (
              <View style={styles.structuredEditor}>
                <RentalDetailsEditor
                  value={editedRentalDetails}
                  onChange={onEditedRentalDetailsChange}
                  error={editedRentalDetailsError}
                  importedFileName={editedRentalFileName}
                  importing={importingRental}
                  onImport={onImportRental}
                  planStartDate={planStartDate}
                  planEndDate={planEndDate}
                />
                <View style={styles.structuredEditorActions}>
                  <Button
                    size="lg"
                    icon="check"
                    style={styles.fullWidthAction}
                    onPress={onSaveRentalDetails}>
                    Save rental details
                  </Button>
                  <View
                    style={[
                      styles.structuredEditorSecondaryActions,
                      { borderTopColor: theme.separator },
                    ]}>
                    <Button
                      variant="ghost"
                      style={styles.flex}
                      onPress={onCancelRentalEdit}>
                      Cancel
                    </Button>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title}`}
                      hitSlop={8}
                      onPress={onRemove}
                      style={({ pressed }) => [
                        styles.removeStructuredAction,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <Symbol name="trash" size="sm" color={theme.danger} />
                      <AppText variant="callout" color="danger" fit>
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {!editingStructured ? (
              <View style={styles.itineraryActions}>
                {item.kind === 'flight' &&
                googleFlightStatusUrl(item.flight, item.date) ? (
                  <Button
                    variant="secondary"
                    icon="clock"
                    style={styles.itineraryAction}
                    accessibilityLabel={`Check live status for ${item.flight?.flightNumber}`}
                    onPress={() =>
                      void Linking.openURL(
                        googleFlightStatusUrl(item.flight, item.date)!,
                      )
                    }>
                    Check Live Status
                  </Button>
                ) : null}
                {item.kind === 'flight' ? (
                  <Button
                    variant="secondary"
                    icon="flight"
                    style={styles.itineraryAction}
                    onPress={onBeginFlightEdit}>
                    {item.flight ? 'Edit Flight' : 'Add Flight Details'}
                  </Button>
                ) : null}
                {item.kind === 'rental' ? (
                  <Button
                    variant="secondary"
                    icon="vehicles"
                    style={styles.itineraryAction}
                    onPress={onBeginRentalEdit}>
                    {item.rental ? 'Edit Rental' : 'Add Rental Details'}
                  </Button>
                ) : null}
                {item.bookingUrl && validBookingUrl(item.bookingUrl) ? (
                  <Button
                    variant="secondary"
                    style={styles.itineraryAction}
                    onPress={() =>
                      void WebBrowser.openBrowserAsync(item.bookingUrl!)
                    }>
                    Booking
                  </Button>
                ) : null}
                {item.kind !== 'flight' && item.kind !== 'rental' ? (
                  <Button
                    variant="ghost"
                    style={styles.itineraryAction}
                    onPress={onRemove}>
                    Remove
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  itineraryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itineraryAction: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: '45%',
    paddingHorizontal: spacing.sm,
  },
  itemCard: { gap: spacing.md },
  itemDetails: { gap: spacing.md },
  itemHeaderActions: { alignItems: 'flex-end', gap: spacing.xs },
  itemSizeAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  structuredEditor: { gap: spacing.md },
  structuredEditorActions: { gap: spacing.sm },
  fullWidthAction: { width: '100%' },
  structuredEditorSecondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  removeStructuredAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
});
