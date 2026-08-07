import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Symbol,
  useSafeAreaChrome,
} from '@/components/primitives';
import { fontFamilies } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { useTravelAtmosphere } from '@/features/travel/travel-atmosphere';
import { TravelHeaderFlourish } from '@/features/travel/travel-flight-path-arc';
import { TravelHeaderSkyDecor } from '@/features/travel/travel-header-sky-decor';
import { TRAVEL_HEADER_SKY_CONTENT_BAND } from '@/features/travel/travel-header-sky-height';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { TravelPlanTitle } from '@/features/travel/travel-plan-title';
import {
  headerSkyChromeColor,
  resolveHeaderSkyCondition,
} from '@/features/travel/travel-sky-condition';
import { TravelTripDatesRow } from '@/features/travel/travel-trip-dates-row';
import { TravelTripNotesCard } from '@/features/travel/travel-trip-notes-card';
import { tripHeroPlaceName } from '@/features/travel/trip-hero-place';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';
import { goBackOrReplace } from '@/utils/navigation';

function TravelHeroGlassIconButton({
  icon,
  size,
  accessibilityLabel,
  testID,
  onPress,
}: {
  icon: 'back' | 'add';
  size: number;
  accessibilityLabel: string;
  testID?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const dark = theme.name === 'dark';
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  return (
    <AgentTestId
      testID={testID}
      label={accessibilityLabel}
      onPress={handlePress}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={handlePress}
        hitSlop={Math.max(6, (44 - size) / 2)}
        style={({ pressed }) => [
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: pressed ? 0.72 : 1,
            boxShadow: dark
              ? '0 3px 10px rgba(0,0,0,0.35)'
              : '0 3px 10px rgba(17, 74, 110, 0.14)',
          },
        ]}>
        <TravelHomeGlass
          clear
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Symbol name={icon} size="md" color={theme.textPrimary} />
        </TravelHomeGlass>
      </Pressable>
    </AgentTestId>
  );
}

export function TravelPlanHero({
  plan,
  onAddPress,
  onEditDates,
  onEditNotes,
  notesExpanded,
  onNotesExpandedChange,
}: {
  plan: TravelPlan;
  onAddPress?: () => void;
  onEditDates?: () => void;
  onEditNotes?: () => void;
  notesExpanded?: boolean;
  onNotesExpandedChange?: (expanded: boolean) => void;
}) {
  const theme = useTheme();
  const router = useRouter();
  const atmosphere = useTravelAtmosphere();
  const { s, spacing: rs, typography, layout } = useResponsive();
  const dayCount = tripDayCount(plan.startDate, plan.endDate);
  const placeName = tripHeroPlaceName(plan.destination, plan.title);
  const destination = plan.destination.trim();
  const showPin =
    destination.length > 0 &&
    destination.toLowerCase() !== placeName.toLowerCase();
  const pinMute = theme.textSecondary;

  // Dynamic sky lives in the header (stack fills often cover app-shell chrome
  // below the inset). Status bar gets a matching static wash so the bands join
  // without duplicating stars/clouds/moon.
  const skyContentBand = Math.max(TRAVEL_HEADER_SKY_CONTENT_BAND, s(128));
  const skyDestination = destination || atmosphere.destination || '';
  const skyCondition = resolveHeaderSkyCondition({
    themeDark: theme.name === 'dark',
    timeOfDay: atmosphere.timeOfDay,
    weatherCode: atmosphere.weatherCode,
    timezone: atmosphere.timezone,
    destination: skyDestination,
    latitude: atmosphere.latitude,
  });
  // Priority > layout wash: child focus effects run before parents, so without
  // this the travel stack's black chrome would cover the night-sky status band.
  useSafeAreaChrome(
    headerSkyChromeColor({
      themeDark: theme.name === 'dark',
      look: skyCondition.look,
    }),
    { priority: 1 },
  );
  const edgeBleed = layout.screenPadding;

  return (
    <View style={[styles.hero, { gap: Math.max(rs.md, s(20)) }]}>
      <View style={[styles.headerBlock, { minHeight: skyContentBand }]}>
        <View
          pointerEvents="none"
          style={[
            styles.skyOnHeader,
            {
              height: skyContentBand,
              marginHorizontal: -edgeBleed,
            },
          ]}>
          <TravelHeaderSkyDecor
            destination={skyDestination}
            dateKey={plan.startDate}
            latitude={atmosphere.latitude}
            longitude={atmosphere.longitude}
            timeOfDay={atmosphere.timeOfDay}
            weatherCode={atmosphere.weatherCode}
            timezone={atmosphere.timezone}
            // Header-only plate — celestial clearance from the top of this band.
            statusBandRatio={0}
          />
        </View>
        <View style={[styles.titleRow, { gap: rs.md }]}>
          <TravelHeroGlassIconButton
            icon="back"
            size={Math.max(32, s(32))}
            accessibilityLabel="Go Back"
            testID={AgentUiIds.chrome.back}
            onPress={() => goBackOrReplace(router, '/(tabs)/travel' as Href)}
          />
          <TravelHeaderFlourish style={styles.headerCopy} sky={false}>
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
              Itinerary
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
            <TravelHeroGlassIconButton
              icon="add"
              size={Math.max(32, s(32))}
              accessibilityLabel="Add to Timeline"
              testID={AgentUiIds.travel.planDetail.addToTimeline}
              onPress={onAddPress}
            />
          ) : null}
        </View>
      </View>

      <TravelTripDatesRow
        startDate={plan.startDate}
        endDate={plan.endDate}
        dayCount={dayCount}
        compact
        onPress={onEditDates}
        testID={onEditDates ? AgentUiIds.travel.list.editDates(plan.id) : undefined}
      />

      {plan.notes || onEditNotes ? (
        <TravelTripNotesCard
          notes={plan.notes ?? ''}
          toggleTestID={AgentUiIds.travel.planDetail.notesSection}
          editTestID={
            onEditNotes ? AgentUiIds.travel.planDetail.editNotes : undefined
          }
          onEdit={onEditNotes}
          expanded={notesExpanded}
          onExpandedChange={onNotesExpandedChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
  },
  headerBlock: {
    position: 'relative',
    width: '100%',
    overflow: 'visible',
  },
  skyOnHeader: {
    ...StyleSheet.absoluteFill,
    bottom: undefined,
    zIndex: 0,
  },
  titleRow: {
    position: 'relative',
    zIndex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  headerCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 2,
    zIndex: 1,
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
