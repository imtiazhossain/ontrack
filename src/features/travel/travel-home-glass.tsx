import { BlurView } from 'expo-blur';
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

type TravelHomeGlassProps = ViewProps & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override blur strength (iOS frosted). */
  intensity?: number;
  /**
   * Flip light/dark frost (e.g. dark glass CTA on a light meta panel).
   * Does not change the app theme — only this plate’s tint.
   */
  inverted?: boolean;
  /**
   * Solid paper plate for flat sky washes (itinerary chips / cards).
   * Skips BlurView — expo-blur’s light material reads as solid milk on paper.
   * Light mode is opaque white; dark keeps a soft translucent wash.
   */
  clear?: boolean;
  /**
   * With `clear`: cool blue section wash instead of solid white paper
   * (Trip Tools / Transport parent shells). Buttons stay `clear` alone.
   */
  wash?: boolean;
  /**
   * Soft atmosphere frost for circular FABs floating on sky / photos.
   * More see-through than default chip glass so night washes stay visible.
   */
  airy?: boolean;
};

/**
 * Shared glass plate for Travel chrome (search, CTA chips, itinerary).
 *
 * Trip-card hero scoops use `TravelHomeTripFrostScoop` (iOS BlurView softener
 * + shared LinearGradient milk-out) — not this plate. Android duplicate blur
 * plates read as a fog shelf.
 *
 * - Default (iOS): frosted BlurView (atmosphere-backed surfaces).
 * - Default (Android): translucent material wash.
 * - `clear`: solid white paper in light; soft wash in dark.
 * - `clear` + `wash`: cool blue section shell in light (parent cards).
 * - `airy`: lighter frost for circular controls over sky / photos.
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
  wash = false,
  airy = false,
  ...rest
}: TravelHomeGlassProps) {
  const theme = useTheme();
  const { allowsBlur } = usePerformanceTier();
  const darkPlate = inverted
    ? theme.name !== 'dark'
    : theme.name === 'dark';
  /** Inverted CTAs (View Itinerary) need charcoal; theme dark frost stays softer. */
  const invertedDark = inverted && darkPlate;
  if (clear) {
    const lightClear = wash ? styles.clearWashLight : styles.clearLight;
    return (
      <View
        {...rest}
        style={[
          styles.glass,
          darkPlate ? styles.clearDark : lightClear,
          style,
        ]}>
        {children}
      </View>
    );
  }

  if (Platform.OS === 'android') {
    const androidTint = invertedDark
      ? styles.androidTintInverted
      : darkPlate
        ? airy
          ? styles.androidTintDarkAiry
          : styles.androidTintDark
        : airy
          ? styles.androidTintLightAiry
          : styles.androidTintLight;
    return (
      <View
        {...rest}
        collapsable={false}
        style={[
          styles.glass,
          {
            borderColor: darkPlate
              ? 'rgba(255,255,255,0.22)'
              : airy
                ? 'rgba(255,255,255,0.55)'
                : 'rgba(255,255,255,0.7)',
            backgroundColor: 'transparent',
          },
          style,
        ]}>
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { zIndex: 0 }, androidTint]}
        />
        {children}
      </View>
    );
  }

  const darkFill = invertedDark
    ? allowsBlur
      ? 'rgba(0, 0, 0, 0.58)'
      : 'rgba(0, 0, 0, 0.68)'
    : airy
      ? allowsBlur
        ? 'rgba(0, 0, 0, 0.22)'
        : 'rgba(0, 0, 0, 0.4)'
      : allowsBlur
        ? 'rgba(0, 0, 0, 0.32)'
        : 'rgba(0, 0, 0, 0.55)';
  const lightFill = airy
    ? allowsBlur
      ? 'rgba(255, 255, 255, 0.28)'
      : 'rgba(255, 255, 255, 0.58)'
    : allowsBlur
      ? 'rgba(255, 255, 255, 0.32)'
      : 'rgba(255, 255, 255, 0.78)';

  return (
    <View
      {...rest}
      collapsable={false}
      style={[
        styles.glass,
        {
          borderColor: darkPlate
            ? 'rgba(255,255,255,0.2)'
            : airy
              ? 'rgba(255,255,255,0.5)'
              : 'rgba(255,255,255,0.65)',
          backgroundColor: darkPlate ? darkFill : lightFill,
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
          allowsBlur
            ? (intensity ?? (darkPlate ? (airy ? 36 : 40) : airy ? 44 : 52))
            : 0
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
  /** Circular FAB over sky — light frost so ink reads; sky still peeks through. */
  androidTintLightAiry: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.34) 45%, rgba(255,255,255,0.5) 100%)',
  },
  /** Theme dark frost (search / chips) — soft grey glass. */
  androidTintDark: {
    backgroundColor: 'rgba(12, 16, 24, 0.32)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(36,42,54,0.38) 0%, rgba(12,16,24,0.28) 50%, rgba(8,12,18,0.36) 100%)',
  },
  androidTintDarkAiry: {
    backgroundColor: 'rgba(12, 16, 24, 0.22)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(36,42,54,0.28) 0%, rgba(12,16,24,0.16) 50%, rgba(8,12,18,0.24) 100%)',
  },
  /**
   * Inverted CTA (View Itinerary) + count badge on light paper.
   * Charcoal over white ≈ #727479 — 0.32 washed-out; solid 0.68 read black.
   */
  androidTintInverted: {
    backgroundColor: 'rgba(12, 16, 24, 0.58)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(36,42,54,0.64) 0%, rgba(12,16,24,0.54) 50%, rgba(8,12,18,0.62) 100%)',
  },
  clearLight: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(17, 74, 110, 0.10)',
    backgroundColor: '#FFFFFF',
  },
  /** Section parent shell — same cool blue as pre-paper itinerary chrome. */
  clearWashLight: {
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
