import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton } from '@/components/primitives';
import { fontFamilies, spacing } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import { TravelTripNotesCard } from '@/features/travel/travel-trip-notes-card';
import { TravelPlanTitle } from '@/features/travel/travel-plan-title';
import type { TravelPlan } from '@/features/travel/types';
import { travelPlanModeLabel } from '@/features/travel/travel-mode';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { formatDateKey, type DateDisplayFormat } from '@/utils/date';
import { AgentUiIds } from '@/utils/agent-ui';
import { goBackOrReplace } from '@/utils/navigation';

export function TravelPlanHero({
  plan,
  dateDisplayFormat,
  onAddPress,
  onEditDates,
}: {
  plan: TravelPlan;
  dateDisplayFormat: DateDisplayFormat;
  onAddPress?: () => void;
  onEditDates?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { s, spacing: rs } = useResponsive();
  const dayCount = tripDayCount(plan.startDate, plan.endDate);
  const showDestination =
    plan.title.trim().toLowerCase() !== plan.destination.trim().toLowerCase();

  return (
    <View style={[styles.hero, { gap: rs.sm }]}>
      <View style={[styles.titleRow, { gap: rs.lg }]}>
        <IconButton
          icon="back"
          size={Math.max(32, s(32))}
          background={theme.backgroundElevated}
          borderColor={theme.separator}
          accessibilityLabel="Go Back"
          testID={AgentUiIds.chrome.back}
          onPress={() => goBackOrReplace(router, '/(tabs)/travel' as Href)}
        />
        <View style={styles.headerCopy}>
          {showDestination ? (
            <AppText
              variant="overline"
              color="secondary"
              fit
              style={[travelOverlineStyle, styles.serif]}>
              {travelPlanModeLabel(plan.mode ?? 'flight')} ·{' '}
              {plan.origin ? `${plan.origin} → ${plan.destination}` : plan.destination}
            </AppText>
          ) : null}
          <TravelPlanTitle title={plan.title} fontSize={Math.max(29, s(30))} />
        </View>
        {onAddPress ? (
          <IconButton
            icon="add"
            size={Math.max(32, s(32))}
            background={theme.backgroundElevated}
            borderColor={theme.separator}
            accessibilityLabel="Add to Timeline"
            testID={AgentUiIds.travel.planDetail.addToTimeline}
            onPress={onAddPress}
          />
        ) : null}
      </View>

      <TravelTripDatesRow
        startLabel={formatDateKey(plan.startDate, dateDisplayFormat)}
        endLabel={formatDateKey(plan.endDate, dateDisplayFormat)}
        dayCount={dayCount}
        compact
        onPress={onEditDates}
        testID={onEditDates ? AgentUiIds.travel.list.editDates(plan.id) : undefined}
      />

      {plan.notes ? <TravelTripNotesCard notes={plan.notes} /> : null}
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
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
});
