import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import type { FlightScheduleDraft } from '@/features/travel/flight-schedule';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import type { TravelRangeScheduleDraft } from '@/features/travel/travel-range-schedule';
import { formatHourLabel, hourBucketMinutes } from '@/features/travel/travel-hour-label';
import {
  dayStripeColor,
  kindAccent,
  kindIcon,
} from '@/features/travel/travel-kind-chrome';
import {
  expandTimelineEntries,
  groupTimelineEntriesByDate,
} from '@/features/travel/travel-timeline-entries';
import { TravelTimelineNode } from '@/features/travel/travel-timeline-node';
import type { TravelPlan } from '@/features/travel/types';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import {
  TRAVEL_CARD_SHADOW,
  TRAVEL_EDITORIAL_ACCENT,
  travelCardBorder,
  travelCardFill,
  travelPanelTint,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDateKeyShort,
  formatWeekday,
  fromDateKey,
  type DateDisplayFormat,
} from '@/utils/date';

type TravelItineraryItemModel = TravelPlan['itinerary'][number];

function dayNumberFor(planStartDate: string, date: string): number {
  const start = fromDateKey(planStartDate).getTime();
  const current = fromDateKey(date).getTime();
  return Math.round((current - start) / (24 * 60 * 60 * 1000)) + 1;
}

