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
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { googleFlightStatusUrl } from '@/features/travel/flight-status-link';
import type { TravelPlan } from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, formatDuration, formatMinutes, type DateDisplayFormat } from '@/utils/date';
import { isHttpsUrl } from '@/utils/safe-url';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
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
  onToggle,
  onEditedFlightDetailsChange,
  onImportFlight,
  onSaveFlightDetails,
  onCancelFlightEdit,
  onBeginFlightEdit,
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
  onToggle: () => void;
  onEditedFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: () => void;
  onSaveFlightDetails: () => void;
  onCancelFlightEdit: () => void;
  onBeginFlightEdit: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const isExpanded = expanded;
  return (
    <Animated.View layout={LinearTransition.duration(180)}>
      <Card variant="sunken" style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.flex}>
            <AppText variant="subheading">{item.title}</AppText>
            <AppText variant="caption" color="accent">
              {formatDateKey(item.date, dateDisplayFormat)} ·{' '}
              {formatMinutes(item.startMinutes)} ·{' '}
              {item.kind === 'flight'
                ? formatDuration(item.durationMinutes)
                : `${item.durationMinutes} min`}
            </AppText>
          </View>
          <View style={styles.itemHeaderActions}>
            <AppText variant="overline" color="tertiary">
              {item.kind}
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
              <FlightDetailsSummary details={item.flight} />
            ) : null}
            {item.kind === 'flight' && editingFlightItemId === item.id ? (
              <View style={styles.flightEditor}>
                <FlightDetailsEditor
                  value={editedFlightDetails}
                  onChange={onEditedFlightDetailsChange}
                  error={editedFlightDetailsError}
                  importedFileName={editedFlightFileName}
                  importing={importingFlight}
                  onImport={onImportFlight}
                />
                <View style={styles.flightEditorActions}>
                  <Button
                    size="lg"
                    icon="check"
                    style={styles.fullWidthAction}
                    onPress={onSaveFlightDetails}>
                    Save flight details
                  </Button>
                  <View
                    style={[
                      styles.flightEditorSecondaryActions,
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
                        styles.removeFlightAction,
                        pressed ? styles.pressed : undefined,
                      ]}>
                      <Symbol name="trash" size="sm" color={theme.danger} />
                      <AppText variant="callout" color="danger">
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {editingFlightItemId !== item.id ? (
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
                    Check live status
                  </Button>
                ) : null}
                {item.kind === 'flight' ? (
                  <Button
                    variant="secondary"
                    icon="flight"
                    style={styles.itineraryAction}
                    onPress={onBeginFlightEdit}>
                    {item.flight ? 'Edit flight' : 'Add flight details'}
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
                {item.kind !== 'flight' ? (
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
  flightEditor: { gap: spacing.md },
  flightEditorActions: { gap: spacing.sm },
  fullWidthAction: { width: '100%' },
  flightEditorSecondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  removeFlightAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, gap: spacing.xxs },
});
