import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Symbol,
  useSafeAreaChrome,
  useSafeAreaChromeOverlay,
} from '@/components/primitives';
import { fontFamilies } from '@/design-system';
import { tripDayCount } from '@/features/travel/date-range';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { useTravelAtmosphere } from '@/features/travel/travel-atmosphere';
import { TravelHeaderFlourish } from '@/features/travel/travel-flight-path-arc';
import { TravelHeaderSkyDecor } from '@/features/travel/travel-header-sky-decor';
import { TRAVEL_HEADER_SKY_CONTENT_BAND } from '@/features/travel/travel-header-sky-height';
import {
  atmosphereHeaderInkColors,
  resolveAtmosphereHeaderInk,
} from '@/features/travel/travel-home-atmosphere-ink';
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
  color,
  accessibilityLabel,
  testID,
  onPress,
}: {
  icon: 'back' | 'add';
  size: number;
  /** Sky-aware ink so glyphs stay readable over night / day washes. */
  color: string;
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
          <Symbol name={icon} size="md" color={color} />
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
  const insets = useSafeAreaInsets();
  const atmosphere = useTravelAtmosphere();
  const { s, spacing: rs, typography } = useResponsive();
  const dayCount = tripDayCount(plan.startDate, plan.endDate);
  const placeName = tripHeroPlaceName(plan.destination, plan.title);
  const destination = plan.destination.trim();
  const showPin =
    destination.length > 0 &&
    destination.toLowerCase() !== placeName.toLowerCase();
  const themeDark = theme.name === 'dark';

  // One continuous sky plate on app-shell chrome (status bar + header).
  // Stack content stays transparent over this band so aurora/day washes stay live.
  const skyContentBand = Math.max(TRAVEL_HEADER_SKY_CONTENT_BAND, s(152));
  const skyChromeHeight = insets.top + skyContentBand;
  const statusBandRatio =
    skyChromeHeight > 0 ? insets.top / skyChromeHeight : 0;
  const skyDestination = destination || atmosphere.destination || '';
  const skyCondition = resolveHeaderSkyCondition({
    themeDark,
    timeOfDay: atmosphere.timeOfDay,
    weatherCode: atmosphere.weatherCode,
    timezone: atmosphere.timezone,
    destination: skyDestination,
    latitude: atmosphere.latitude,
  });
  const skyChrome = headerSkyChromeColor({
    themeDark,
    look: skyCondition.look,
    destination: skyDestination,
  });
  // Same luminance ink as Travel Home — white over night/aurora, black over bright day.
  const { ink: skyInk, muted: skyInkMuted } = atmosphereHeaderInkColors(
    resolveAtmosphereHeaderInk({
      themeDark,
      averageColor: skyChrome,
    }),
  );
  useSafeAreaChrome(skyChrome, { priority: 1 });
  const skyOverlay = useMemo(
    () => (
      <TravelHeaderSkyDecor
        destination={skyDestination}
        dateKey={plan.startDate}
        latitude={atmosphere.latitude}
        longitude={atmosphere.longitude}
        timeOfDay={atmosphere.timeOfDay}
        weatherCode={atmosphere.weatherCode}
        timezone={atmosphere.timezone}
        statusBandRatio={statusBandRatio}
      />
    ),
    [
      atmosphere.latitude,
      atmosphere.longitude,
      atmosphere.timeOfDay,
      atmosphere.timezone,
      atmosphere.weatherCode,
      plan.startDate,
      skyDestination,
      statusBandRatio,
    ],
  );
  useSafeAreaChromeOverlay(skyOverlay, skyChromeHeight, { priority: 1 });

  return (
    <View style={[styles.hero, { gap: Math.max(rs.md, s(20)) }]}>
      <View style={[styles.headerBlock, { minHeight: skyContentBand }]}>
        <View
          style={[
            styles.titleRow,
            {
              gap: rs.md,
              // Breathing room under the status-bar band of the chrome sky.
              paddingTop: Math.max(rs.lg, s(24)),
            },
          ]}>
          <TravelHeroGlassIconButton
            icon="back"
            size={Math.max(32, s(32))}
            color={skyInk}
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
                  color: skyInkMuted,
                  fontSize: Math.max(12, typography.caption.fontSize),
                  lineHeight: Math.max(16, s(16)),
                },
              ]}>
              Itinerary
            </AppText>
            <TravelPlanTitle
              title={placeName}
              fontSize={Math.max(32, s(34))}
              style={{ color: skyInk }}
            />
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
                  color={skyInkMuted}
                />
                <AppText
                  variant="caption"
                  fit
                  numberOfLines={1}
                  style={[
                    styles.serif,
                    styles.pinLabel,
                    {
                      color: skyInkMuted,
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
              color={skyInk}
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
