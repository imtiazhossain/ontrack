import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useTheme } from '@/hooks/use-theme';

/**
 * Photo-backed frost — hero plate aligned to the scoop so the edge reads as
 * continuous glass over the destination image.
 *
 * Live BlurView alone samples paper below the hero; on physical iOS it also
 * often fails to frost a sibling underlay (simulators look fine). Trip-card
 * scoops therefore use a pre-blurred hero plate on both platforms.
 */
export type TravelHomeGlassFrost = {
  /** Remote URI, bundled require(), or expo-image source. */
  source: ImageSource | number | string;
  /** Full destination hero height (includes overlap band). */
  heroHeight: number;
  /** How far the glass scoops up into the hero (`bodyOverlap`). */
  overlap: number;
};

type TravelHomeGlassProps = ViewProps & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override blur strength (iOS frosted / Android frost plate). */
  intensity?: number;
  /**
   * Flip light/dark frost (e.g. dark glass CTA on a light meta panel).
   * Does not change the app theme — only this plate’s tint.
   */
  inverted?: boolean;
  /**
   * Clear cool-tinted glass for flat sky washes (itinerary).
   * Skips BlurView — expo-blur’s light material reads as solid milk on paper.
   */
  clear?: boolean;
  /**
   * Frosted glass over a photo (trip-card scoop). Pre-blurred hero underlay
   * + milk-out tint on iOS and Android (device-reliable).
   */
  frost?: TravelHomeGlassFrost;
};

/**
 * Shared glass plate for Travel chrome.
 *
 * - `frost`: hero-aligned pre-blur plate + milk-out (trip-card scoop, both OS).
 * - Default (iOS): frosted BlurView (home / atmosphere-backed surfaces).
 * - Default (Android) without frost: translucent material wash.
 * - `clear`: translucent cool tint + sheen (itinerary on flat wash).
 *
 * Blur is a sibling underlay (no React children inside BlurView). Nesting
 * remounting chrome inside BlurView — or conditionally mounting/unmounting
 * direct siblings of BlurView — triggers Fabric
 * `unmountChildComponentView` SIGABRTs on iOS. Keep sibling slots mounted;
 * hide with opacity/height instead.
 */
export function TravelHomeGlass({
  children,
  style,
  intensity,
  inverted = false,
  clear = false,
  frost,
  ...rest
}: TravelHomeGlassProps) {
  const theme = useTheme();
  const { allowsBlur } = usePerformanceTier();
  const darkPlate = inverted
    ? theme.name !== 'dark'
    : theme.name === 'dark';

  if (clear) {
    return (
      <View
        {...rest}
        style={[
          styles.glass,
          darkPlate ? styles.clearDark : styles.clearLight,
          style,
        ]}>
        {children}
      </View>
    );
  }

  if (frost) {
    // Pre-blur the hero on both OS — BlurView-over-sibling underlay looks
    // correct in Simulator but often milks solid on physical iPhones.
    // Android Glide BlurTransformation caps at 25.
    const imageBlurRadius = allowsBlur
      ? Platform.OS === 'android'
        ? 25
        : 18
      : 0;

    return (
      <View
        {...rest}
        collapsable={false}
        style={[
          styles.glass,
          {
            borderColor: darkPlate
              ? 'rgba(255,255,255,0.18)'
              : 'rgba(255,255,255,0.55)',
            backgroundColor: 'transparent',
          },
          style,
        ]}>
        {/*
          Always paint the hero plate (even when blur is gated) so the scoop
          keeps destination color wash on reduced/minimal tiers + Reduce Motion.
        */}
        <Image
          pointerEvents="none"
          source={
            typeof frost.source === 'string'
              ? { uri: frost.source }
              : frost.source
          }
          blurRadius={imageBlurRadius}
          contentFit="cover"
          // Match remote trip heroes (center). Misaligned crop seams the scoop.
          contentPosition={{ top: '50%', left: '50%' }}
          accessible={false}
          importantForAccessibility="no"
          recyclingKey={`travel-glass-frost-${imageBlurRadius}`}
          // Pin to the same frame as the destination hero so the scoop edge
          // is continuous (no +offset shift — that desynced the city plate).
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: frost.overlap - frost.heroHeight,
              height: frost.heroHeight,
              zIndex: 0,
            },
            Platform.OS === 'android' && allowsBlur
              ? ({ filter: 'blur(16px)' } as object)
              : null,
          ]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={
            darkPlate
              ? [
                  'rgba(12, 16, 24, 0.28)',
                  'rgba(12, 16, 24, 0.58)',
                  'rgba(12, 16, 24, 0.92)',
                  'rgba(12, 16, 24, 1)',
                ]
              : [
                  'rgba(255, 255, 255, 0.22)',
                  'rgba(255, 255, 255, 0.58)',
                  'rgba(255, 255, 255, 0.92)',
                  '#FFFFFF',
                ]
          }
          locations={[0, 0.32, 0.62, 0.85]}
          style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
        />
        {/*
          Children stay direct flex kids of this plate so callers’ row/gap/
          padding styles keep working (section search + count badge, etc.).
          Frost underlays are absolute; chrome paints above.
        */}
        {children}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View
        {...rest}
        collapsable={false}
        style={[
          styles.glass,
          {
            borderColor: darkPlate
              ? 'rgba(255,255,255,0.18)'
              : 'rgba(255,255,255,0.7)',
            backgroundColor: 'transparent',
          },
          style,
        ]}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 0 },
            darkPlate ? styles.androidTintDark : styles.androidTintLight,
          ]}
        />
        {children}
      </View>
    );
  }

  return (
    <View
      {...rest}
      collapsable={false}
      style={[
        styles.glass,
        {
          borderColor: darkPlate
            ? 'rgba(255,255,255,0.16)'
            : 'rgba(255,255,255,0.65)',
          backgroundColor: darkPlate
            ? allowsBlur
              ? 'rgba(0, 0, 0, 0.32)'
              : 'rgba(0, 0, 0, 0.55)'
            : allowsBlur
              ? 'rgba(255, 255, 255, 0.32)'
              : 'rgba(255, 255, 255, 0.78)',
        },
        style,
      ]}>
      {/*
        Always mount BlurView (intensity 0 when blur is gated). Conditionally
        mounting/unmounting this Fabric sibling next to `children` SIGABRTs on
        iOS (`unmountChildComponentView` / AppContextLost during create).
      */}
      <BlurView
        intensity={
          allowsBlur ? (intensity ?? (darkPlate ? 40 : 52)) : 0
        }
        tint={darkPlate ? 'dark' : 'light'}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  /** Non-photo chrome (chips / inverted CTA). */
  androidTintLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 45%, rgba(255,255,255,0.62) 100%)',
  },
  /**
   * Inverted CTA (View Itinerary). Match iOS medium grey
   * (`rgba(0,0,0,0.32)` + dark blur ≈ #A9A9A9) — prior 0.68 read black.
   */
  androidTintDark: {
    backgroundColor: 'rgba(12, 16, 24, 0.32)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(36,42,54,0.38) 0%, rgba(12,16,24,0.28) 50%, rgba(8,12,18,0.36) 100%)',
  },
  clearLight: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(36, 116, 168, 0.10)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 36%, rgba(36,116,168,0.14) 100%)',
  },
  clearDark: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.01) 100%)',
  },
});
