import { Image } from 'expo-image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import Animated, {
    type SharedValue,
    useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { fetchDestinationHeroUris } from '@/features/travel/destination-cover';
import { travelHomeFixtureHeroSource } from '@/features/travel/fixtures/travel-home';
import {
    travelHomeAtmosphereSource,
} from '@/features/travel/travel-home-background';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { TravelHomeEditIcon } from '@/features/travel/travel-home-icons';
import {
    travelHomeImageHeight,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

type TravelHomeHeroCarouselProps = {
  plan: TravelPlan;
  width: number;
  onEdit: () => void;
  onActiveImageChange?: (
    uri: string | undefined,
    index: number,
    pageCount: number,
  ) => void;
  /** Continuous page position for glass ticks (offsetX / pageWidth). */
  scrollProgress?: SharedValue<number>;
};

/** Horizontal paging hero (1–3 images) with edit control. Page control lives on glass. */
export function TravelHomeHeroCarousel({
  plan,
  width,
  onEdit,
  onActiveImageChange,
  scrollProgress,
}: TravelHomeHeroCarouselProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const { width: windowWidth } = useWindowDimensions();
  const heroWidth = Math.max(1, Math.min(width, windowWidth));
  const height = travelHomeImageHeight(heroWidth);
  /**
   * Bump when cover display pipeline changes (e.g. Wikimedia proxy) so Fast
   * Refresh / warm screens refetch instead of keeping failed remote URIs.
   */
  const destinationKey = `cover-v6:${plan.id}:${plan.destination}:${plan.title}:${plan.coverUri ?? ''}`;
  const fixtureSource =
    __DEV__ ? travelHomeFixtureHeroSource(plan.id) : undefined;
  const fallbackSource = travelHomeAtmosphereSource(theme.name);
  const [uris, setUris] = useState<string[]>([]);
  const [failedUris, setFailedUris] = useState<Record<string, true>>({});
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const destinationLabel = plan.destination.trim() || plan.title;
  const visibleUris = uris.filter((uri) => !failedUris[uri]);
  const pageWidth = heroWidth;

  useEffect(() => {
    let active = true;
    setIndex(0);
    setUris([]);
    setFailedUris({});
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    // Fixture plate is the scenic underlay while remotes load (and if they miss).
    // Still fetch heroes so multi-page glass steppers work on travel-home seeds.
    // Do NOT report pageCount 0 here — that collapsed the glass ticks until swipe
    // whenever a load flicker won the race against the real multi-URI result.
    void fetchDestinationHeroUris(plan).then((next) => {
      if (!active) return;
      setFailedUris({});
      setUris(next);
      setIndex(0);
      if (scrollProgress) scrollProgress.value = 0;
      onActiveImageChange?.(next[0], 0, next.length);
      if (next[1]) {
        void Image.prefetch(next[1]).catch(() => undefined);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- destinationKey covers plan fields
  }, [destinationKey, fixtureSource]);

  useEffect(() => {
    // Empty uris = still loading / cleared for a refetch. Leave the parent's
    // page count alone (trip card resets on plan.id) so ticks don't vanish.
    if (visibleUris.length === 0) return;
    const nextIndex = Math.min(index, visibleUris.length - 1);
    if (nextIndex !== index) setIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * heroWidth, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to failure/uri changes
  }, [failedUris, uris, heroWidth]);

  // Publish page count before paint so glass ticks show without waiting for a swipe.
  useLayoutEffect(() => {
    if (visibleUris.length === 0) return;
    const nextIndex = Math.min(index, visibleUris.length - 1);
    onActiveImageChange?.(
      visibleUris[nextIndex],
      nextIndex,
      visibleUris.length,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mirror pager to parent
  }, [visibleUris.length, index, failedUris, uris]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (!scrollProgress || pageWidth <= 0) return;
      scrollProgress.value = event.contentOffset.x / pageWidth;
    },
  });

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
    const clamped = Math.max(0, Math.min(visibleUris.length - 1, next));
    setIndex(clamped);
    if (scrollProgress) scrollProgress.value = clamped;
    onActiveImageChange?.(
      visibleUris[clamped],
      clamped,
      visibleUris.length,
    );
    const prefetchUri = visibleUris[clamped + 1];
    if (prefetchUri) {
      void Image.prefetch(prefetchUri).catch(() => undefined);
    }
  };

  const editVisual = Math.max(40, s(travelHomeTokens.sizes.editButton));
  const editHit = Math.max(
    Platform.OS === 'android'
      ? travelHomeTokens.sizes.touchTargetMinAndroid
      : travelHomeTokens.sizes.touchTargetMin,
    editVisual,
  );
  const editInset = Math.max(10, s(travelHomeTokens.spacing.editInset));
  const heroSurface =
    theme.name === 'dark'
      ? theme.backgroundSunken
      : travelHomeTokens.colors.brandBlueSoft;

  const heroTopRadius = travelHomeTokens.radius.heroTop;
  const imageRadiusStyle = {
    borderTopLeftRadius: heroTopRadius,
    borderTopRightRadius: heroTopRadius,
  } as const;

  const hasRemoteHeroes = visibleUris.length > 0;
  const scrollInteractive = hasRemoteHeroes && visibleUris.length > 1;
  // Keep ScrollView mounted with stable index-keyed page shells. Slot count
  // tracks visible URIs (min 1 placeholder) so users can't page into blanks.
  const heroPageSlots = Math.max(1, visibleUris.length);

  return (
    <View
      collapsable={false}
      style={[
        styles.hero,
        imageRadiusStyle,
        {
          width: heroWidth,
          height,
          backgroundColor: heroSurface,
        },
      ]}>
      {/*
        Hero Fabric children are ONLY Views (media → edit → dots). expo-image as
        a direct sibling was unmounting out of sync and SIGABRTing
        `unmountChildComponentView` on this 362×199 plate. Images stay nested
        inside the non-collapsible media slot; ScrollView stays mounted.
      */}
      <View
        collapsable={false}
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, imageRadiusStyle, { backgroundColor: heroSurface }]}>
        {/* Scenic plate while remote heroes load / fail. */}
        <Image
          source={fallbackSource}
          style={[
            styles.fallback,
            imageRadiusStyle,
            { width: heroWidth, height },
          ]}
          contentFit="cover"
          contentPosition={{ top: '35%', left: '50%' }}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
        />
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          scrollEnabled={scrollInteractive}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          style={[
            StyleSheet.absoluteFill,
            imageRadiusStyle,
            { opacity: hasRemoteHeroes ? 1 : 0 },
          ]}
          pointerEvents={hasRemoteHeroes ? 'auto' : 'none'}
          accessibilityElementsHidden={!hasRemoteHeroes}
          importantForAccessibility={
            hasRemoteHeroes ? 'yes' : 'no-hide-descendants'
          }
          accessibilityRole="adjustable"
          accessibilityLabel={`${destinationLabel} destination photos`}
          accessibilityValue={{
            min: 1,
            max: Math.max(1, visibleUris.length),
            now: index + 1,
            text:
              visibleUris.length > 0
                ? `Photo ${index + 1} of ${visibleUris.length}`
                : 'Loading destination photos',
          }}>
          {Array.from({ length: heroPageSlots }, (_, pageIndex) => {
            const uri = visibleUris[pageIndex];
            return (
              <View
                key={`hero-page-${pageIndex}`}
                collapsable={false}
                style={{ width: heroWidth, height }}>
                <Image
                  source={uri ? { uri } : fallbackSource}
                  style={[
                    imageRadiusStyle,
                    {
                      width: heroWidth,
                      height,
                      backgroundColor: heroSurface,
                      opacity: uri ? 1 : 0,
                    },
                  ]}
                  contentFit="cover"
                  transition={uri ? 180 : 0}
                  recyclingKey={uri ?? `hero-page-empty-${pageIndex}`}
                  accessible={false}
                  importantForAccessibility="no"
                  onError={() => {
                    if (!uri) return;
                    setFailedUris((previous) =>
                      previous[uri] ? previous : { ...previous, [uri]: true },
                    );
                  }}
                />
              </View>
            );
          })}
        </Animated.ScrollView>
        {/*
          Dev fixture plate is opacity-toggled — never swaps ScrollView out.
        */}
        <Image
          source={fixtureSource ?? fallbackSource}
          style={[
            StyleSheet.absoluteFill,
            imageRadiusStyle,
            {
              width: heroWidth,
              height,
              backgroundColor: heroSurface,
              // Hide once remotes paint — otherwise the fixture plate masks paging.
              opacity: fixtureSource && !hasRemoteHeroes ? 1 : 0,
            },
          ]}
          contentFit="cover"
          transition={180}
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no"
        />
      </View>

      {/*
        Absolute layout lives on this View (not only AgentTestId) so the pencil
        FAB stays pinned in production, where AgentTestId may skip its registry
        wrapper when style is omitted.
      */}
      <View
        collapsable={false}
        pointerEvents="box-none"
        style={[
          styles.editWrap,
          {
            top: editInset,
            right: editInset,
            width: editHit,
            height: editHit,
          },
        ]}>
        <AgentTestId
          testID={AgentUiIds.travel.list.editTrip(plan.id)}
          label={`Edit ${destinationLabel} trip`}
          onPress={() => {
            haptics.tap();
            onEdit();
          }}
          style={styles.editHit}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${destinationLabel} trip`}
            onPress={() => {
              haptics.tap();
              onEdit();
            }}
            hitSlop={4}
            style={({ pressed }) => [
              styles.editButton,
              {
                width: editVisual,
                height: editVisual,
                borderRadius: editVisual / 2,
                opacity: pressed ? 0.72 : 1,
              },
            ]}>
            <TravelHomeGlass
              intensity={theme.name === 'dark' ? 44 : 56}
              style={{
                width: editVisual,
                height: editVisual,
                borderRadius: editVisual / 2,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  theme.name === 'dark'
                    ? undefined
                    : travelHomeTokens.colors.circleFabShadow,
              }}>
              <TravelHomeEditIcon
                size={Math.max(16, s(18))}
                color={
                  theme.name === 'dark'
                    ? theme.textPrimary
                    : travelHomeTokens.colors.ink
                }
              />
            </TravelHomeGlass>
          </Pressable>
        </AgentTestId>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  fallback: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  editWrap: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
