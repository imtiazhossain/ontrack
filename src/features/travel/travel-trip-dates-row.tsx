import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { tripDatesBadge } from '@/features/travel/date-range';
import { TRAVEL_TITLE_ICON_GAP } from '@/features/travel/travel-chrome';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelPillBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import {
    formatTripDateRangeLabel,
    formatTripWeekdayRangeLabel,
} from '@/utils/date';
import { haptics } from '@/utils/haptics';

const TRAVEL_DATE_SHADOW = '0 2px 8px rgba(17, 74, 110, 0.10)';

interface TravelTripDatesRowProps {
  /** Non-compact list chrome: preformatted start label. */
  startLabel?: string;
  /** Non-compact list chrome: preformatted end label. */
  endLabel?: string;
  /** Compact plan-detail chrome: raw date keys for medium + weekday range. */
  startDate?: string;
  endDate?: string;
  dayCount: number;
  compact?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Trip-card dates strip — glass bar, outlined duration / countdown pill. */
export function TravelTripDatesRow({
  startLabel,
  endLabel,
  startDate,
  endDate,
  dayCount,
  compact = false,
  onPress,
  testID,
}: TravelTripDatesRowProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography } = useResponsive();
  const titleIconGap = Math.max(TRAVEL_TITLE_ICON_GAP, s(TRAVEL_TITLE_ICON_GAP));
  const durationLabel = `${dayCount} ${dayCount === 1 ? 'Day' : 'Days'}`;
  const statusBadge =
    compact && startDate && endDate ? tripDatesBadge(startDate, endDate) : null;
  const badgeComplete = statusBadge?.kind === 'complete';
  const badgeLabel = badgeComplete
    ? 'Complete'
    : statusBadge?.kind === 'label'
      ? statusBadge.label
      : durationLabel;
  const compactRange =
    compact && startDate && endDate
      ? formatTripDateRangeLabel(startDate, endDate)
      : undefined;
  const weekdayRange =
    compact && startDate && endDate
      ? formatTripWeekdayRangeLabel(startDate, endDate)
      : undefined;
  const primaryLabel =
    compactRange ??
    (startLabel && endLabel ? `${startLabel} → ${endLabel}` : startLabel ?? endLabel ?? '');
  const accessibilityLabel = weekdayRange
    ? `Trip dates ${primaryLabel}, ${weekdayRange}, ${badgeLabel}`
    : `Trip dates ${primaryLabel}, ${badgeLabel}`;
  const handlePress = () => {
    haptics.tap();
    onPress?.();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: onPress ? handlePress : undefined,
  });
  const radius = compact ? Math.max(12, s(14)) : Math.max(16, s(18));
  const rowStyle = [
    styles.row,
    {
      boxShadow: TRAVEL_DATE_SHADOW,
      minHeight: compact ? Math.max(52, s(54)) : Math.max(58, s(60)),
      paddingHorizontal: compact ? rs.md : rs.lg,
      paddingVertical: compact ? rs.sm : rs.sm,
      gap: titleIconGap,
      borderRadius: radius,
      // Non-compact fallback keeps a soft pill fill under glass intensity.
      ...(compact ? {} : { backgroundColor: travelPillBg(theme) }),
    },
  ];

  const content = (
    <>
      <View style={styles.copy}>
        {!compact ? (
          <AppText
            variant="caption"
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: chrome.subtitle,
                fontSize: Math.max(12, typography.caption.fontSize - 0.5),
                lineHeight: Math.max(16, s(16)),
              },
            ]}>
            Trip Dates
          </AppText>
        ) : null}
        <AppText
          variant="callout"
          fit
          numberOfLines={1}
          style={[
            compact ? styles.datesCompact : styles.dates,
            {
              color: chrome.title,
              fontSize: compact
                ? Math.max(14, typography.callout.fontSize)
                : Math.max(16, typography.callout.fontSize + 1),
              lineHeight: compact
                ? Math.max(18, typography.callout.lineHeight)
                : Math.max(22, s(22)),
            },
          ]}>
          {primaryLabel}
        </AppText>
        {weekdayRange ? (
          <AppText
            variant="caption"
            color="secondary"
            fit
            numberOfLines={1}
            style={{
              fontSize: Math.max(12, typography.caption.fontSize - 0.5),
              lineHeight: Math.max(16, s(16)),
            }}>
            {weekdayRange}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.badge,
          {
            backgroundColor:
              theme.name === 'dark' ? theme.backgroundSunken : theme.accentFaint,
            borderColor: theme.name === 'dark' ? theme.separator : theme.accentSoft,
            minHeight: compact ? Math.max(24, s(26)) : Math.max(30, s(32)),
            minWidth: badgeComplete
              ? compact
                ? Math.max(24, s(26))
                : Math.max(30, s(32))
              : undefined,
            paddingHorizontal: badgeComplete
              ? compact
                ? Math.max(6, rs.xs)
                : Math.max(8, rs.sm)
              : compact
                ? rs.sm
                : Math.max(12, rs.md),
            borderWidth: StyleSheet.hairlineWidth,
          },
        ]}>
        {badgeComplete ? (
          <Symbol
            name="check"
            size={compact ? Math.max(14, s(14)) : Math.max(16, s(16))}
            color={theme.accentPrimary}
          />
        ) : (
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={[
              compact ? styles.badgeLabelCompact : styles.badgeLabel,
              {
                color: theme.accentPrimary,
                fontSize: compact
                  ? Math.max(11, s(11))
                  : Math.max(14, typography.caption.fontSize + 1.5),
              },
            ]}>
            {badgeLabel}
          </AppText>
        )}
      </View>
    </>
  );

  const plate = (
    <TravelHomeGlass clear style={rowStyle}>
      {content}
    </TravelHomeGlass>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={accessibilityLabel}>
        {plate}
      </View>
    );
  }

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens a calendar to change the trip dates"
      onPress={handlePress}
      style={({ pressed }) => [pressed && styles.pressed]}>
      {plate}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  dates: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  datesCompact: {
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  badge: {
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '500',
  },
  badgeLabelCompact: {
    fontWeight: '500',
  },
  pressed: { opacity: 0.72 },
});
