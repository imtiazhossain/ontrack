import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AppText,
  Button,
  IconButton,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { BookingOpenSheet } from '@/features/travel/booking-open-sheet';
import {
  resolveStayBookingOpen,
  type StayBookingOpen,
} from '@/features/travel/booking-open';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { googleFlightStatusUrl } from '@/features/travel/flight-status-link';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import { RentalDetailsSummary } from '@/features/travel/rental-details-summary';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { StayDetailsEditor } from '@/features/travel/stay-details-editor';
import { StayDetailsSummary } from '@/features/travel/stay-details-summary';
import { titleCaseTravelKind } from '@/features/travel/travel-chrome';
import {
  kindAccent,
  kindIcon,
  kindTint,
} from '@/features/travel/travel-kind-chrome';
import {
  TravelItemNotesButton,
  TravelItemNotesSheet,
} from '@/features/travel/travel-item-notes-sheet';
import {
  TRAVEL_CARD_SHADOW,
  travelCardFill,
} from '@/features/travel/travel-surface';
import {
  resolveTravelPhotoUris,
} from '@/features/travel/travel-moment-media';
import {
  timelineEntryCaption,
  type TravelTimelinePhase,
} from '@/features/travel/travel-timeline-entries';
import type {
  TravelItemNote,
  TravelPlan,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { isHttpsUrl } from '@/utils/safe-url';
import { useState } from 'react';

export { kindDotColor } from '@/features/travel/travel-kind-chrome';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
}

/** Split “Company · Location” titles so the location is readable on its own line. */
function TimelineItemTitle({ title }: { title: string }) {
  const separator = ' · ';
  const breakAt = title.indexOf(separator);
  if (breakAt <= 0) {
    return (
      <AppText variant="subheading" fit>
        {title}
      </AppText>
    );
  }
  const head = title.slice(0, breakAt);
  const tail = title.slice(breakAt + separator.length);
  return (
    <View style={styles.titleStack}>
      <AppText variant="subheading" fit>
        {head}
      </AppText>
      <AppText variant="subheading" fit>
        {tail}
      </AppText>
    </View>
  );
}

