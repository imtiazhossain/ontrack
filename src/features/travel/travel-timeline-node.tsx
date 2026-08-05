import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    LinearTransition,
} from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
    resolveStayBookingOpen,
    type StayBookingOpen,
} from '@/features/travel/booking-open';
import { BookingOpenSheet } from '@/features/travel/booking-open-sheet';
import { flightItineraryCaptionParts } from '@/features/travel/flight-arrival';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsCardEditor } from '@/features/travel/flight-details-card-editor';
import { FlightDetailsSummary } from '@/features/travel/flight-details-summary';
import { flightItemDisplayTitle } from '@/features/travel/flight-route-label';
import type { FlightScheduleDraft } from '@/features/travel/flight-schedule';
import { openAddressWithMapsChooser } from '@/features/travel/open-address-with-maps';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsCardEditor } from '@/features/travel/rental-details-card-editor';
import { RentalDetailsSummary } from '@/features/travel/rental-details-summary';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { StayDetailsCardEditor } from '@/features/travel/stay-details-card-editor';
import { StayDetailsSummary } from '@/features/travel/stay-details-summary';
import { TransportDetailsCardEditor } from '@/features/travel/transport-details-card-editor';
import { TransportDetailsSummary } from '@/features/travel/transport-details-summary';
import { titleCaseTravelKind } from '@/features/travel/travel-chrome';
import { TravelItemNotesSheet } from '@/features/travel/travel-item-notes-sheet';
import {
    kindAccent,
    kindIcon,
    kindTint,
} from '@/features/travel/travel-kind-chrome';
import { resolveTravelPhotoUris } from '@/features/travel/travel-moment-media';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import {
    TRAVEL_CARD_SHADOW,
    travelCardBorder,
    travelCardFill,
    travelMainCardFill,
} from '@/features/travel/travel-surface';
import {
    flightCaptionInput,
    timelineEntryCaption,
    type TravelTimelinePhase,
} from '@/features/travel/travel-timeline-entries';
import {
    PhotoStrip,
    TimelineFlightCaption,
    TimelineItemTitle,
    TimelineItemToolbar,
} from '@/features/travel/travel-timeline-node-chrome';
import type {
    TravelItemNote,
    TravelPlan,
    TravelTransportDetails,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import type { DateDisplayFormat } from '@/utils/date';
import { useState } from 'react';

export { kindDotColor } from '@/features/travel/travel-kind-chrome';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

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
  onSaveTransportDetails,
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
  onSaveTransportDetails?: (
    details: TravelTransportDetails,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onAddPhotos: () => void;
  onRemovePhoto: (uri: string) => void;
  onRemove: () => void;
  onSaveNotes: (notes: TravelItemNote[]) => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const { user } = useAuthSession();
  const [notesOpen, setNotesOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState(false);
  const [bookingOpen, setBookingOpen] = useState<Extract<
    StayBookingOpen,
    { mode: 'webview' }
  > | null>(null);
  const isExpanded = expanded;
  const title =
    displayTitle ??
    (item.kind === 'flight' ? flightItemDisplayTitle(item) : item.title);
  const toggleAgent = useAgentUiTarget(
    AgentUiIds.travel.timelineItem.toggle(item.id, phase),
    { label: title, onPress: onToggle },
  );
  const addressAgent = useAgentUiTarget(
    item.kind === 'stay' && item.details
      ? AgentUiIds.travel.timelineItem.openAddress(item.id)
      : undefined,
    {
      label: item.details ? `Open ${item.details} with Maps` : undefined,
      onPress: () => {
        if (!item.details) return;
        openAddressWithMapsChooser(item.details);
      },
    },
  );

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
    item.kind === 'flight' ||
    item.kind === 'transport' ||
    item.kind === 'rental' ||
    item.kind === 'stay';
  const editingFlight =
    allowStructuredEditing && editingFlightItemId === item.id;
  const editingRental =
    allowStructuredEditing && editingRentalItemId === item.id;
  const editingStay = allowStructuredEditing && editingStayItemId === item.id;
  const editingStructured =
    editingFlight || editingTransport || editingRental || editingStay;
  const photos = resolveTravelPhotoUris(item.photoUris);
  const cardFill =
    item.kind === 'flight' ? travelMainCardFill(theme) : travelCardFill(theme);
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
  const flightCaption =
    item.kind === 'flight'
      ? flightItineraryCaptionParts(flightCaptionInput(item, dateDisplayFormat))
      : undefined;
  const accent = accentColor ?? kindAccent(item.kind, theme);
  const tint = tintColor ?? kindTint(item.kind, theme);
  const stripeColor = dense ? kindTint(item.kind, theme) : accent;
  const icon = kindIcon(item.kind);
  // Transport FLIGHTS section only — timeline day markers also pass `compact`
  // (with `dense`) and keep their smaller board/land chrome.
  const isCompactFlight = compact && !dense && item.kind === 'flight';
  const showKindBadgeResolved = showKindBadge;
  const showHeaderCaption =
    isCompactFlight ||
    (compact && isStructuredTravelKind && isExpanded && Boolean(caption));
  const stripeWidth = dense
    ? Math.max(2, s(2))
    : compact
      ? Math.max(3, s(3))
      : Math.max(4, s(4));
  const toolbarActionSize = Math.max(28, s(28));
  const compactActionSize = Math.max(32, s(34));
  const kindPillSize = isCompactFlight
    ? compactActionSize
    : compact
      ? Math.max(28, s(30))
      : Math.max(28, s(28));

  return (
    <Animated.View
      layout={LinearTransition.duration(180)}
      style={[
        styles.nodeCard,
        {
          backgroundColor: cardFill,
          borderRadius: dense
            ? Math.max(8, s(9))
            : isCompactFlight
              ? Math.max(16, s(18))
              : compact
                ? Math.max(10, s(11))
                : 13,
          borderCurve: 'continuous',
          borderWidth:
            dense || isCompactFlight ? StyleSheet.hairlineWidth : 0,
          borderColor:
            dense || isCompactFlight ? travelCardBorder(theme) : 'transparent',
          boxShadow: dense
            ? '0 2px 8px rgba(51, 39, 28, 0.08)'
            : isCompactFlight
              ? undefined
              : TRAVEL_CARD_SHADOW,
          overflow: 'hidden',
        },
      ]}
    >
      {isCompactFlight ? null : (
        <View
          style={[
            styles.stripe,
            { width: stripeWidth, backgroundColor: stripeColor },
          ]}
        />
      )}
      <View
        style={[
          styles.nodeBody,
          {
            padding: isExpanded || isCompactFlight ? rs.md : compact ? undefined : rs.sm,
            paddingHorizontal:
              !isExpanded && compact && !isCompactFlight ? rs.sm : undefined,
            paddingVertical:
              !isExpanded && dense
                ? Math.max(1, s(1))
                : !isExpanded && compact && !isCompactFlight
                  ? rs.xxs
                  : undefined,
            gap: dense ? rs.xxs : compact ? rs.xs : rs.sm,
          },
        ]}
      >
        <Pressable
          ref={toggleAgent.ref}
          testID={toggleAgent.testID}
          onLayout={toggleAgent.onLayout}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ expanded: isExpanded }}
          onPress={onToggle}
          hitSlop={8}
          style={[
            styles.itemHeader,
            {
              gap: dense ? rs.xxs : compact ? rs.md : rs.sm,
              alignItems:
                isCompactFlight || compact ? 'center' : 'flex-start',
            },
          ]}
        >
            {showKindBadgeResolved ? (
              <View
                style={[
                  styles.kindPill,
                  {
                    backgroundColor: tint,
                    width: kindPillSize,
                    height: kindPillSize,
                  },
                ]}
                accessibilityLabel={titleCaseTravelKind(item.kind)}
              >
                <Symbol
                  name={icon}
                  size={isCompactFlight ? 12 : compact ? 10 : 12}
                  color={accent}
                />
              </View>
            ) : null}
            <View style={[styles.flex, isCompactFlight ? { gap: rs.xxs } : null]}>
              <TimelineItemTitle
                title={title}
                compact={compact}
                dense={dense}
              />
              {showHeaderCaption ? (
                flightCaption ? (
                  <TimelineFlightCaption {...flightCaption} />
                ) : (
                  <AppText variant="caption" color="secondary" fit>
                    {caption}
                  </AppText>
                )
              ) : null}
            </View>
            <View
              style={[
                styles.itemSizeAction,
                {
                  width: dense
                    ? Math.max(18, s(18))
                    : compact
                      ? compactActionSize
                      : Math.max(28, s(32)),
                  height: dense
                    ? Math.max(18, s(18))
                    : compact
                      ? compactActionSize
                      : Math.max(28, s(32)),
                },
              ]}
            >
              <Symbol
                name={
                  isExpanded
                    ? 'chevron-up'
                    : collapsedChevron === 'right'
                      ? 'chevron-right'
                      : 'chevron-down'
                }
                size={dense || compact ? 10 : 12}
                color={isCompactFlight ? accent : theme.textTertiary}
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
            style={[styles.itemDetails, { gap: rs.md }]}
          >
            {caption && !showHeaderCaption ? (
              <AppText variant="caption" color="accent">
                {caption}
              </AppText>
            ) : null}
            {item.details &&
            (!isStructuredTravelKind || showStructuredDetails) ? (
              item.kind === 'stay' ? (
                <Pressable
                  ref={addressAgent.ref}
                  testID={addressAgent.testID}
                  onLayout={addressAgent.onLayout}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.details} with Maps`}
                  hitSlop={8}
                  onPress={() => {
                    openAddressWithMapsChooser(item.details!);
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
                  ]}
                >
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
                itemId={item.id}
                details={item.flight}
                date={item.date}
                startMinutes={item.startMinutes}
                durationMinutes={item.durationMinutes}
                hideHero={isCompactFlight}
                bare={isCompactFlight}
              />
            ) : null}
            {showStructuredDetails &&
            item.kind === 'transport' &&
            item.transport &&
            !editingTransport ? (
              <TransportDetailsSummary
                itemId={item.id}
                details={item.transport}
                departureDate={item.date}
                departureMinutes={item.startMinutes}
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
            {item.kind === 'transport' && editingTransport ? (
              <TransportDetailsCardEditor
                item={item}
                planStartDate={planStartDate}
                planEndDate={planEndDate}
                onSave={(nextDetails, schedule) => {
                  onSaveTransportDetails?.(nextDetails, schedule);
                  setEditingTransport(false);
                }}
                onCancel={() => setEditingTransport(false)}
                onRemove={onRemove}
              />
            ) : null}
            {!editingStructured ? (
              <TimelineItemToolbar
                item={item}
                size={toolbarActionSize}
                allowStructuredEditing={allowStructuredEditing}
                showStructuredDetails={showStructuredDetails}
                isMoment={isMoment}
                onOpenNotes={() => setNotesOpen(true)}
                onAddPhotos={onAddPhotos}
                onBeginFlightEdit={onBeginFlightEdit}
                onBeginRentalEdit={onBeginRentalEdit}
                onBeginStayEdit={onBeginStayEdit}
                onBeginTransportEdit={() => setEditingTransport(true)}
                onOpenBooking={openBooking}
                onRemove={onRemove}
              />
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
  pressed: { opacity: 0.6 },
  flex: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
});
