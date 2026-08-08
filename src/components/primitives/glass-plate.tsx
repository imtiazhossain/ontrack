import { BlurView } from 'expo-blur';
import {
    Platform,
    StyleSheet,
    View,
    type StyleProp,
    type ViewProps,
    type ViewStyle,
} from 'react-native';

import { glassMaterials } from '@/design-system/glass';
import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useTheme } from '@/hooks/use-theme';

export type GlassPlateProps = ViewProps & {
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
   */
  clear?: boolean;
  /**
   * With `clear`: cool blue section wash instead of solid white paper.
   */
  wash?: boolean;
  /**
   * Soft atmosphere frost for circular FABs floating on sky / photos.
   */
  airy?: boolean;
  /**
   * Tinted glass accent. `green` = frosted sage CTA.
   * Ignored when `clear` is set.
   */
  accent?: 'default' | 'green';
};

/**
 * Shared frosted glass plate for app chrome (sheets, cards, chips, CTAs).
 *
 * - Default (iOS): frosted BlurView (atmosphere-backed surfaces).
 * - Default (Android): translucent material wash.
 * - `clear`: solid white paper in light; soft wash in dark.
 * - `clear` + `wash`: cool blue section shell in light.
 * - `airy`: lighter frost for circular controls over sky / photos.
 *
 * Blur is a sibling underlay (no React children inside BlurView). Always mount
 * BlurView when frosted (intensity 0 when blur gated) to avoid Fabric SIGABRTs.
 */
export function GlassPlate({
  children,
  style,
  intensity,
  inverted = false,
  clear = false,
  wash = false,
  airy = false,
  accent = 'default',
  ...rest
}: GlassPlateProps) {
  const theme = useTheme();
  const { allowsBlur } = usePerformanceTier();
  const g = glassMaterials;
  const darkPlate = inverted
    ? theme.name !== 'dark'
    : theme.name === 'dark';
  const invertedDark = inverted && darkPlate;
  const greenGlass = accent === 'green' && !clear;
  const greenOnLight = greenGlass && theme.name !== 'dark';
  const greenBorder = greenOnLight
    ? g.accentGreen.borderLight
    : g.accentGreen.border;
  const greenFillBlur = greenOnLight
    ? g.accentGreen.fillLight
    : g.accentGreen.fill;
  const greenFillSolid = greenOnLight
    ? g.accentGreen.fillLightFallback
    : g.accentGreen.fillFallback;

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
    const androidTint = greenGlass
      ? greenOnLight
        ? styles.androidTintGreenLight
        : styles.androidTintGreen
      : invertedDark
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
            borderColor: greenGlass
              ? greenBorder
              : darkPlate
                ? g.border.darkStrong
                : airy
                  ? 'rgba(255,255,255,0.55)'
                  : g.border.lightStrong,
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
      ? g.fill.invertedBlur
      : g.fill.invertedSolid
    : airy
      ? allowsBlur
        ? g.fill.darkAiryBlur
        : g.fill.darkAirySolid
      : allowsBlur
        ? g.fill.darkBlur
        : g.fill.darkSolid;
  const lightFill = airy
    ? allowsBlur
      ? g.fill.lightAiryBlur
      : g.fill.lightAirySolid
    : allowsBlur
      ? g.fill.lightBlur
      : g.fill.lightSolid;
  const greenFill = allowsBlur ? greenFillBlur : greenFillSolid;

  return (
    <View
      {...rest}
      collapsable={false}
      style={[
        styles.glass,
        {
          borderColor: greenGlass
            ? greenBorder
            : darkPlate
              ? g.border.dark
              : airy
                ? g.border.lightAiry
                : g.border.light,
          backgroundColor: greenGlass
            ? greenFill
            : darkPlate
              ? darkFill
              : lightFill,
        },
        style,
      ]}>
      <BlurView
        intensity={
          allowsBlur
            ? (intensity ??
              (greenGlass ? 44 : darkPlate ? (airy ? 36 : 40) : airy ? 44 : 52))
            : 0
        }
        tint={greenGlass || darkPlate ? 'dark' : 'light'}
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
  androidTintLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.42) 45%, rgba(255,255,255,0.62) 100%)',
  },
  androidTintLightAiry: {
    backgroundColor: 'rgba(255, 255, 255, 0.48)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.34) 45%, rgba(255,255,255,0.5) 100%)',
  },
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
  androidTintInverted: {
    backgroundColor: 'rgba(12, 16, 24, 0.58)',
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(36,42,54,0.64) 0%, rgba(12,16,24,0.54) 50%, rgba(8,12,18,0.62) 100%)',
  },
  androidTintGreen: {
    backgroundColor: glassMaterials.accentGreen.fill,
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(160,210,170,0.28) 0%, rgba(78,122,84,0.42) 48%, rgba(56,96,62,0.55) 100%)',
  },
  androidTintGreenLight: {
    backgroundColor: glassMaterials.accentGreen.fillLight,
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(160,210,170,0.36) 0%, rgba(78,122,84,0.68) 48%, rgba(56,96,62,0.78) 100%)',
  },
  clearLight: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glassMaterials.clear.lightBorder,
    backgroundColor: glassMaterials.clear.lightBg,
  },
  clearWashLight: {
    borderWidth: 1,
    borderColor: glassMaterials.clear.washLightBorder,
    backgroundColor: glassMaterials.clear.washLightBg,
    experimental_backgroundImage:
      'linear-gradient(160deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 36%, rgba(36,116,168,0.14) 100%)',
  },
  clearDark: {
    borderWidth: 1,
    borderColor: glassMaterials.clear.darkBorder,
    backgroundColor: glassMaterials.clear.darkBg,
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.01) 100%)',
  },
});