function PhotoStrip({
  uris,
  onRemove,
}: {
  uris: string[];
  onRemove?: (uri: string) => void;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  const size = Math.max(72, s(88));
  if (!uris.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}>
      {uris.map((uri) => (
        <View key={uri} style={[styles.photoWrap, { width: size, height: size }]}>
          <Image
            source={{ uri }}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          {onRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              hitSlop={6}
              onPress={() => onRemove(uri)}
              style={[
                styles.photoRemove,
                { backgroundColor: theme.overlayScrim },
              ]}>
              <Symbol name="close" size="sm" color={theme.textOnAccent} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

export function TravelTimelineNode({
  item,
  plan,
  expanded,
  dateDisplayFormat,
  phase = 'default',
  displayTitle,
  entryDate,
  entryStartMinutes,
  showKindBadge = true,
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
  editingStayItemId,
  editedStayDetails,
  editedStayDetailsError,
  editedStayFileName,
  importingStay,
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
  onEditedStayDetailsChange,
  onImportStay,
  onSaveStayDetails,
  onCancelStayEdit,
  onBeginStayEdit,
  onAddPhotos,
  onRemovePhoto,
  onRemove,
  onSaveNotes,
}: {
  item: TravelItineraryItemModel;
  plan: TravelPlan;
  expanded: boolean;
  dateDisplayFormat: DateDisplayFormat;
  /** Timeline action phase; defaults keep transport-section titles as stored. */
  phase?: TravelTimelinePhase;
  displayTitle?: string;
  /** Override date/time for land / drop-off markers. */
  entryDate?: string;
  entryStartMinutes?: number;
  /** Hide when the timeline spine already shows the kind icon. */
  showKindBadge?: boolean;
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
  editingStayItemId?: string;
  editedStayDetails: StayDetailsDraft;
  editedStayDetailsError?: string;
  editedStayFileName?: string;
  importingStay: boolean;
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
  onEditedStayDetailsChange: (value: StayDetailsDraft) => void;
  onImportStay: () => void;
  onSaveStayDetails: () => void;
  onCancelStayEdit: () => void;
  onBeginStayEdit: () => void;
  onAddPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
  onRemove: () => void;
  onSaveNotes: (notes: TravelItemNote[]) => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const { user } = useAuthSession();
  const [notesOpen, setNotesOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState<Extract<
    StayBookingOpen,
    { mode: 'webview' }
  > | null>(null);
  const isExpanded = expanded;

  const openBooking = () => {
    const resolved = resolveStayBookingOpen(item, {
      fallbackEmail: user?.email ?? undefined,
    });
    if (!resolved) return;
    if (resolved.mode === 'webview') {
      setBookingOpen(resolved);
      return;
    }
    void WebBrowser.openBrowserAsync(resolved.url);
  };
  const isMoment = item.kind === 'moment';
  const editingStructured =
    editingFlightItemId === item.id ||
    editingRentalItemId === item.id ||
    editingStayItemId === item.id;
  const photos = resolveTravelPhotoUris(item.photoUris);
  const title = displayTitle ?? item.title;
  const caption = timelineEntryCaption(
    {
      key: item.id,
      item,
      phase,
      date: entryDate ?? item.date,
      startMinutes: entryStartMinutes ?? item.startMinutes,
      title,
    },
    dateDisplayFormat,
  );
  const accent = kindAccent(item.kind, theme);
  const tint = kindTint(item.kind, theme);
  const icon = kindIcon(item.kind);
  const stripeWidth = Math.max(4, s(4));

  return (
    <Animated.View
      layout={LinearTransition.duration(180)}
      style={[
        styles.nodeCard,
        {
          backgroundColor: travelCardFill(theme),
          borderRadius: 13,
          borderCurve: 'continuous',
          boxShadow: TRAVEL_CARD_SHADOW,
          overflow: 'hidden',
        },
      ]}>
      <View style={[styles.stripe, { width: stripeWidth, backgroundColor: accent }]} />
      <View style={[styles.nodeBody, { padding: rs.md, gap: rs.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={onToggle}
          hitSlop={8}
          style={[styles.itemHeader, { gap: rs.sm }]}>
          {showKindBadge ? (
            <View
              style={[
                styles.kindPill,
                {
                  backgroundColor: tint,
                  width: Math.max(28, s(28)),
                  height: Math.max(28, s(28)),
                },
              ]}
              accessibilityLabel={titleCaseTravelKind(item.kind)}>
              <Symbol name={icon} size={12} color={accent} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <TimelineItemTitle title={title} />
          </View>
          <View
            style={[
              styles.itemSizeAction,
              {
                width: Math.max(28, s(32)),
                height: Math.max(28, s(32)),
                borderRadius: radii.pill,
                backgroundColor: theme.backgroundSunken,
              },
            ]}>
            <Symbol
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={theme.textTertiary}
            />
          </View>
        </Pressable>

        {!isExpanded && photos.length > 0 ? (
          <PhotoStrip uris={photos.slice(0, 4)} />
        ) : null}

        {isExpanded ? (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(120)}
            style={[styles.itemDetails, { gap: rs.md }]}>
            {caption ? (
              <AppText variant="caption" color="accent">
                {caption}
              </AppText>
            ) : null}
            {item.details ? (
              <AppText variant="body" color="secondary">
                {item.details}
              </AppText>
            ) : null}

            <PhotoStrip uris={photos} onRemove={onRemovePhoto} />

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
            {item.kind === 'stay' &&
            item.stay &&
            editingStayItemId !== item.id ? (
              <StayDetailsSummary
                details={item.stay}
                checkinDate={item.date}
                checkinMinutes={item.startMinutes}
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
                      <Symbol name="delete" size="sm" color={theme.danger} />
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
                      <Symbol name="delete" size="sm" color={theme.danger} />
                      <AppText variant="callout" color="danger" fit>
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {item.kind === 'stay' && editingStayItemId === item.id ? (
              <View style={styles.structuredEditor}>
                <StayDetailsEditor
                  value={editedStayDetails}
                  onChange={onEditedStayDetailsChange}
                  error={editedStayDetailsError}
                  importedFileName={editedStayFileName}
                  importing={importingStay}
                  onImport={onImportStay}
                  planStartDate={planStartDate}
                  planEndDate={planEndDate}
                />
                <View style={styles.structuredEditorActions}>
                  <Button
                    size="lg"
                    icon="check"
                    style={styles.fullWidthAction}
                    onPress={onSaveStayDetails}>
                    Save stay details
                  </Button>
                  <View
                    style={[
                      styles.structuredEditorSecondaryActions,
                      { borderTopColor: theme.separator },
                    ]}>
                    <Button
                      variant="ghost"
                      style={styles.flex}
                      onPress={onCancelStayEdit}>
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
                      <Symbol name="delete" size="sm" color={theme.danger} />
                      <AppText variant="callout" color="danger" fit>
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : null}
            {!editingStructured ? (
              <View style={styles.itineraryActionsWrap}>
                <View style={[styles.itineraryActions, { gap: Math.max(8, rs.xs) }]}>
                  <TravelItemNotesButton
                    hasNotes={(item.notes?.length ?? 0) > 0}
                    size={Math.max(28, s(28))}
                    onPress={() => setNotesOpen(true)}
                  />
                  <IconButton
                    icon="photo"
                    size={Math.max(28, s(28))}
                    background={theme.backgroundSunken}
                    accessibilityLabel="Add Photos"
                    onPress={onAddPhotos}
                  />
                  {item.kind === 'flight' &&
                  googleFlightStatusUrl(item.flight, item.date) ? (
                    <IconButton
                      icon="clock"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      accessibilityLabel={`Check live status for ${item.flight?.flightNumber}`}
                      onPress={() =>
                        void Linking.openURL(
                          googleFlightStatusUrl(item.flight, item.date)!,
                        )
                      }
                    />
                  ) : null}
                  {item.kind === 'flight' ? (
                    <IconButton
                      icon="edit"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.flight ? 'Edit Flight' : 'Add Flight Details'
                      }
                      onPress={onBeginFlightEdit}
                    />
                  ) : null}
                  {item.kind === 'rental' ? (
                    <IconButton
                      icon="edit"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.rental ? 'Edit Rental' : 'Add Rental Details'
                      }
                      onPress={onBeginRentalEdit}
                    />
                  ) : null}
                  {item.kind === 'stay' ? (
                    <IconButton
                      icon="edit"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.stay ? 'Edit Stay' : 'Add Stay Details'
                      }
                      onPress={onBeginStayEdit}
                    />
                  ) : null}
                  {item.bookingUrl && validBookingUrl(item.bookingUrl) ? (
                    <IconButton
                      icon="open-external"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      accessibilityLabel="Open Booking"
                      onPress={openBooking}
                    />
                  ) : null}
                  {isMoment ||
                  (item.kind !== 'flight' &&
                    item.kind !== 'rental' &&
                    item.kind !== 'stay') ? (
                    <IconButton
                      icon="delete"
                      size={Math.max(28, s(28))}
                      background={theme.backgroundSunken}
                      color={theme.danger}
                      accessibilityLabel={`Remove ${item.title}`}
                      onPress={onRemove}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
      <TravelItemNotesSheet
        plan={plan}
        item={item}
        visible={notesOpen}
        onClose={() => setNotesOpen(false)}
        onSaveNotes={(notes) => {
          onSaveNotes(notes);
        }}
      />
      <BookingOpenSheet
        target={bookingOpen}
        onClose={() => setBookingOpen(null)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nodeCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
  },
  stripe: {
    alignSelf: 'stretch',
  },
  nodeBody: {
    flex: 1,
    minWidth: 0,
  },
  kindPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  itineraryActionsWrap: {
    width: '100%',
    alignItems: 'center',
  },
  itineraryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {},
  itemSizeAction: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  titleStack: { gap: spacing.xxs, minWidth: 0, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
  photoStrip: { gap: spacing.sm, paddingVertical: spacing.xxs },
  photoWrap: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