export function TravelItineraryTimeline({
  plan,
  items,
  minimizedItemIds,
  collapsedDayDates,
  dateDisplayFormat,
  editingFlightItemId,
  editedFlightDetails,
  editedFlightDetailsError,
  editedFlightFileName,
  importingFlightTarget,
  editingRentalItemId,
  editedRentalDetails,
  editedRentalDetailsError,
  editedRentalFileName,
  importingRentalTarget,
  editingStayItemId,
  editedStayDetails,
  editedStayDetailsError,
  editedStayFileName,
  importingStayTarget,
  onToggle,
  onToggleDay,
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
  plan: TravelPlan;
  items: TravelItineraryItemModel[];
  minimizedItemIds: Set<string>;
  collapsedDayDates: Set<string>;
  dateDisplayFormat: DateDisplayFormat;
  editingFlightItemId?: string;
  editedFlightDetails: FlightDetailsDraft;
  editedFlightDetailsError?: string;
  editedFlightFileName?: string;
  importingFlightTarget?: string;
  editingRentalItemId?: string;
  editedRentalDetails: RentalDetailsDraft;
  editedRentalDetailsError?: string;
  editedRentalFileName?: string;
  importingRentalTarget?: string;
  editingStayItemId?: string;
  editedStayDetails: StayDetailsDraft;
  editedStayDetailsError?: string;
  editedStayFileName?: string;
  importingStayTarget?: string;
  onToggle: (itemId: string) => void;
  onToggleDay: (date: string) => void;
  onEditedFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: (itemId: string) => void;
  onSaveFlightDetails: (itemId: string, schedule: FlightScheduleDraft) => void;
  onCancelFlightEdit: () => void;
  onBeginFlightEdit: (
    itemId: string,
    flight: TravelItineraryItemModel['flight'],
  ) => void;
  onEditedRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: (itemId: string) => void;
  onSaveRentalDetails: (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onCancelRentalEdit: () => void;
  onBeginRentalEdit: (
    itemId: string,
    rental: TravelItineraryItemModel['rental'],
  ) => void;
  onEditedStayDetailsChange: (value: StayDetailsDraft) => void;
  onImportStay: (itemId: string) => void;
  onSaveStayDetails: (
    itemId: string,
    schedule: TravelRangeScheduleDraft,
  ) => void;
  onCancelStayEdit: () => void;
  onBeginStayEdit: (
    itemId: string,
    stay: TravelItineraryItemModel['stay'],
  ) => void;
  onAddPhotos: (itemId: string) => void;
  onRemovePhoto: (itemId: string, uri: string) => void;
  onRemove: (item: TravelItineraryItemModel) => void;
  onSaveNotes: (
    itemId: string,
    notes: NonNullable<TravelItineraryItemModel['notes']>,
  ) => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs, typography } = useResponsive();
  const days = groupTimelineEntriesByDate(expandTimelineEntries(items));
  const timeWidth = Math.max(46, s(48));
  const spineWidth = Math.max(24, s(26));
  const dotSize = Math.max(18, s(18));
  const dayTap = Math.max(32, s(32));
  const stripeW = Math.max(3, s(4));
  const trailColor = theme.name === 'light' ? '#E2D0B8' : theme.accentFaint;

  if (days.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          {
            backgroundColor: travelCardFill(theme),
            padding: rs.lg,
            gap: rs.md,
            borderRadius: 18,
            borderCurve: 'continuous',
            boxShadow: TRAVEL_CARD_SHADOW,
          },
        ]}>
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor: travelPanelTint(theme),
              width: Math.max(56, s(64)),
              height: Math.max(56, s(64)),
              borderRadius: radii.xl,
            },
          ]}>
          <Symbol name="flight" size="lg" color={TRAVEL_EDITORIAL_ACCENT} />
        </View>
        <AppText variant="subheading">Your Journey Starts Here</AppText>
        <AppText variant="body" color="secondary">
          Add flights, stays, activities, or moments with photos and notes —
          they show up here day by day. Tap + above to begin.
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.timeline, { gap: rs.xs }]}>
      {days.map((day, dayIndex) => {
        const dayNumber = dayNumberFor(plan.startDate, day.date);
        const dateLabel = formatDateKeyShort(day.date, dateDisplayFormat);
        const weekday = formatWeekday(day.date);
        const dayExpanded = !collapsedDayDates.has(day.date);
        const dayTitle = `Day ${dayNumber} · ${dateLabel}`;
        const stripe = dayStripeColor(dayIndex, theme);
        const entryCount = day.entries.length;
        return (
          <Animated.View
            key={day.date}
            entering={FadeInDown.delay(Math.min(dayIndex * 40, 200)).duration(280)}
            style={[
              styles.dayCard,
              {
                backgroundColor: travelCardFill(theme),
                borderRadius: Math.max(8, s(9)),
                borderCurve: 'continuous',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: travelCardBorder(theme),
                boxShadow: TRAVEL_CARD_SHADOW,
                overflow: 'hidden',
              },
            ]}>
            <View style={[styles.dayStripe, { width: stripeW, backgroundColor: stripe }]} />
            <View
              style={[
                styles.dayContent,
                {
                  gap: rs.xxs,
                  paddingTop: rs.xxs,
                  paddingBottom: rs.sm,
                  paddingLeft: rs.md,
                  paddingRight: rs.sm,
                },
              ]}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: dayExpanded }}
                accessibilityLabel={dayTitle}
                onPress={() => onToggleDay(day.date)}
                hitSlop={6}
                style={[styles.dayHeader, { minHeight: dayTap, gap: rs.xs }]}>
                <View style={styles.dayTitleBlock}>
                  <AppText variant="callout" fit style={styles.dayNumber}>
                    Day {dayNumber}
                  </AppText>
                  <AppText
                    variant="caption"
                    color="secondary"
                    fit
                    style={[
                      travelOverlineStyle,
                      styles.dayMeta,
                      {
                        fontSize: typography.overline.fontSize,
                        lineHeight: typography.overline.lineHeight,
                      },
                    ]}>
                    {weekday} · {dateLabel}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.countChip,
                    {
                      backgroundColor: travelPanelTint(theme),
                      minHeight: Math.max(18, s(18)),
                      paddingHorizontal: rs.sm,
                    },
                  ]}>
                  <AppText
                    variant="caption"
                    color="accent"
                    fit
                    style={{ fontSize: typography.overline.fontSize }}>
                    {entryCount} {entryCount === 1 ? 'Stop' : 'Stops'}
                  </AppText>
                </View>
                <View
                  style={[
                    styles.dayChevron,
                    {
                      minHeight: Math.max(18, s(18)),
                      minWidth: Math.max(18, s(18)),
                      borderRadius: radii.pill,
                      backgroundColor: theme.backgroundSunken,
                    },
                  ]}>
                  <Symbol
                    name={dayExpanded ? 'chevron-up' : 'chevron-down'}
                    size={10}
                    color={theme.textTertiary}
                  />
                </View>
              </Pressable>
              {dayExpanded ? (
                <View style={{ gap: rs.xs }}>
                  {day.entries.map((entry, index) => {
                    const { item } = entry;
                    const accent = kindAccent(item.kind, theme);
                    const hour = hourBucketMinutes(entry.startMinutes);
                    const prevHour =
                      index > 0
                        ? hourBucketMinutes(day.entries[index - 1].startMinutes)
                        : undefined;
                    const showHour = prevHour !== hour;
                    return (
                      <View
                        key={entry.key}
                        style={[styles.entryRow, { gap: rs.xs }]}>
                        <View style={[styles.timeColumn, { width: timeWidth }]}>
                          {showHour ? (
                            <AppText
                              variant="caption"
                              color="tertiary"
                              fit
                              style={[
                                styles.hourLabel,
                                {
                                  fontSize: typography.overline.fontSize,
                                  lineHeight: typography.overline.lineHeight,
                                },
                              ]}>
                              {formatHourLabel(entry.startMinutes)}
                            </AppText>
                          ) : null}
                        </View>
                        <View style={[styles.spineColumn, { width: spineWidth }]}>
                          <View
                            style={[
                              styles.spineLine,
                              {
                                top: rs.xs + dotSize / 2,
                                bottom: -rs.sm,
                                backgroundColor: trailColor,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.dot,
                              {
                                width: dotSize,
                                height: dotSize,
                                borderRadius: dotSize / 2,
                                backgroundColor: accent,
                                marginTop: rs.xs,
                              },
                            ]}>
                            <Symbol
                              name={kindIcon(item.kind)}
                              size={10}
                              color={theme.textOnAccent}
                            />
                          </View>
                        </View>
                        <View
                          style={[
                            styles.cardRow,
                            { gap: rs.xs },
                          ]}>
                          <TravelTimelineNode
                            item={item}
                            plan={plan}
                            phase={entry.phase}
                            displayTitle={entry.title}
                            entryDate={entry.date}
                            entryStartMinutes={entry.startMinutes}
                            showKindBadge={false}
                            compact
                            dense
                            allowStructuredEditing={false}
                            showStructuredDetails={false}
                            collapsedChevron="right"
                            expanded={!minimizedItemIds.has(entry.key)}
                            dateDisplayFormat={dateDisplayFormat}
                            editingFlightItemId={editingFlightItemId}
                            editedFlightDetails={editedFlightDetails}
                            editedFlightDetailsError={editedFlightDetailsError}
                            editedFlightFileName={editedFlightFileName}
                            importingFlight={importingFlightTarget === item.id}
                            editingRentalItemId={editingRentalItemId}
                            editedRentalDetails={editedRentalDetails}
                            editedRentalDetailsError={editedRentalDetailsError}
                            editedRentalFileName={editedRentalFileName}
                            importingRental={importingRentalTarget === item.id}
                            editingStayItemId={editingStayItemId}
                            editedStayDetails={editedStayDetails}
                            editedStayDetailsError={editedStayDetailsError}
                            editedStayFileName={editedStayFileName}
                            importingStay={importingStayTarget === item.id}
                            planStartDate={plan.startDate}
                            planEndDate={plan.endDate}
                            onToggle={() => onToggle(entry.key)}
                            onEditedFlightDetailsChange={onEditedFlightDetailsChange}
                            onImportFlight={() => onImportFlight(item.id)}
                            onSaveFlightDetails={(schedule) =>
                              onSaveFlightDetails(item.id, schedule)
                            }
                            onCancelFlightEdit={onCancelFlightEdit}
                            onBeginFlightEdit={() =>
                              onBeginFlightEdit(item.id, item.flight)
                            }
                            onEditedRentalDetailsChange={onEditedRentalDetailsChange}
                            onImportRental={() => onImportRental(item.id)}
                            onSaveRentalDetails={(schedule) =>
                              onSaveRentalDetails(item.id, schedule)
                            }
                            onCancelRentalEdit={onCancelRentalEdit}
                            onBeginRentalEdit={() =>
                              onBeginRentalEdit(item.id, item.rental)
                            }
                            onEditedStayDetailsChange={onEditedStayDetailsChange}
                            onImportStay={() => onImportStay(item.id)}
                            onSaveStayDetails={(schedule) =>
                              onSaveStayDetails(item.id, schedule)
                            }
                            onCancelStayEdit={onCancelStayEdit}
                            onBeginStayEdit={() =>
                              onBeginStayEdit(item.id, item.stay)
                            }
                            onAddPhotos={() => onAddPhotos(item.id)}
                            onRemovePhoto={(uri) => onRemovePhoto(item.id, uri)}
                            onRemove={() => onRemove(item)}
                            onSaveNotes={(notes) => onSaveNotes(item.id, notes)}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: {},
  dayCard: {
    flexDirection: 'row',
  },
  dayStripe: {
    alignSelf: 'stretch',
  },
  dayContent: {
    flex: 1,
    minWidth: 0,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayTitleBlock: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  dayNumber: {
    flexShrink: 1,
    minWidth: 0,
  },
  dayMeta: {
    flexShrink: 1,
    minWidth: 0,
    textTransform: 'none',
  },
  countChip: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayChevron: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  entryRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: 0,
  },
  timeColumn: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  hourLabel: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
    minWidth: 0,
  },
  spineColumn: {
    alignItems: 'center',
    flexShrink: 0,
    position: 'relative',
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spineLine: {
    position: 'absolute',
    width: 3,
    borderRadius: 2,
  },
  emptyCard: {
    alignItems: 'flex-start',
  },
  emptyIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
