import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { tripDatesBadge } from '@/features/travel/date-range';
import {
  TRAVEL_TITLE_ICON_GAP,
  travelEditorialTextStyle,
} from '@/features/travel/travel-chrome';
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

/** Trip-card dates strip — glass bar, duration pill left of countdown / status. */
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
  const statusLabel =
    statusBadge?.kind === 'label'
      ? statusBadge.label
      : badgeComplete
        ? 'Complete'
        : null;
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
  const trailingLabels = [durationLabel, statusLabel].filter(Boolean).join(', ');
  const accessibilityLabel = weekdayRange
    ? `Trip dates ${primaryLabel}, ${weekdayRange}, ${trailingLabels}`
    : `Trip dates ${primaryLabel}, ${trailingLabels}`;
  const handlePress = () => {
    haptics.tap();
    onPress?.();
  };
  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: onPress ? handlePress : undefined,
  });
  const radius = compact ? Math.max(12, s(14)) : Math.max(16, s(18));
  const badgeMinHeight = compact ? Math.max(24, s(26)) : Math.max(30, s(32));
  const badgePadH = compact ? rs.sm : Math.max(12, rs.md);
  const badgePadHIcon = compact ? Math.max(6, rs.xs) : Math.max(8, rs.sm);
  const badgeMinWidthIcon = compact ? Math.max(24, s(26)) : Math.max(30, s(32));
  const badgeFill =
    theme.name === 'dark' ? theme.backgroundSunken : theme.accentFaint;
  const badgeBorder =
    theme.name === 'dark' ? theme.separator : theme.accentSoft;
  const badgeTextSize = compact
    ? Math.max(11, s(11))
    : Math.max(14, typography.caption.fontSize + 1.5);
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

  const renderTextBadge = (label: string) => (
    <View
      key={label}
      style={[
        styles.badge,
        {
          backgroundColor: badgeFill,
          borderColor: badgeBorder,
          minHeight: badgeMinHeight,
          paddingHorizontal: badgePadH,
          borderWidth: StyleSheet.hairlineWidth,
        },
      ]}>
      <AppText
        variant="caption"
        fit
        numberOfLines={1}
        style={[
          compact ? styles.badgeLabelCompact : styles.badgeLabel,
          {
            color: theme.accentPrimary,
            fontSize: badgeTextSize,
          },
        ]}>
        {label}
      </AppText>
    </View>
  );

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
      <View style={[styles.badges, { gap: Math.max(6, s(6)) }]}>
        {renderTextBadge(durationLabel)}
        {statusLabel && !badgeComplete ? renderTextBadge(statusLabel) : null}
        {badgeComplete ? (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: badgeFill,
                borderColor: badgeBorder,
                minHeight: badgeMinHeight,
                minWidth: badgeMinWidthIcon,
                paddingHorizontal: badgePadHIcon,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}>
            <Symbol
              name="check"
              size={compact ? Math.max(14, s(14)) : Math.max(16, s(16))}
              color={theme.accentPrimary}
            />
          </View>
        ) : null}
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
    ...travelEditorialTextStyle,
    fontWeight: '400',
  },
  dates: {
    ...travelEditorialTextStyle,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  datesCompact: {
    ...travelEditorialTextStyle,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
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
    ...travelEditorialTextStyle,
    fontWeight: '500',
  },
  badgeLabelCompact: {
    ...travelEditorialTextStyle,
    fontWeight: '500',
  },
  pressed: { opacity: 0.72 },
});
