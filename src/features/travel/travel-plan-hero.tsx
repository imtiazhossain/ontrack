import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/primitives';
import { fontFamilies, spacing } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
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

  return (
    <View style={[styles.hero, { gap: rs.sm }]}>
      <View style={[styles.titleRow, { gap: rs.xs }]}>
        <IconButton
          icon="back"
          size={Math.max(32, s(32))}
          background={theme.backgroundElevated}
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
          <AppText
            style={[
              styles.title,
              { fontSize: Math.max(29, s(30)), lineHeight: Math.max(34, s(35)) },
            ]}
            fit
            numberOfLines={1}>
            {plan.title}
          </AppText>
        </View>
        {onAddPress ? (
          <IconButton
            icon="add"
            size={Math.max(32, s(32))}
            background={theme.backgroundElevated}
            borderColor={theme.separator}
            accessibilityLabel="Add to Timeline"
            onPress={onAddPress}
          />
        ) : null}
      </View>

      <TravelTripDatesRow
        startLabel={formatDateKey(plan.startDate, dateDisplayFormat)}
        endLabel={formatDateKey(plan.endDate, dateDisplayFormat)}
        dayCount={dayCount}
        compact
      />

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
});
