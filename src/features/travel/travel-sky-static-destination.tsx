import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { TravelTimeOfDay } from '@/features/travel/travel-atmosphere-model';
import { resolveTravelHomeAtmosphereImage } from '@/features/travel/travel-home-atmosphere-resolve';
import type { HeaderSkyLook } from '@/features/travel/travel-sky-condition';
import { TravelSkyGround } from '@/features/travel/travel-sky-ground';
import { resolveTravelSkyGroundKind } from '@/features/travel/travel-sky-ground-kind';
import { TravelSkyStaticWash } from '@/features/travel/travel-sky-static-wash';
import { useTiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';

/** Slow Ken Burns — presence without the live SVG sky budget. */
const KEN_BURNS_MS = 24_000;

type TravelSkyStaticDestinationProps = {
  destination?: string;
  latitude?: number;
  timeOfDay?: TravelTimeOfDay;
  weatherCode?: number;
  chrome: string;
  look: HeaderSkyLook;
  night: boolean;
  fadeTo: string;
  /** Plate average for header ink once the still resolves. */
  onAverageColor?: (hex: string | undefined) => void;
};

/**
 * Static-tier itinerary sky — destination landscape still (sky + ground)
 * with a gentle Ken Burns drift. Fills the status-bar chrome and dissolves
 * into page paper at the horizon. Gradient wash holds the seat until the
 * photo arrives (and remains the last-resort underlay).
 */
export function TravelSkyStaticDestination({
  destination = '',
  latitude,
  timeOfDay = 'day',
  weatherCode,
  chrome,
  look,
  night,
  fadeTo,
  onAverageColor,
}: TravelSkyStaticDestinationProps) {
  const reduceMotion = useReducedMotion();
  const idleMotion = useTiltSkyMotion(false);
  const groundKind = resolveTravelSkyGroundKind(destination, latitude);
  const [source, setSource] = useState<ImageSource | undefined>();
  const hasPhoto = Boolean(source);
  const progress = useSharedValue(0);
  const onAverageColorRef = useRef(onAverageColor);
  onAverageColorRef.current = onAverageColor;

  useEffect(() => {
    let active = true;
    const place = destination.trim();
    void resolveTravelHomeAtmosphereImage({
      mode: place ? 'trip' : 'home',
      destination: place || undefined,
      destinations: place ? [place] : [],
      timeOfDay,
      weatherCode,
      salt: Date.now(),
    }).then((image) => {
      if (!active) return;
      setSource(image.source);
      onAverageColorRef.current?.(image.averageColor);
    });
    return () => {
      active = false;
      onAverageColorRef.current?.(undefined);
    };
  }, [destination, timeOfDay, weatherCode]);

  useEffect(() => {
    if (reduceMotion || !hasPhoto) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: KEN_BURNS_MS,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: KEN_BURNS_MS,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
  }, [hasPhoto, progress, reduceMotion]);

  const kenBurnsStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ scale: 1.1 }] };
    }
    return {
      transform: [
        { scale: interpolate(progress.value, [0, 1], [1.08, 1.16]) },
        { translateX: interpolate(progress.value, [0, 1], [-10, 12]) },
        { translateY: interpolate(progress.value, [0, 1], [-6, 8]) },
      ],
    };
  });

  return (
    <View style={styles.fill} pointerEvents="none">
      <TravelSkyStaticWash
        chrome={chrome}
        look={look}
        night={night}
        fadeTo={fadeTo}
      />

      {hasPhoto ? (
        <Animated.View style={[styles.fill, kenBurnsStyle]}>
          <Image
            pointerEvents="none"
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            // Bias sky into the status-bar band; ground holds the lower third.
            contentPosition={{ top: '18%', left: '50%' }}
            transition={280}
            recyclingKey={
              typeof source === 'object' && source && 'uri' in source
                ? String(source.uri ?? 'curated')
                : 'curated'
            }
          />
        </Animated.View>
      ) : (
        // No photo yet / offline miss before curated — keep a ground silhouette
        // so the plate still reads as sky + place, not a flat wash.
        <TravelSkyGround kind={groundKind} night={night} motion={idleMotion} />
      )}

      {/* Soft status-bar continuity — clock sits on sky, not a hard photo edge. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          night
            ? ['rgba(8,14,28,0.55)', 'rgba(8,14,28,0.18)', 'transparent']
            : [`${chrome}CC`, `${chrome}55`, 'transparent']
        }
        locations={[0, 0.35, 1]}
        style={styles.topVeil}
      />

      {/* Horizon dissolve — ground foot eases into theme paper. */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', 'transparent', fadeTo]}
        locations={[0.52, 0.78, 1]}
        style={styles.bottomFade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
  topVeil: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '32%',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
});
