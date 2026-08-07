import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
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
 * Android photo-backed frost — blurred hero plate aligned to the scoop so the
 * edge reads like iOS UIVisualEffect (expo-blur’s default Android path is
 * clear plastic).
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
   * Android: frosted glass over a photo. Blurred hero underlay + light tint
   * (not opaque milk, not clear plastic).
   */
  frost?: TravelHomeGlassFrost;
};

/**
 * Shared glass plate for Travel chrome.
 *
 * - Default (iOS): frosted BlurView (home / photo-backed surfaces).
 * - Default (Android) + `frost`: blurred hero plate + translucent tint.
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

  if (Platform.OS === 'android') {
    // Glide BlurTransformation caps at 25 — use the max for strongest frost.
    // Skip photo blur on constrained tiers (tint-only wash).
    const imageBlurRadius = allowsBlur ? 25 : 0;

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
            // Keep the plate transparent so the frosted hero shows through.
            backgroundColor: 'transparent',
          },
          style,
        ]}>
        {frost && allowsBlur ? (
          <Image
            pointerEvents="none"
            source={
              typeof frost.source === 'string'
                ? { uri: frost.source }
                : frost.source
            }
            blurRadius={imageBlurRadius}
            contentFit="cover"
            contentPosition={{ top: '48%', left: '50%' }}
            accessible={false}
            importantForAccessibility="no"
            recyclingKey={`travel-glass-frost-${imageBlurRadius}`}
            // Align to the hero behind the scoop, then bleed a bit into the
            // meta body so the frosted edge reads taller than the 22pt overlap.
            // `filter` strengthens frost on Android new-arch; typings lag.
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: frost.overlap + 40 - frost.heroHeight,
              height: frost.heroHeight,
              zIndex: 0,
              filter: 'blur(16px)',
            } as object}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { zIndex: 0 },
            darkPlate
              ? frost
                ? styles.androidTintDarkFrosted
                : styles.androidTintDark
              : frost
                ? styles.androidTintLightFrosted
                : styles.androidTintLight,
          ]}
        />
        {/*
          Children stay direct flex kids of this plate so callers’ row/gap/
          padding styles keep working (section search + count badge, etc.).
          Frost underlays are absolute + zIndex 0; chrome paints above.
        */}
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
      {allowsBlur ? (
        <BlurView
          intensity={intensity ?? (darkPlate ? 40 : 52)}
          tint={darkPlate ? 'dark' : 'light'}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  /**
   * Photo-backed scoop — light material so blur reads through, milking out
   * toward the title block (same idea as iOS light blur over a hero).
   */
  androidTintLightFrosted: {
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.42) 28%, rgba(255,255,255,0.78) 62%, rgba(255,255,255,0.94) 100%)',
  },
  androidTintDarkFrosted: {
    backgroundColor: 'rgba(8, 12, 20, 0.4)',
    experimental_backgroundImage:
      'linear-gradient(180deg, rgba(12,16,24,0.32) 0%, rgba(12,16,24,0.48) 30%, rgba(12,16,24,0.78) 65%, rgba(12,16,24,0.94) 100%)',
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
