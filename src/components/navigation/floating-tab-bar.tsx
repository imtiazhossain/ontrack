import { Tabs, useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { borders, radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
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
const RESTORE_BUTTON_SIZE = 36;
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
  games: {
    label: 'Games',
    icon: 'games',
    href: '/(tabs)/games',
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { spacing, layout, s, typography } = useResponsive();
  const collapsed = useUI((store) => store.tabBarCollapsed);
  const setTabBarCollapsed = useUI((store) => store.setTabBarCollapsed);
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
    setTabBarCollapsed(true);
    setSwipeClaimed(false);
  };
  const expandMenu = () => {
    setSwipeClaimed(true);
    setTabBarCollapsed(false);
    collapseProgress.value = 0;
    releaseSwipeClaim();
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
      if (shouldCollapse) {
        collapseProgress.value = 1;
        scheduleOnRN(finishCollapse);
      } else {
        collapseProgress.value = 0;
        scheduleOnRN(releaseSwipeClaim);
      }
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
          paddingHorizontal: layout.screenPadding,
          paddingTop: spacing.xs,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          backgroundColor: 'transparent',
        },
      ]}>
      {collapsed ? (
        <View
          style={[
            styles.restoreButtonPosition,
            {
              left: layout.screenPadding,
              right: layout.screenPadding,
              bottom: Math.max(insets.bottom, spacing.sm),
            },
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
              size={16}
              color={theme.accentPrimary}
            />
          </Pressable>
        </View>
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
                // Soft copper glow matching the selected tab accent.
                // Kept on the outer capsule (no overflow clip) so it paints.
                boxShadow:
                  theme.name === 'dark'
                    ? '0 8px 28px rgba(177, 138, 101, 0.32)'
                    : '0 5px 22px rgba(154, 118, 84, 0.22)',
              },
            ]}>
            <View style={styles.capsuleClip}>
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
              // Navigate immediately; menu centering finishes after.
              // Re-selecting a tab also returns a nested stack to its root.
              router.navigate(TAB_META[route.name].href);
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
                {
                  width: itemWidth,
                  minHeight: layout.minTapTarget,
                  gap: 0,
                  paddingVertical: spacing.xxs,
                },
                pressed && styles.pressed,
              ]}>
              <View>
                <Symbol name={meta.icon} size={20} color={color} />
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
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.1}
                style={[
                  typography.caption,
                  {
                    color,
                    fontWeight: visuallySelected ? '600' : '400',
                    fontSize: s(9.5),
                    lineHeight: s(11),
                    maxWidth: '100%',
                    width: '100%',
                    textAlign: 'center',
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
            </View>
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
    width: '100%',
    alignSelf: 'center',
  },
  capsule: {
    flex: 1,
    borderWidth: borders.hairline,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  capsuleClip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  restoreButtonPosition: {
    position: 'absolute',
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
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pressed: {
    opacity: 0.58,
  },
  indicator: {
    position: 'absolute',
    bottom: 3,
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
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
