import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import {
  TRAVEL_CARD_SHADOW,
  TRAVEL_EDITORIAL_ACCENT,
  travelPillBg,
} from '@/features/travel/travel-surface';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, type DateDisplayFormat } from '@/utils/date';

export function TravelPlanHero({
  plan,
  dateDisplayFormat,
  onAddPress,
}: {
  plan: TravelPlan;
  dateDisplayFormat: DateDisplayFormat;
  onAddPress?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { s, spacing: rs } = useResponsive();
  const dayCount = tripDayCount(plan.startDate, plan.endDate);
  const showDestination =
    plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase();
  const pillBg = travelPillBg(theme);

  return (
    <View style={[styles.hero, { gap: rs.md }]}>
      <View style={[styles.titleRow, { gap: rs.xs }]}>
        <IconButton
          icon="back"
          size={36}
          background="transparent"
          borderColor={theme.separator}
          accessibilityLabel="Go Back"
          onPress={() => router.replace('/(tabs)/travel' as Href)}
        />
        <View style={styles.headerCopy}>
          {showDestination ? (
            <AppText
              variant="overline"
              color="secondary"
              fit
              style={[travelOverlineStyle, styles.serif]}>
              {plan.destination}
            </AppText>
          ) : null}
          <AppText style={styles.title} fit numberOfLines={2}>
            {plan.title}
          </AppText>
        </View>
        {onAddPress ? (
          <IconButton
            icon="add"
            size={36}
            background="transparent"
            borderColor={theme.separator}
            accessibilityLabel="Add to Timeline"
            onPress={onAddPress}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.datePill,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.separator,
            boxShadow: TRAVEL_CARD_SHADOW,
            minHeight: Math.max(44, s(44)),
            gap: rs.sm,
            paddingHorizontal: rs.md,
          },
        ]}>
        <View
          style={[
            styles.dateIcon,
            {
              backgroundColor: pillBg,
              width: Math.max(32, s(32)),
              height: Math.max(32, s(32)),
            },
          ]}>
          <Symbol name="calendar" size="sm" color={TRAVEL_EDITORIAL_ACCENT} />
        </View>
        <AppText variant="callout" fit style={[styles.dateText, styles.serif]}>
          {formatDateKey(plan.startDate, dateDisplayFormat)} →{' '}
          {formatDateKey(plan.endDate, dateDisplayFormat)}
          {` (${dayCount} ${dayCount === 1 ? 'day' : 'days'})`}
        </AppText>
      </View>

      {plan.notes ? (
        <AppText variant="body" color="secondary" style={styles.serif} numberOfLines={3}>
          {plan.notes}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
  },
  titleRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '400',
    letterSpacing: -0.7,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 13,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dateIcon: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});
