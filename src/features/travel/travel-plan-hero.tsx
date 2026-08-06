import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import { fontFamilies } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelHeaderFlourish } from '@/features/travel/travel-flight-path-arc';
import { travelPlanModeLabel } from '@/features/travel/travel-mode';
import { TravelPlanTitle } from '@/features/travel/travel-plan-title';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import { TravelTripNotesCard } from '@/features/travel/travel-trip-notes-card';
import { tripHeroPlaceName } from '@/features/travel/trip-hero-place';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { goBackOrReplace } from '@/utils/navigation';

export function TravelPlanHero({
  plan,
  onAddPress,
  onEditDates,
}: {
  plan: TravelPlan;
  onAddPress?: () => void;
  onEditDates?: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { s, spacing: rs, typography } = useResponsive();
  const dayCount = tripDayCount(plan.startDate, plan.endDate);
  const placeName = tripHeroPlaceName(plan.destination, plan.title);
  const destination = plan.destination.trim();
  const showPin =
    destination.length > 0 &&
    destination.toLowerCase() !== placeName.toLowerCase();
  const modePrefix = `${travelPlanModeLabel(plan.mode ?? 'flight')} to`;
  const pinMute = theme.textSecondary;

  return (
    <View style={[styles.hero, { gap: Math.max(rs.md, s(20)) }]}>
      <View style={[styles.titleRow, { gap: rs.md }]}>
        <IconButton
          icon="back"
          size={Math.max(32, s(32))}
          background={theme.backgroundElevated}
          borderColor={theme.separator}
          accessibilityLabel="Go Back"
          testID={AgentUiIds.chrome.back}
          onPress={() => goBackOrReplace(router, '/(tabs)/travel' as Href)}
        />
        <TravelHeaderFlourish style={styles.headerCopy}>
          <AppText
            variant="overline"
            fit
            style={[
              travelOverlineStyle,
              styles.serif,
              {
                color: theme.textPrimary,
                fontSize: Math.max(12, typography.caption.fontSize),
                lineHeight: Math.max(16, s(16)),
              },
            ]}>
            {modePrefix}
          </AppText>
          <TravelPlanTitle title={placeName} fontSize={Math.max(32, s(34))} />
          {showPin ? (
            <View
              style={[
                styles.pinRow,
                {
                  gap: Math.max(3, rs.xxs),
                  marginTop: Math.max(2, s(2)),
                  paddingRight: Math.max(72, s(80)),
                },
              ]}>
              <Symbol
                name="location"
                size={Math.max(12, s(13))}
                color={pinMute}
              />
              <AppText
                variant="caption"
                fit
                numberOfLines={1}
                style={[
                  styles.serif,
                  styles.pinLabel,
                  {
                    color: pinMute,
                    fontSize: Math.max(13, typography.caption.fontSize),
                    lineHeight: Math.max(17, s(17)),
                  },
                ]}>
                {destination}
              </AppText>
            </View>
          ) : null}
        </TravelHeaderFlourish>
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
        startDate={plan.startDate}
        endDate={plan.endDate}
        dayCount={dayCount}
        compact
        onPress={onEditDates}
        testID={onEditDates ? AgentUiIds.travel.list.editDates(plan.id) : undefined}
      />

      {plan.notes ? (
        <TravelTripNotesCard
          notes={plan.notes}
          toggleTestID={AgentUiIds.travel.planDetail.notesSection}
        />
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
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
  pinLabel: {
    flexShrink: 1,
    minWidth: 0,
  },
});
