import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';

import { fetchDestinationHeroUris } from '@/features/travel/destination-cover';
import { travelHomeFixtureHeroSource } from '@/features/travel/fixtures/travel-home';
import {
    TravelHomeDestinationPlaceholder,
    TravelHomeEditIcon,
} from '@/features/travel/travel-home-icons';
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
  onActiveImageChange?: (uri: string | undefined, index: number) => void;
};

/** Horizontal paging hero (1–3 images) with edit control + page dots. */
export function TravelHomeHeroCarousel({
  plan,
  width,
  onEdit,
  onActiveImageChange,
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
  const destinationKey = `cover-v5:${plan.id}:${plan.destination}:${plan.title}:${plan.coverUri ?? ''}`;
  const fixtureSource =
    __DEV__ ? travelHomeFixtureHeroSource(plan.id) : undefined;
  const [uris, setUris] = useState<string[]>([]);
  const [failedUris, setFailedUris] = useState<Record<string, true>>({});
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const destinationLabel = plan.destination.trim() || plan.title;
  const visibleUris = uris.filter((uri) => !failedUris[uri]);

  useEffect(() => {
    let active = true;
    setIndex(0);
    setUris([]);
    setFailedUris({});
    scrollRef.current?.scrollTo({ x: 0, animated: false });
    if (fixtureSource) {
      onActiveImageChange?.(undefined, 0);
      return () => {
        active = false;
      };
    }
    void fetchDestinationHeroUris(plan).then((next) => {
      if (!active) return;
      setFailedUris({});
      setUris(next);
      onActiveImageChange?.(next[0], 0);
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
    if (visibleUris.length === 0) {
      onActiveImageChange?.(undefined, 0);
      return;
    }
    const nextIndex = Math.min(index, visibleUris.length - 1);
    if (nextIndex !== index) setIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * heroWidth, animated: false });
    onActiveImageChange?.(visibleUris[nextIndex], nextIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to failure/uri changes
  }, [failedUris, uris, heroWidth]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / heroWidth);
    const clamped = Math.max(0, Math.min(visibleUris.length - 1, next));
    setIndex(clamped);
    onActiveImageChange?.(visibleUris[clamped], clamped);
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
  const activeDot = Math.max(6, s(travelHomeTokens.sizes.carouselActiveDot));
  const inactiveDot = Math.max(4, s(travelHomeTokens.sizes.carouselInactiveDot));
  const heroSurface =
    theme.name === 'dark'
      ? theme.backgroundSunken
      : travelHomeTokens.colors.brandBlueSoft;

  const heroTopRadius = travelHomeTokens.radius.heroTop;
  const imageRadiusStyle = {
    borderTopLeftRadius: heroTopRadius,
    borderTopRightRadius: heroTopRadius,
  } as const;

  return (
    <View
      style={[
        styles.hero,
        imageRadiusStyle,
        {
          width: heroWidth,
          height,
          backgroundColor: heroSurface,
        },
      ]}>
      {/* Always paint a solid plate so failed remote images never punch through. */}
      <View
        style={[styles.fallback, imageRadiusStyle, { width: heroWidth, height }]}
        pointerEvents="none">
        <TravelHomeDestinationPlaceholder width={heroWidth} height={height} />
      </View>
      {fixtureSource ? (
        <Image
          source={fixtureSource}
          style={[
            StyleSheet.absoluteFill,
            imageRadiusStyle,
            { width: heroWidth, height, backgroundColor: heroSurface },
          ]}
          contentFit="cover"
          transition={180}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : visibleUris.length > 0 ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          scrollEventThrottle={16}
          style={[StyleSheet.absoluteFill, imageRadiusStyle]}
          accessibilityRole="adjustable"
          accessibilityLabel={`${destinationLabel} destination photos`}
          accessibilityValue={{
            min: 1,
            max: Math.max(1, visibleUris.length),
            now: index + 1,
            text: `Photo ${index + 1} of ${visibleUris.length}`,
          }}>
          {visibleUris.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[
                imageRadiusStyle,
                { width: heroWidth, height, backgroundColor: heroSurface },
              ]}
              contentFit="cover"
              transition={180}
              recyclingKey={uri}
              accessible={false}
              importantForAccessibility="no"
              onError={() => {
                setFailedUris((previous) =>
                  previous[uri] ? previous : { ...previous, [uri]: true },
                );
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      <AgentTestId
        testID={AgentUiIds.travel.list.editTrip(plan.id)}
        label={`Edit ${destinationLabel} trip`}
        onPress={() => {
          haptics.tap();
          onEdit();
        }}
        style={[
          styles.editWrap,
          {
            top: editInset,
            right: editInset,
            width: editHit,
            height: editHit,
          },
        ]}>
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
              backgroundColor:
                theme.name === 'dark' ? theme.backgroundElevated : '#FFFFFF',
              borderColor:
                theme.name === 'dark'
                  ? theme.separator
                  : travelHomeTokens.colors.circleFabBorder,
              boxShadow:
                theme.name === 'dark'
                  ? undefined
                  : travelHomeTokens.colors.circleFabShadow,
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <TravelHomeEditIcon
            size={Math.max(16, s(18))}
            color={
              theme.name === 'dark'
                ? theme.textPrimary
                : travelHomeTokens.colors.ink
            }
          />
        </Pressable>
      </AgentTestId>

      {!fixtureSource && visibleUris.length > 1 ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.dots,
            {
              bottom: Math.max(10, s(travelHomeTokens.sizes.carouselBottomInset)),
              gap: travelHomeTokens.sizes.carouselDotGap,
            },
          ]}>
          {visibleUris.map((uri, dotIndex) => {
            const selected = dotIndex === index;
            return (
              <View
                key={uri}
                style={[
                  styles.dot,
                  {
                    width: selected ? activeDot : inactiveDot,
                    height: selected ? activeDot : inactiveDot,
                    backgroundColor: selected
                      ? '#FFFFFF'
                      : 'rgba(255,255,255,0.45)',
                  },
                ]}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  editWrap: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 999,
  },
});
