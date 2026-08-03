import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { BookingOpenSheet } from '@/features/travel/booking-open-sheet';
import {
  resolveStayBookingOpen,
  type StayBookingOpen,
} from '@/features/travel/booking-open';
import { addressMapUrl } from '@/features/travel/address-map-link';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsCardEditor } from '@/features/travel/flight-details-card-editor';
import type { FlightScheduleDraft } from '@/features/travel/flight-schedule';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { googleFlightStatusUrl } from '@/features/travel/flight-status-link';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsCardEditor } from '@/features/travel/rental-details-card-editor';
import { RentalDetailsSummary } from '@/features/travel/rental-details-summary';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { StayDetailsCardEditor } from '@/features/travel/stay-details-card-editor';
import { StayDetailsSummary } from '@/features/travel/stay-details-summary';
import { titleCaseTravelKind } from '@/features/travel/travel-chrome';
import {
  kindAccent,
  kindIcon,
  kindTint,
} from '@/features/travel/travel-kind-chrome';
import { TravelItemNotesButton, TravelItemNotesSheet } from '@/features/travel/travel-item-notes-sheet';
import { AgentUiIds } from '@/utils/agent-ui';
import {
  TRAVEL_CARD_SHADOW,
  travelCardBorder,
  travelCardFill,
} from '@/features/travel/travel-surface';
import { resolveTravelPhotoUris } from '@/features/travel/travel-moment-media';
import {
  timelineEntryCaption,
  type TravelTimelinePhase,
} from '@/features/travel/travel-timeline-entries';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import type { TravelItemNote, TravelPlan } from '@/features/travel/types';
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
function TimelineItemTitle({
  title,
  compact = false,
  dense = false,
}: {
  title: string;
  compact?: boolean;
  dense?: boolean;
}) {
  const primaryVariant = dense ? 'caption' : compact ? 'callout' : 'subheading';
  const separator = ' · ';
  const breakAt = title.indexOf(separator);
  if (breakAt <= 0) {
    return (
      <AppText
        variant={primaryVariant}
        fit
        style={compact ? styles.compactTitle : undefined}>
        {title}
      </AppText>
    );
  }
  const head = title.slice(0, breakAt);
  const tail = title.slice(breakAt + separator.length);
  return (
    <View style={styles.titleStack}>
      <AppText
        variant={primaryVariant}
        fit
        style={compact ? styles.compactTitle : undefined}>
        {head}
      </AppText>
      <AppText
        variant={compact ? 'caption' : 'subheading'}
        color={compact ? 'secondary' : 'primary'}
        fit>
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
        <View
          key={uri}
          style={[styles.photoWrap, { width: size, height: size }]}>
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
  compact = false,
  dense = false,
  allowStructuredEditing = true,
  showStructuredDetails = true,
  collapsedChevron = 'down',
  accentColor,
  tintColor,
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
  compact?: boolean;
  /** Extra-tight timeline presentation; transport cards use regular compact density. */
  dense?: boolean;
  /** Structured flight/stay/rental editors belong only in the transport section. */
  allowStructuredEditing?: boolean;
  /** Structured summaries and transport actions belong only in the transport section. */
  showStructuredDetails?: boolean;
  collapsedChevron?: 'down' | 'right';
  accentColor?: string;
  tintColor?: string;
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
  onSaveFlightDetails: (schedule: FlightScheduleDraft) => void;
  onCancelFlightEdit: () => void;
  onBeginFlightEdit: () => void;
  onEditedRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: () => void;
  onSaveRentalDetails: (schedule: TravelRangeScheduleDraft) => void;
  onCancelRentalEdit: () => void;
  onBeginRentalEdit: () => void;
  onEditedStayDetailsChange: (value: StayDetailsDraft) => void;
  onImportStay: () => void;
  onSaveStayDetails: (schedule: TravelRangeScheduleDraft) => void;
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
  const isStructuredTravelKind =
    item.kind === 'flight' || item.kind === 'rental' || item.kind === 'stay';
  const editingFlight =
    allowStructuredEditing && editingFlightItemId === item.id;
  const editingRental =
    allowStructuredEditing && editingRentalItemId === item.id;
  const editingStay = allowStructuredEditing && editingStayItemId === item.id;
  const editingStructured = editingFlight || editingRental || editingStay;
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
  const accent = accentColor ?? kindAccent(item.kind, theme);
  const tint = tintColor ?? kindTint(item.kind, theme);
  const stripeColor = dense ? kindTint(item.kind, theme) : accent;
  const icon = kindIcon(item.kind);
  const showHeaderCaption =
    compact && isStructuredTravelKind && isExpanded && Boolean(caption);
  const stripeWidth = dense
    ? Math.max(2, s(2))
    : compact
      ? Math.max(3, s(3))
      : Math.max(4, s(4));
  const toolbarActionSize = Math.max(28, s(28));

  return (
    <Animated.View
      layout={LinearTransition.duration(180)}
      style={[
        styles.nodeCard,
        {
          backgroundColor: travelCardFill(theme),
          borderRadius: dense
            ? Math.max(8, s(9))
            : compact
              ? Math.max(10, s(11))
              : 13,
          borderCurve: 'continuous',
          borderWidth: dense ? StyleSheet.hairlineWidth : 0,
          borderColor: dense ? travelCardBorder(theme) : 'transparent',
          boxShadow: dense
            ? '0 2px 8px rgba(51, 39, 28, 0.08)'
            : TRAVEL_CARD_SHADOW,
          overflow: 'hidden',
        },
      ]}>
      <View
        style={[
          styles.stripe,
          { width: stripeWidth, backgroundColor: stripeColor },
        ]}
      />
      <View
        style={[
          styles.nodeBody,
          {
            padding: isExpanded ? rs.md : compact ? undefined : rs.sm,
            paddingHorizontal: !isExpanded && compact ? rs.sm : undefined,
            paddingVertical:
              !isExpanded && dense
                ? Math.max(1, s(1))
                : !isExpanded && compact
                  ? rs.xxs
                  : undefined,
            gap: dense ? rs.xxs : compact ? rs.xs : rs.sm,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          onPress={onToggle}
          hitSlop={8}
          style={[
            styles.itemHeader,
            {
              gap: dense ? rs.xxs : compact ? rs.md : rs.sm,
              alignItems: compact ? 'center' : 'flex-start',
            },
          ]}>
          {showKindBadge ? (
            <View
              style={[
                styles.kindPill,
                {
                  backgroundColor: tint,
                  width: compact ? Math.max(28, s(30)) : Math.max(28, s(28)),
                  height: compact ? Math.max(28, s(30)) : Math.max(28, s(28)),
                },
              ]}
              accessibilityLabel={titleCaseTravelKind(item.kind)}>
              <Symbol name={icon} size={compact ? 10 : 12} color={accent} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <TimelineItemTitle title={title} compact={compact} dense={dense} />
            {showHeaderCaption ? (
              <AppText variant="caption" color="secondary" fit>
                {caption}
              </AppText>
            ) : null}
          </View>
          <View
            style={[
              styles.itemSizeAction,
              {
                width: dense
                  ? Math.max(18, s(18))
                  : compact
                    ? Math.max(32, s(34))
                    : Math.max(28, s(32)),
                height: dense
                  ? Math.max(18, s(18))
                  : compact
                    ? Math.max(32, s(34))
                    : Math.max(28, s(32)),
                borderRadius: radii.pill,
                backgroundColor: dense ? 'transparent' : theme.backgroundSunken,
              },
            ]}>
            <Symbol
              name={
                isExpanded
                  ? 'chevron-up'
                  : collapsedChevron === 'right'
                    ? 'chevron-right'
                    : 'chevron-down'
              }
              size={dense || compact ? 10 : 12}
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
            {caption && !showHeaderCaption ? (
              <AppText variant="caption" color="accent">
                {caption}
              </AppText>
            ) : null}
            {item.details &&
            (!isStructuredTravelKind || showStructuredDetails) ? (
              item.kind === 'stay' ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${item.details} in Maps`}
                  hitSlop={8}
                  onPress={() => {
                    const url = addressMapUrl(item.details!);
                    if (url) void Linking.openURL(url);
                  }}
                  style={({ pressed }) => [
                    styles.addressLink,
                    {
                      minHeight: Math.max(48, s(48)),
                      paddingHorizontal: rs.sm,
                      paddingVertical: rs.xs,
                      gap: rs.sm,
                      backgroundColor: tint,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <Symbol name="location" size="sm" color={accent} />
                  <View style={styles.addressCopy}>
                    <AppText variant="callout" color="primary" selectable>
                      {item.details}
                    </AppText>
                  </View>
                  <Symbol name="open-external" size="sm" color={accent} />
                </Pressable>
              ) : (
                <AppText variant="body" color="secondary">
                  {item.details}
                </AppText>
              )
            ) : null}

            <PhotoStrip uris={photos} onRemove={onRemovePhoto} />

            {showStructuredDetails &&
            item.kind === 'flight' &&
            item.flight &&
            !editingFlight ? (
              <FlightDetailsSummary
                details={item.flight}
                date={item.date}
                startMinutes={item.startMinutes}
                durationMinutes={item.durationMinutes}
                dateDisplayFormat={dateDisplayFormat}
              />
            ) : null}
            {showStructuredDetails &&
            item.kind === 'rental' &&
            item.rental &&
            !editingRental ? (
              <RentalDetailsSummary
                details={item.rental}
                pickupDate={item.date}
                pickupMinutes={item.startMinutes}
                dateDisplayFormat={dateDisplayFormat}
              />
            ) : null}
            {showStructuredDetails &&
            item.kind === 'stay' &&
            item.stay &&
            !editingStay ? (
              <StayDetailsSummary
                details={item.stay}
                checkinDate={item.date}
                checkinMinutes={item.startMinutes}
                dateDisplayFormat={dateDisplayFormat}
              />
            ) : null}
            {item.kind === 'flight' && editingFlight ? (
              <FlightDetailsCardEditor
                value={editedFlightDetails}
                error={editedFlightDetailsError}
                importedFileName={editedFlightFileName}
                importing={importingFlight}
                item={item}
                onChange={onEditedFlightDetailsChange}
                onImport={onImportFlight}
                onSave={onSaveFlightDetails}
                onCancel={onCancelFlightEdit}
                onRemove={onRemove}
              />
            ) : null}
            {item.kind === 'rental' && editingRental ? (
              <RentalDetailsCardEditor
                key={editedRentalFileName ?? item.id}
                value={editedRentalDetails}
                onChange={onEditedRentalDetailsChange}
                error={editedRentalDetailsError}
                importedFileName={editedRentalFileName}
                importing={importingRental}
                item={item}
                onImport={onImportRental}
                planStartDate={planStartDate}
                planEndDate={planEndDate}
                onSave={onSaveRentalDetails}
                onCancel={onCancelRentalEdit}
                onRemove={onRemove}
              />
            ) : null}
            {item.kind === 'stay' && editingStay ? (
              <StayDetailsCardEditor
                key={editedStayFileName ?? item.id}
                value={editedStayDetails}
                onChange={onEditedStayDetailsChange}
                error={editedStayDetailsError}
                importedFileName={editedStayFileName}
                importing={importingStay}
                item={item}
                onImport={onImportStay}
                planStartDate={planStartDate}
                planEndDate={planEndDate}
                onSave={onSaveStayDetails}
                onCancel={onCancelStayEdit}
                onRemove={onRemove}
              />
            ) : null}
            {!editingStructured ? (
              <View style={styles.itineraryActionsWrap}>
                <View
                  style={[
                    styles.itineraryActions,
                    { gap: Math.max(8, rs.xs) },
                  ]}>
                  <TravelItemNotesButton
                    hasNotes={(item.notes?.length ?? 0) > 0}
                    size={toolbarActionSize}
                    iconSize="sm"
                    onPress={() => setNotesOpen(true)}
                  />
                  <IconButton
                    icon="photo"
                    size={toolbarActionSize}
                    iconSize="sm"
                    background={theme.backgroundSunken}
                    accessibilityLabel="Add Photos"
                    onPress={onAddPhotos}
                  />
                  {showStructuredDetails &&
                  item.kind === 'flight' &&
                  googleFlightStatusUrl(item.flight, item.date) ? (
                    <IconButton
                      icon="clock"
                      size={toolbarActionSize}
                      iconSize="sm"
                      background={theme.backgroundSunken}
                      accessibilityLabel={`Check live status for ${item.flight?.flightNumber}`}
                      onPress={() =>
                        void Linking.openURL(
                          googleFlightStatusUrl(item.flight, item.date)!,
                        )
                      }
                    />
                  ) : null}
                  {allowStructuredEditing && item.kind === 'flight' ? (
                    <IconButton
                      icon="edit"
                      size={toolbarActionSize}
                      iconSize="sm"
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.flight ? 'Edit Flight' : 'Add Flight Details'
                      }
                      onPress={onBeginFlightEdit}
                    />
                  ) : null}
                  {allowStructuredEditing && item.kind === 'rental' ? (
                    <IconButton
                      icon="edit"
                      size={toolbarActionSize}
                      iconSize="sm"
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.rental ? 'Edit Rental' : 'Add Rental Details'
                      }
                      onPress={onBeginRentalEdit}
                    />
                  ) : null}
                  {allowStructuredEditing && item.kind === 'stay' ? (
                    <IconButton
                      icon="edit"
                      size={toolbarActionSize}
                      iconSize="sm"
                      background={theme.backgroundSunken}
                      accessibilityLabel={
                        item.stay ? 'Edit Stay' : 'Add Stay Details'
                      }
                      onPress={onBeginStayEdit}
                    />
                  ) : null}
                  {showStructuredDetails &&
                  item.bookingUrl &&
                  validBookingUrl(item.bookingUrl) ? (
                    <IconButton
                      icon="open-external"
                      size={toolbarActionSize}
                      iconSize="sm"
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
                      size={toolbarActionSize}
                      iconSize="sm"
                      background={theme.backgroundSunken}
                      color={theme.danger}
                      testID={AgentUiIds.travel.removeConfirm.open}
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
  addressLink: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  addressCopy: { flex: 1, minWidth: 0, flexShrink: 1 },
  itemDetails: {},
  itemSizeAction: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  titleStack: { gap: spacing.xxs, minWidth: 0, flexShrink: 1 },
  compactTitle: { fontWeight: '400' },
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
