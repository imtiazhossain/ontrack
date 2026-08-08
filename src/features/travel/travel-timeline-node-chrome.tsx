import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { travelEditorialTextStyle } from '@/features/travel/travel-chrome';
import { TravelItemNotesButton } from '@/features/travel/travel-item-notes-sheet';
import type { TravelItineraryItem } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { isHttpsUrl } from '@/utils/safe-url';

export function validBookingUrl(value: string): boolean {
  return !value || isHttpsUrl(value);
}

/** Split “Company · Location” titles so the location is readable on its own line. */
export function TimelineItemTitle({
  title,
  compact = false,
  dense = false,
  emphasize = false,
  align = 'left',
}: {
  title: string;
  compact?: boolean;
  dense?: boolean;
  /** Larger route header used by compact flight cards. */
  emphasize?: boolean;
  /** Center title copy in compact board cards. */
  align?: 'left' | 'center';
}) {
  const primaryVariant = dense
    ? 'caption'
    : emphasize
      ? 'heading'
      : compact
        ? 'callout'
        : 'subheading';
  const separator = ' · ';
  const breakAt = title.indexOf(separator);
  if (breakAt <= 0) {
    return (
      <AppText
        variant={primaryVariant}
        bold={emphasize}
        fit
        align={align}
        style={[
          styles.editorial,
          compact && !emphasize ? styles.compactTitle : undefined,
          align === 'center' ? styles.fullWidthCopy : undefined,
        ]}>
        {title}
      </AppText>
    );
  }
  const head = title.slice(0, breakAt);
  const tail = title.slice(breakAt + separator.length);
  return (
    <View
      style={[
        styles.titleStack,
        align === 'center' ? styles.centeredStack : undefined,
      ]}>
      <AppText
        variant={primaryVariant}
        fit
        align={align}
        style={[
          styles.editorial,
          compact ? styles.compactTitle : undefined,
          align === 'center' ? styles.fullWidthCopy : undefined,
        ]}>
        {head}
      </AppText>
      <AppText
        variant={compact ? 'caption' : 'subheading'}
        color={compact ? 'secondary' : 'primary'}
        fit
        align={align}
        style={[
          styles.editorial,
          align === 'center' ? styles.fullWidthCopy : undefined,
        ]}>
        {tail}
      </AppText>
    </View>
  );
}

/** Compact flight meta under the route: `Sep 27 · 9h 59m total · 1 stop`. */
export function TimelineFlightCaption({
  dateLabel,
  durationLabel,
  stopsLabel,
  align = 'left',
}: {
  dateLabel: string;
  durationLabel: string;
  stopsLabel: string;
  align?: 'left' | 'center';
}) {
  return (
    <AppText
      variant="caption"
      color="secondary"
      fit
      align={align}
      style={align === 'center' ? styles.fullWidthCopy : undefined}>
      {[dateLabel, durationLabel, stopsLabel].join(' · ')}
    </AppText>
  );
}

/** Icon row under an expanded itinerary item: notes, photos, share, edit, open, remove. */
export function TimelineItemToolbar({
  item,
  size,
  allowStructuredEditing,
  showStructuredDetails,
  isMoment,
  canShare = false,
  align = 'center',
  onOpenNotes,
  onAddPhotos,
  onShare,
  onBeginFlightEdit,
  onBeginRentalEdit,
  onBeginStayEdit,
  onBeginTransportEdit,
  onOpenBooking,
  onRemove,
}: {
  item: TravelItineraryItem;
  size: number;
  allowStructuredEditing: boolean;
  showStructuredDetails: boolean;
  isMoment: boolean;
  canShare?: boolean;
  /** Dense timeline stacks actions under the title — left-align with that column. */
  align?: 'center' | 'left';
  onOpenNotes: () => void;
  onAddPhotos: () => void;
  onShare?: () => void;
  onBeginFlightEdit: () => void;
  onBeginRentalEdit: () => void;
  onBeginStayEdit: () => void;
  onBeginTransportEdit: () => void;
  onOpenBooking: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { spacing: rs } = useResponsive();
  const shared = {
    size,
    iconSize: 'sm' as const,
    background: theme.backgroundSunken,
  };
  const canEdit = (kind: TravelItineraryItem['kind']) =>
    allowStructuredEditing && item.kind === kind;

  return (
    <View
      style={[
        styles.toolbarWrap,
        align === 'left' ? styles.toolbarWrapLeft : undefined,
      ]}>
      <View
        style={[
          styles.toolbar,
          { gap: Math.max(8, rs.xs) },
          align === 'left' ? styles.toolbarLeft : undefined,
        ]}>
        <TravelItemNotesButton
          hasNotes={(item.notes?.length ?? 0) > 0}
          size={size}
          iconSize="sm"
          testID={AgentUiIds.travel.notes.open(item.id)}
          onPress={onOpenNotes}
        />
        <IconButton
          {...shared}
          icon="photo"
          accessibilityLabel="Add Photos"
          onPress={onAddPhotos}
        />
        {canShare && onShare ? (
          <IconButton
            {...shared}
            icon="share"
            accessibilityLabel="Share stop"
            testID={AgentUiIds.travel.timelineItem.share(item.id)}
            onPress={onShare}
          />
        ) : null}
        {canEdit('flight') ? (
          <IconButton
            {...shared}
            testID={AgentUiIds.travel.timelineItem.editFlight(item.id)}
            icon="edit"
            accessibilityLabel={
              item.flight ? 'Edit Flight' : 'Add Flight Details'
            }
            onPress={onBeginFlightEdit}
          />
        ) : null}
        {canEdit('rental') ? (
          <IconButton
            {...shared}
            icon="edit"
            accessibilityLabel={
              item.rental ? 'Edit Rental' : 'Add Rental Details'
            }
            onPress={onBeginRentalEdit}
          />
        ) : null}
        {canEdit('transport') ? (
          <IconButton
            {...shared}
            icon="edit"
            accessibilityLabel="Edit Transport Details"
            testID={AgentUiIds.travel.transport.edit(item.id)}
            onPress={onBeginTransportEdit}
          />
        ) : null}
        {canEdit('stay') ? (
          <IconButton
            {...shared}
            icon="edit"
            accessibilityLabel={item.stay ? 'Edit Stay' : 'Add Stay Details'}
            onPress={onBeginStayEdit}
          />
        ) : null}
        {showStructuredDetails &&
        item.bookingUrl &&
        validBookingUrl(item.bookingUrl) ? (
          <IconButton
            {...shared}
            icon="open-external"
            accessibilityLabel="Open Booking"
            onPress={onOpenBooking}
          />
        ) : null}
        {isMoment ||
        (item.kind !== 'flight' &&
          item.kind !== 'rental' &&
          item.kind !== 'stay') ? (
          <IconButton
            {...shared}
            icon="delete"
            color={theme.danger}
            testID={AgentUiIds.travel.removeConfirm.open}
            accessibilityLabel={`Remove ${item.title}`}
            onPress={onRemove}
          />
        ) : null}
      </View>
    </View>
  );
}

export function PhotoStrip({
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

const styles = StyleSheet.create({
  titleStack: { gap: spacing.xxs, minWidth: 0, flexShrink: 1, width: '100%' },
  centeredStack: { alignItems: 'center', alignSelf: 'stretch' },
  fullWidthCopy: { width: '100%', alignSelf: 'stretch' },
  editorial: { ...travelEditorialTextStyle },
  toolbarWrap: { width: '100%', alignItems: 'center' },
  toolbarWrapLeft: { alignItems: 'flex-start' },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarLeft: { justifyContent: 'flex-start' },
  compactTitle: { fontWeight: '400' },
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
