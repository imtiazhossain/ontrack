import type { ComponentProps } from 'react';
import { Tabs, type Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Symbol } from '@/components/primitives';
import { borders, layout, radii, spacing, typography } from '@/design-system';
import type { AppIconName } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { useTodos } from '@/store/todos';
import { useUI } from '@/store/ui';

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

const VISIBLE_ITEM_COUNT = 5;
const TRACK_REPEAT_COUNT = 5;
const MAX_CAROUSEL_WIDTH = 720;
const VELOCITY_PROJECTION_SECONDS = 0.2;
const MAX_FLING_ITEMS = 5;
const RESTORE_BUTTON_SIZE = 50;
const COLLAPSE_DRAG_DISTANCE = 72;
const COLLAPSE_THRESHOLD = 30;
const COLLAPSE_VELOCITY_THRESHOLD = 420;

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
const COLLAPSE_SPRING = {
  damping: 20,
  stiffness: 240,
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
    label: 'Vision Board',
    icon: 'vision-board',
    href: '/(tabs)/vision-board',
  },
};

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: FloatingTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
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
        return route.name in TAB_META;
      }),
    [enabledAddons, state.routes],
  );
  const selectedRoute = state.routes[state.index];
  const selectedVisibleIndex = visibleRoutes.findIndex(
    (route) => route.key === selectedRoute?.key,
  );
  const carouselWidth = Math.min(
    width - layout.screenPadding * 2,
    MAX_CAROUSEL_WIDTH,
  );
  const itemWidth = carouselWidth / VISIBLE_ITEM_COUNT;
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
  const collapseProgress = useSharedValue(0);
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

  const setSwipeClaimed = (claimed: boolean) => {
    useUI.getState().setCarouselSwipeClaimed(claimed);
  };
  const releaseSwipeClaim = () => {
    setTimeout(() => setSwipeClaimed(false), 80);
  };
  const finishCollapse = () => {
    setCollapsed(true);
    setSwipeClaimed(false);
  };
  const expandMenu = () => {
    setSwipeClaimed(true);
    setCollapsed(false);
    collapseProgress.value = withSpring(
      0,
      COLLAPSE_SPRING,
      (finished) => {
        if (finished) scheduleOnRN(releaseSwipeClaim);
      },
    );
  };
  const commitBrowse = (routeName: string) => {
    setCarouselBrowse({
      anchorRouteName: selectedRoute.name,
      centerRouteName: routeName,
    });
  };
  const finishSelection = (routeName: string) => {
    const ui = useUI.getState();
    if (ui.carouselPendingRouteName !== routeName) return;

    const route = visibleRoutes.find((item) => item.name === routeName);
    if (route && route.name !== selectedRoute.name) {
      router.navigate(TAB_META[route.name].href);
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
          if (!finished) return;
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
  const collapseGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-24, 24])
    .onStart(() => {
      scheduleOnRN(setSwipeClaimed, true);
    })
    .onUpdate((event) => {
      collapseProgress.value = Math.max(
        0,
        Math.min(0.88, event.translationY / COLLAPSE_DRAG_DISTANCE),
      );
    })
    .onEnd((event) => {
      const shouldCollapse =
        event.translationY >= COLLAPSE_THRESHOLD ||
        event.velocityY >= COLLAPSE_VELOCITY_THRESHOLD;
      collapseProgress.value = withSpring(
        shouldCollapse ? 1 : 0,
        {
          ...COLLAPSE_SPRING,
          velocity: event.velocityY / COLLAPSE_DRAG_DISTANCE,
        },
        (finished) => {
          if (!finished) return;
          if (shouldCollapse) {
            scheduleOnRN(finishCollapse);
          } else {
            scheduleOnRN(releaseSwipeClaim);
          }
        },
      );
    });
  const carouselGesture = Gesture.Race(panGesture, collapseGesture);
  const trackStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: baseTranslateX + positionItems.value * itemWidth,
      },
    ],
  }));
  const capsuleAnimationStyle = useAnimatedStyle(() => {
    const progress = collapseProgress.value;
    return {
      opacity: 1 - progress,
      transform: [
        { translateY: progress * 28 },
        { scaleX: 1 - progress * 0.78 },
        { scaleY: 1 - progress * 0.42 },
      ],
    };
  });

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

  return (
    <View
      onLayout={(event) =>
        setTabBarHeight(event.nativeEvent.layout.height)
      }
      pointerEvents="box-none"
      style={[
        styles.dock,
        {
          height: collapsed
            ? RESTORE_BUTTON_SIZE + insets.bottom + spacing.md
            : layout.floatingTabBarBaseHeight + insets.bottom,
          maxWidth: MAX_CAROUSEL_WIDTH + layout.screenPadding * 2,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: 'transparent',
        },
      ]}>
      {collapsed ? (
        <Animated.View
          entering={FadeInDown.duration(160)}
          style={[
            styles.restoreButtonPosition,
            { bottom: Math.max(insets.bottom, spacing.sm) },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show navigation menu"
            hitSlop={8}
            onPress={expandMenu}
            style={({ pressed }) => [
              styles.restoreButton,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor:
                  theme.name === 'dark'
                    ? theme.separator
                    : theme.backgroundSunken,
                boxShadow:
                  theme.name === 'dark'
                    ? '0 6px 20px rgba(0, 0, 0, 0.32)'
                    : '0 5px 18px rgba(54, 43, 33, 0.15)',
                opacity: pressed ? 0.68 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Symbol
              name="chevron-up"
              size={22}
              color={theme.accentPrimary}
            />
          </Pressable>
        </Animated.View>
      ) : (
        <GestureDetector gesture={carouselGesture}>
          <Animated.View
            style={[
              styles.capsule,
              capsuleAnimationStyle,
              {
                backgroundColor: theme.backgroundElevated,
                borderColor:
                  theme.name === 'dark'
                    ? theme.separator
                    : theme.backgroundSunken,
                boxShadow:
                  theme.name === 'dark'
                    ? '0 8px 28px rgba(0, 0, 0, 0.30)'
                    : '0 5px 22px rgba(54, 43, 33, 0.11)',
              },
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

          const onPress = () => {
            if (useUI.getState().carouselSwipeClaimed) return;
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
              const targetItems = centerSlot - slotIndex;
              positionItems.value = withSpring(
                targetItems,
                SELECTION_SPRING,
                (finished) => {
                  if (finished) scheduleOnRN(finishSelection, route.name);
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
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                descriptors[route.key].options.tabBarAccessibilityLabel ?? meta.label
              }
              hitSlop={{ top: 4, bottom: 4 }}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tab,
                { width: itemWidth },
                pressed && styles.pressed,
              ]}>
              <View>
                <Symbol name={meta.icon} size={26} color={color} />
                {badge > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : String(badge)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  {
                    color,
                    fontWeight: visuallySelected ? '600' : '400',
                  },
                ]}>
                {meta.label}
              </Text>
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
      )}
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
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xs,
    width: '100%',
    alignSelf: 'center',
  },
  capsule: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: borders.hairline,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  restoreButtonPosition: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
    alignItems: 'center',
  },
  restoreButton: {
    width: RESTORE_BUTTON_SIZE,
    height: RESTORE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    borderWidth: borders.hairline,
  },
  carouselTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: '100%',
  },
  tab: {
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    paddingTop: spacing.xs,
  },
  pressed: {
    opacity: 0.58,
  },
  label: {
    ...typography.caption,
    fontSize: 10.5,
    lineHeight: 14,
    maxWidth: '100%',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  badge: {
    position: 'absolute',
    top: -9,
    right: -17,
    minWidth: 24,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
