import { Tabs, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import {
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
    Pressable,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText, Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { radii } from '@/design-system';
import { useHomeWeather } from '@/features/daily-tracking/use-home-weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { useTodos } from '@/store/todos';
import { useUI } from '@/store/ui';
import {
  isAgentUiEnabled,
  registerAgentUiTarget,
  tabTestIdForRoute,
  unregisterAgentUiTarget,
} from '@/utils/agent-ui';

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

const VISIBLE_ITEM_COUNT = 5;
const TRACK_REPEAT_COUNT = 5;
const MAX_CAROUSEL_WIDTH = 720;
const VELOCITY_PROJECTION_SECONDS = 0.2;
const MAX_FLING_ITEMS = 5;
const SNAP_SPRING = {
  damping: 22,
  stiffness: 230,
  mass: 0.78,
} as const;
const SELECTION_SPRING = {
  damping: 20,
  stiffness: 205,
  mass: 0.72,
} as const;
function canonicalPositionForRoute(index: number, routeCount: number) {
  'worklet';
  const signedIndex = index > routeCount / 2 ? index - routeCount : index;
  return -signedIndex;
}

const TAB_META: Record<
  string,
  { label: string; icon: AppIconName; href: Href }
> = {
  index: { label: 'Today', icon: 'today', href: '/(tabs)' },
  calendar: {
    label: 'Calendar',
    icon: 'calendar',
    href: '/(tabs)/calendar',
  },
  'to-do': {
    label: 'Checklists',
    icon: 'tasks',
    href: '/(tabs)/to-do',
  },
  social: {
    label: 'Social',
    icon: 'people',
    href: '/(tabs)/social',
  },
  insights: {
    label: 'Insights',
    icon: 'insights',
    href: '/(tabs)/insights',
  },
  profile: {
    label: 'Profile',
    icon: 'profile',
    href: '/(tabs)/profile',
  },
  workouts: {
    label: 'Workout',
    icon: 'gym',
    href: '/(tabs)/workouts',
  },
  plants: { label: 'Plants', icon: 'plant', href: '/(tabs)/plants' },
  travel: { label: 'Travel', icon: 'flight', href: '/(tabs)/travel' },
  'vision-board': {
    // Short chrome label so five equal slots keep even visual gutters.
    label: 'Vision',
    icon: 'vision-board',
    href: '/(tabs)/vision-board',
  },
  games: {
    label: 'Games',
    icon: 'games',
    href: '/(tabs)/games',
  },
  vehicles: {
    label: 'Vehicles',
    icon: 'vehicles',
    href: '/(tabs)/vehicles',
  },
  health: {
    label: 'Health',
    icon: 'health',
    href: '/(tabs)/health',
  },
};

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  'use no memo';
  const theme = useTheme();
  const router = useRouter();
  const { weather: homeWeather, icon: homeWeatherIcon } = useHomeWeather();
  const todayTabIcon: AppIconName = homeWeatherIcon ?? 'today';
  const todayAccessibilityExtra = homeWeather
    ? `, ${homeWeather.condition}`
    : '';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { spacing, layout, s } = useResponsive();
  const carouselBrowse = useUI((store) => store.carouselBrowse);
  const pendingRouteName = useUI(
    (store) => store.carouselPendingRouteName,
  );
  const setCarouselBrowse = useUI((store) => store.setCarouselBrowse);
  const setTabBarHeight = useUI((store) => store.setTabBarHeight);
  const enabledAddons = useAddons((store) => store.enabled);
  const openTaskCount = useTodos(
    (store) => store.tasks.filter((task) => !task.completed).length,
  );
  const visibleRoutes = useMemo(
    () =>
      state.routes.filter((route) => {
        if (route.name === 'workouts') return enabledAddons.fitness;
        if (route.name === 'plants') return enabledAddons.plants;
        if (route.name === 'travel') return enabledAddons.travel;
        if (route.name === 'vision-board') return enabledAddons['vision-board'];
        if (route.name === 'games') return enabledAddons.games;
        if (route.name === 'vehicles') return enabledAddons.vehicles;
        if (route.name === 'health') return process.env.EXPO_OS === 'ios' && enabledAddons.health;
        return route.name in TAB_META;
      }),
    [enabledAddons, state.routes],
  );

  useEffect(() => {
    // Locked-open nav + clear any stuck swipe/collapse flags from older builds
    // or interrupted springs (stuck claim blocks every tab press).
    useUI.setState({
      tabBarCollapsed: false,
      carouselSwipeClaimed: false,
      carouselPendingRouteName: null,
    });
  }, []);

  useEffect(() => {
    if (!isAgentUiEnabled()) return;
    const registered: string[] = [];
    for (const route of visibleRoutes) {
      const testID = tabTestIdForRoute(route.name);
      const meta = TAB_META[route.name];
      if (!testID || !meta) continue;
      registerAgentUiTarget(testID, {
        label:
          route.name === 'vision-board' ? 'Vision Board' : meta.label,
        press: () => router.navigate(meta.href),
      });
      registered.push(testID);
    }
    return () => {
      for (const testID of registered) unregisterAgentUiTarget(testID);
    };
  }, [router, visibleRoutes]);

  const selectedRoute = state.routes[state.index];
  const selectedVisibleIndex = visibleRoutes.findIndex(
    (route) => route.key === selectedRoute?.key,
  );
  const carouselWidth = Math.min(
    width - layout.screenPadding * 2,
    MAX_CAROUSEL_WIDTH,
  );
  // Inset from the pill’s rounded ends so outer and inner gutters match.
  const capsuleInset = Math.max(spacing.xs, s(6));
  const itemWidth =
    (carouselWidth - capsuleInset * 2) / VISIBLE_ITEM_COUNT;
  const browsedIndex = visibleRoutes.findIndex(
    (route) =>
      carouselBrowse?.anchorRouteName === selectedRoute?.name &&
      route.name === carouselBrowse.centerRouteName,
  );
  const selectedIndex = selectedVisibleIndex < 0 ? 0 : selectedVisibleIndex;
  const initialCenterIndex = browsedIndex < 0 ? selectedIndex : browsedIndex;
  const positionItems = useSharedValue(
    canonicalPositionForRoute(initialCenterIndex, visibleRoutes.length),
  );
  const gestureStartItems = useSharedValue(0);
  const trackItemCount = visibleRoutes.length * TRACK_REPEAT_COUNT;
  const centerSlot = Math.floor(trackItemCount / 2);
  const displayedRoutes = Array.from({ length: trackItemCount }, (_, slot) => {
    const offset = slot - centerSlot;
    const routeIndex =
      ((offset % visibleRoutes.length) + visibleRoutes.length) %
      visibleRoutes.length;
    return visibleRoutes[routeIndex];
  });
  const routeNames = visibleRoutes.map((route) => route.name);
  const baseTranslateX =
    (Math.floor(VISIBLE_ITEM_COUNT / 2) - centerSlot) * itemWidth;

  // Suppress the press that fires when a horizontal swipe ends on a tab.
  const suppressPressAfterPan = useRef(false);
  const setSwipeClaimed = (claimed: boolean) => {
    useUI.getState().setCarouselSwipeClaimed(claimed);
  };
  const releaseSwipeClaim = () => {
    setTimeout(() => {
      setSwipeClaimed(false);
      suppressPressAfterPan.current = false;
    }, 80);
  };
  const markPanMoved = () => {
    suppressPressAfterPan.current = true;
  };
  const commitBrowse = (routeName: string) => {
    setCarouselBrowse({
      anchorRouteName: selectedRoute.name,
      centerRouteName: routeName,
    });
  };
  const clearSelectionLock = () => {
    useUI.setState({
      carouselPendingRouteName: null,
      carouselSwipeClaimed: false,
    });
  };
  const finishSelection = (routeName: string) => {
    const ui = useUI.getState();
    if (ui.carouselPendingRouteName !== routeName) {
      clearSelectionLock();
      return;
    }

    const routeIndex = visibleRoutes.findIndex(
      (item) => item.name === routeName,
    );
    // Normalize by whole circles only. The permanent track never rebuilds.
    positionItems.value = canonicalPositionForRoute(
      routeIndex < 0 ? selectedIndex : routeIndex,
      visibleRoutes.length,
    );
    useUI.setState({
      carouselBrowse: null,
      carouselPendingRouteName: null,
      carouselSwipeClaimed: false,
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onStart(() => {
      gestureStartItems.value = positionItems.value;
      scheduleOnRN(setSwipeClaimed, true);
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) >= 8) {
        scheduleOnRN(markPanMoved);
      }
      positionItems.value =
        gestureStartItems.value + event.translationX / itemWidth;
    })
    .onEnd((event) => {
      const velocityItems = event.velocityX / itemWidth;
      const projectedItems =
        positionItems.value + velocityItems * VELOCITY_PROJECTION_SECONDS;
      const projectedDelta = projectedItems - gestureStartItems.value;
      const boundedDelta = Math.max(
        -MAX_FLING_ITEMS,
        Math.min(MAX_FLING_ITEMS, projectedDelta),
      );
      const targetItems =
        gestureStartItems.value + Math.round(boundedDelta);

      positionItems.value = withSpring(
        targetItems,
        {
          ...SNAP_SPRING,
          velocity: velocityItems,
        },
        (finished) => {
          if (!finished) {
            scheduleOnRN(clearSelectionLock);
            return;
          }
          const routeCount = routeNames.length;
          const rawRouteOffset =
            ((-targetItems % routeCount) + routeCount) % routeCount;
          const routeIndex = rawRouteOffset;

          positionItems.value = canonicalPositionForRoute(
            routeIndex,
            routeCount,
          );
          scheduleOnRN(commitBrowse, routeNames[routeIndex]);
        },
      );
    })
    .onFinalize(() => {
      scheduleOnRN(releaseSwipeClaim);
    });
  const trackStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: baseTranslateX + positionItems.value * itemWidth,
      },
    ],
  }));

  useEffect(() => {
    if (pendingRouteName) return;
    if (carouselBrowse?.anchorRouteName === selectedRoute.name) return;
    positionItems.value = withSpring(
      canonicalPositionForRoute(selectedIndex, visibleRoutes.length),
      SNAP_SPRING,
    );
  }, [
    carouselBrowse,
    pendingRouteName,
    positionItems,
    selectedIndex,
    selectedRoute.name,
    visibleRoutes.length,
  ]);

  // Pinned bar, always expanded. Dock width must match carouselWidth math
  // (screen padding + max width) so the infinite track clips and swipes correctly.
  const bottomLabelPad = insets.bottom > 0 ? 6 : spacing.sm;

  return (
    <View
      onLayout={(event) =>
        setTabBarHeight(event.nativeEvent.layout.height)
      }
      pointerEvents="box-none"
      style={[
        styles.dock,
        {
          height: layout.floatingTabBarBaseHeight + bottomLabelPad,
          maxWidth: MAX_CAROUSEL_WIDTH + layout.screenPadding * 2,
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.xxs,
          paddingBottom: bottomLabelPad,
          // Fill under the capsule so home-indicator pad isn't a content hole.
          backgroundColor: theme.backgroundElevated,
        },
      ]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          collapsable={false}
          style={[
            styles.capsule,
            { backgroundColor: theme.backgroundElevated },
          ]}>
          <View
            style={[
              styles.capsuleClip,
              { paddingHorizontal: capsuleInset },
            ]}>
            <Animated.View
              style={[
                styles.carouselTrack,
                { width: itemWidth * trackItemCount },
                trackStyle,
              ]}>
              {displayedRoutes.map((route, slotIndex) => {
          const meta = TAB_META[route.name];
          const focused = selectedRoute?.key === route.key;
          const visuallySelected = pendingRouteName
            ? pendingRouteName === route.name
            : focused;
          const color = visuallySelected
            ? theme.accentPrimary
            : theme.textSecondary;
          const badge = route.name === 'to-do' ? openTaskCount : 0;

          const tabIcon: AppIconName =
            route.name === 'index' ? todayTabIcon : meta.icon;
          const accessibilityLabel =
            descriptors[route.key].options.tabBarAccessibilityLabel ??
            (route.name === 'index'
              ? `${meta.label}${todayAccessibilityExtra}`
              : route.name === 'vision-board'
                ? 'Vision Board'
                : meta.label);

          const onPress = () => {
            // Only ignore the synthetic press at the end of a pan — never a
            // stuck global claim flag (that made the whole bar untappable).
            if (suppressPressAfterPan.current) {
              suppressPressAfterPan.current = false;
              return;
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              useUI.setState({
                carouselPendingRouteName: route.name,
                carouselSwipeClaimed: true,
              });
              // Navigate immediately; menu centering finishes after.
              // Re-selecting a tab also returns a nested stack to its root.
              router.navigate(TAB_META[route.name].href);
              const targetItems = centerSlot - slotIndex;
              positionItems.value = withSpring(
                targetItems,
                SELECTION_SPRING,
                (finished) => {
                  if (finished) scheduleOnRN(finishSelection, route.name);
                  else scheduleOnRN(clearSelectionLock);
                },
              );
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={`${route.key}-${slotIndex}`}
              testID={tabTestIdForRoute(route.name)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={accessibilityLabel}
              hitSlop={{ top: 4, bottom: 4 }}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                {
                  width: itemWidth,
                  minHeight: layout.minTapTarget,
                  paddingVertical: spacing.xxs,
                  paddingHorizontal: s(2),
                },
                pressed && styles.pressed,
              ]}>
              <View style={styles.iconSlot}>
                <Symbol name={tabIcon} size={20} color={color} />
                {badge > 0 ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.danger,
                        minWidth: s(20),
                        height: s(18),
                        paddingHorizontal: s(4),
                      },
                    ]}>
                    <Text
                      style={[
                        styles.badgeText,
                        { fontSize: s(10), lineHeight: s(13) },
                      ]}>
                      {badge > 99 ? '99+' : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <AppText
                variant="caption"
                fit
                fitMinimumScale={0.68}
                maxFontSizeMultiplier={1.1}
                align="center"
                style={{
                  color,
                  fontWeight: visuallySelected ? '600' : '400',
                  fontSize: s(9.5),
                  lineHeight: s(11),
                  width: '100%',
                  minWidth: 0,
                  flexShrink: 1,
                }}>
                {meta.label}
              </AppText>
              <View
                style={[
                  styles.indicator,
                  {
                    backgroundColor: visuallySelected
                      ? theme.accentPrimary
                      : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
              })}
            </Animated.View>
          </View>
          <View
            pointerEvents="none"
            style={[styles.scrollHint, styles.scrollHintLeft]}>
            <Symbol name="chevron-left" size={10} color={theme.textTertiary} />
          </View>
          <View
            pointerEvents="none"
            style={[styles.scrollHint, styles.scrollHintRight]}>
            <Symbol name="chevron-right" size={10} color={theme.textTertiary} />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    width: '100%',
    alignSelf: 'center',
  },
  capsule: {
    flex: 1,
  },
  capsuleClip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  scrollHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  scrollHintLeft: {
    left: 2,
  },
  scrollHintRight: {
    right: 2,
  },
  carouselTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 0,
  },
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.58,
  },
  indicator: {
    position: 'absolute',
    bottom: 3,
    alignSelf: 'center',
    width: 4,
    height: 4,
    borderRadius: radii.pill,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '400',
    fontVariant: ['tabular-nums'],
  },
});
