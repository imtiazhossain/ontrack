import { BlurView } from 'expo-blur';
import { Tabs, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import {
  AppText,
  Symbol,
  usePageSurfaceBackgroundColor,
} from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { radii } from '@/design-system';
import { palette } from '@/design-system/colors';
import { useHomeWeather } from '@/features/daily-tracking/use-home-weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { useTabRecency } from '@/store/tab-recency';
import { useTodos } from '@/store/todos';
import { useUI } from '@/store/ui';
import {
  AgentTestId,
  AgentUiIds,
  isAgentUiEnabled,
  registerAgentUiTarget,
  tabTestIdForRoute,
  unregisterAgentUiTarget,
} from '@/utils/agent-ui';

import {
  canonicalPositionForRoute,
  rebasePosition,
  routeIndexForPosition,
  shortestTargetPosition,
} from './bottom-nav-bar-motion';
import { orderRoutesByRecency } from './tab-recency';

type BottomNavBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

/** Middle carousel tabs; outer rail slots are fixed prev/next arrows. */
const VISIBLE_TAB_COUNT = 3;
const RAIL_SLOT_COUNT = VISIBLE_TAB_COUNT + 2;
const TRACK_REPEAT_COUNT = 5;
const MAX_CAROUSEL_WIDTH = 720;
const VELOCITY_PROJECTION_SECONDS = 0.2;
const MAX_FLING_ITEMS = 5;
/** Soft settle after a finger pan only — taps jump instantly. */
const SNAP_SPRING = {
  damping: 22,
  stiffness: 230,
  mass: 0.78,
} as const;

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
    // Short chrome label so equal rail slots keep even visual gutters.
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

export function BottomNavBar({
  state,
  descriptors,
  navigation,
}: BottomNavBarProps) {
  'use no memo';
  const theme = useTheme();
  const pageSurface = usePageSurfaceBackgroundColor();
  const barBackground = pageSurface ?? theme.backgroundPrimary;
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
  const lastFocusedAt = useTabRecency((store) => store.lastFocusedAt);
  const recordTabFocus = useTabRecency((store) => store.recordTabFocus);
  const openTaskCount = useTodos(
    (store) => store.tasks.filter((task) => !task.completed).length,
  );
  const visibleRoutes = useMemo(() => {
    const enabled = state.routes.filter((route) => {
      if (route.name === 'workouts') return enabledAddons.fitness;
      if (route.name === 'plants') return enabledAddons.plants;
      if (route.name === 'travel') return enabledAddons.travel;
      if (route.name === 'vision-board') return enabledAddons['vision-board'];
      if (route.name === 'games') return enabledAddons.games;
      if (route.name === 'vehicles') return enabledAddons.vehicles;
      if (route.name === 'health') {
        return process.env.EXPO_OS === 'ios' && enabledAddons.health;
      }
      return route.name in TAB_META;
    });
    return orderRoutesByRecency(enabled, lastFocusedAt);
  }, [enabledAddons, lastFocusedAt, state.routes]);

  useEffect(() => {
    // Locked-open nav + clear any stuck swipe/collapse flags from older builds
    // or interrupted springs (stuck claim blocks every tab press).
    useUI.setState({
      tabBarCollapsed: false,
      carouselSwipeClaimed: false,
      carouselPendingRouteName: null,
    });
  }, []);

  const focusedRouteName = state.routes[state.index]?.name;
  // Wait until optimistic tab selection settles, then record on the next frame
  // so highlight handoff (pending → focused) isn’t fighting a ring reshuffle.
  useEffect(() => {
    if (pendingRouteName) return;
    if (!focusedRouteName || !(focusedRouteName in TAB_META)) return;
    const routeName = focusedRouteName;
    const frame = requestAnimationFrame(() => {
      if (useUI.getState().carouselPendingRouteName) return;
      recordTabFocus(routeName);
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedRouteName, pendingRouteName, recordTabFocus]);

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
    (carouselWidth - capsuleInset * 2) / RAIL_SLOT_COUNT;
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
  // Bumps on every selection/nudge/pan snap so interrupted springs never clear
  // a newer in-flight move (that race caused multi-item “fast scroll” glitches).
  const motionEpoch = useSharedValue(0);
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
  const routeCount = visibleRoutes.length;
  const baseTranslateX =
    (Math.floor(VISIBLE_TAB_COUNT / 2) - centerSlot) * itemWidth;

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
  // Clear optimistic selection only after navigation has focused the tab.
  // Layout so pending→focused highlight handoff doesn’t paint a stale accent.
  useLayoutEffect(() => {
    if (!pendingRouteName) return;
    if (selectedRoute?.name !== pendingRouteName) return;
    if (routeCount <= 0) return;
    const routeIndex = visibleRoutes.findIndex(
      (item) => item.name === pendingRouteName,
    );
    const index = routeIndex < 0 ? selectedIndex : routeIndex;
    positionItems.value = rebasePosition(
      positionItems.value,
      index,
      routeCount,
    );
    useUI.setState({
      carouselBrowse: null,
      carouselPendingRouteName: null,
      carouselSwipeClaimed: false,
    });
  }, [
    pendingRouteName,
    positionItems,
    routeCount,
    selectedIndex,
    selectedRoute?.name,
    visibleRoutes,
  ]);
  const finishBrowseAtPosition = (targetItems: number, epoch: number) => {
    if (motionEpoch.value !== epoch) return;
    if (routeCount <= 0) return;
    const routeIndex = routeIndexForPosition(targetItems, routeCount);
    positionItems.value = rebasePosition(
      targetItems,
      routeIndex,
      routeCount,
    );
    commitBrowse(routeNames[routeIndex]);
  };
  const nudgeCarousel = (direction: -1 | 1) => {
    const epoch = motionEpoch.value + 1;
    motionEpoch.value = epoch;
    const targetItems = Math.round(positionItems.value) + direction;
    positionItems.value = targetItems;
    finishBrowseAtPosition(targetItems, epoch);
  };

  // Fail quickly on taps so tab Pressables aren’t held in “possible” by the pan.
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .maxPointers(1)
    .onStart(() => {
      motionEpoch.value += 1;
      gestureStartItems.value = positionItems.value;
      scheduleOnRN(setSwipeClaimed, true);
    })
    .onUpdate((event) => {
      if (Math.abs(event.translationX) >= 12) {
        scheduleOnRN(markPanMoved);
      }
      positionItems.value =
        gestureStartItems.value + event.translationX / itemWidth;
    })
    .onEnd((event) => {
      const epoch = motionEpoch.value + 1;
      motionEpoch.value = epoch;
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
          if (!finished || motionEpoch.value !== epoch) return;
          scheduleOnRN(finishBrowseAtPosition, targetItems, epoch);
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

  const routeOrderKey = routeNames.join('|');
  const prevRouteOrderKeyRef = useRef(routeOrderKey);
  // Recency reorder changes which route sits at `selectedIndex`. Sync the
  // shared carousel offset during render so Reanimated doesn’t paint one frame
  // of the old index (accent appearing to jump old↔new).
  if (
    prevRouteOrderKeyRef.current !== routeOrderKey &&
    !pendingRouteName &&
    routeCount > 0
  ) {
    prevRouteOrderKeyRef.current = routeOrderKey;
    motionEpoch.value += 1;
    positionItems.value = rebasePosition(
      positionItems.value,
      selectedIndex,
      routeCount,
    );
  } else if (prevRouteOrderKeyRef.current !== routeOrderKey) {
    prevRouteOrderKeyRef.current = routeOrderKey;
  }

  useLayoutEffect(() => {
    if (pendingRouteName) return;
    if (carouselBrowse?.anchorRouteName === selectedRoute.name) return;
    if (routeCount <= 0) return;
    const current = positionItems.value;
    const target = shortestTargetPosition(
      current,
      selectedIndex,
      routeCount,
    );
    if (Math.round(current) === Math.round(target)) {
      positionItems.value = rebasePosition(current, selectedIndex, routeCount);
      return;
    }
    motionEpoch.value += 1;
    positionItems.value = rebasePosition(target, selectedIndex, routeCount);
  }, [
    carouselBrowse,
    pendingRouteName,
    positionItems,
    motionEpoch,
    selectedIndex,
    selectedRoute.name,
    routeCount,
    routeOrderKey,
  ]);

  // Pinned bar, always expanded. Dock width must match carouselWidth math
  // (screen padding + max width) so the infinite track clips and swipes correctly.
  const bottomLabelPad = insets.bottom > 0 ? 6 : spacing.sm;
  // Same column as tabs (icon row + caption + indicator). Disc can be larger
  // than the 24pt icon slot — centers still share the icon baseline.
  const arrowButtonSize = Math.max(28, s(30));
  const arrowIconSize = Math.max(16, s(17));
  const tabCaptionLineHeight = s(11);
  const dark = theme.name === 'dark';
  // Frosted discs — match bar glass (BlurView underlay; never nest remounting chrome).
  const arrowIconColor = dark ? theme.textSecondary : palette.ink1;

  const renderRailArrow = (
    direction: 'prev' | 'next',
  ) => {
    const isPrev = direction === 'prev';
    return (
      <AgentTestId
        testID={
          isPrev
            ? AgentUiIds.tabs.carouselPrev
            : AgentUiIds.tabs.carouselNext
        }
        label={isPrev ? 'Previous tabs' : 'Next tabs'}
        onPress={() => nudgeCarousel(isPrev ? 1 : -1)}
        style={[styles.railArrow, { width: itemWidth }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPrev ? 'Previous tabs' : 'Next tabs'}
          hitSlop={4}
          onPress={() => nudgeCarousel(isPrev ? 1 : -1)}
          style={({ pressed }) => [
            // Same column rhythm as tabs: icon row + caption stand-in + indicator.
            styles.tab,
            {
              width: itemWidth,
              minHeight: layout.minTapTarget,
              paddingVertical: spacing.xxs,
              paddingHorizontal: s(2),
              height: '100%',
            },
            pressed && styles.railArrowPressed,
          ]}>
          <View
            style={[
              styles.railArrowGlyph,
              {
                // Same role as styles.iconSlot — size may differ; centers still
                // share the tab icon baseline when paired with the caption stand-in.
                width: arrowButtonSize,
                height: arrowButtonSize,
                borderRadius: arrowButtonSize / 2,
                // Neutral glass — avoid cool navy tints that seam on warm pages.
                backgroundColor: dark
                  ? 'rgba(0, 0, 0, 0.28)'
                  : 'rgba(255, 255, 255, 0.36)',
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: dark
                  ? 'rgba(255,255,255,0.16)'
                  : 'rgba(255,255,255,0.65)',
                overflow: 'hidden',
              },
            ]}>
            <BlurView
              intensity={dark ? 40 : 52}
              tint={dark ? 'dark' : 'light'}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <Symbol
              name={isPrev ? 'chevron-left' : 'chevron-right'}
              size={arrowIconSize}
              color={arrowIconColor}
            />
          </View>
          <View style={{ height: tabCaptionLineHeight, width: '100%' }} />
          <View
            style={[styles.indicator, { backgroundColor: 'transparent' }]}
          />
        </Pressable>
      </AgentTestId>
    );
  };

  // Bar paints the focused page fill so the rail reads as continuous
  // surface — not a cooler frosted plate. Blur stays on rail arrows only
  // (never nest remounting chrome inside BlurView — Fabric crash).
  return (
    <AgentTestId testID={AgentUiIds.tabs.dock}>
      <View
        onLayout={(event) =>
          setTabBarHeight(event.nativeEvent.layout.height)
        }
        pointerEvents="box-none"
        style={[
          styles.bar,
          {
            height: layout.bottomNavBarBaseHeight + bottomLabelPad,
            maxWidth: MAX_CAROUSEL_WIDTH + layout.screenPadding * 2,
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.xxs,
            paddingBottom: bottomLabelPad,
            backgroundColor: barBackground,
          },
        ]}>
        <View
          style={[
            styles.capsule,
            {
              backgroundColor: 'transparent',
            },
          ]}>
        <View
          style={[
            styles.railEdge,
            {
              left: capsuleInset,
              width: itemWidth,
            },
          ]}>
          {renderRailArrow('prev')}
        </View>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            collapsable={false}
            style={[styles.capsuleClip, { width: itemWidth * VISIBLE_TAB_COUNT }]}>
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

          const selectTab = () => {
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
              const routeIndex = visibleRoutes.findIndex(
                (item) => item.name === route.name,
              );
              // Cancel any in-flight pan spring so it can't overwrite this jump.
              motionEpoch.value += 1;
              // Rail first (shared value), then navigate — feels instant.
              const targetItems = shortestTargetPosition(
                positionItems.value,
                routeIndex < 0 ? selectedIndex : routeIndex,
                routeCount,
              );
              positionItems.value = targetItems;
              useUI.setState({
                carouselPendingRouteName: route.name,
                carouselSwipeClaimed: false,
                carouselBrowse: null,
              });
              // Direct tab jump when switching; href navigate when re-selecting
              // so nested stacks pop to root. Pending selection stays until
              // `selectedRoute` matches (see effect above) so the accent never
              // snaps back to the previous tab for a frame.
              if (focused) {
                router.navigate(TAB_META[route.name].href);
              } else {
                navigation.navigate(route.name, route.params);
              }
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
              onPress={selectTab}
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
          </Animated.View>
        </GestureDetector>
        <View
          style={[
            styles.railEdge,
            {
              right: capsuleInset,
              width: itemWidth,
            },
          ]}>
          {renderRailArrow('next')}
        </View>
      </View>
      </View>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  bar: {
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
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  capsuleClip: {
    overflow: 'hidden',
  },
  // Pin chevrons to equal insets so the 3-tab window stays true-center
  // even if slot widths round unevenly.
  railEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railArrow: {
    minWidth: 0,
    width: '100%',
    height: '100%',
  },
  railArrowGlyph: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  railArrowPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
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
