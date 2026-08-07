import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useTheme } from '@/hooks/use-theme';

type TravelHomeTripFrostScoopProps = ViewProps & {
  children?: React.ReactNode;
  /** Title band height (`bodyOverlap`). */
  height: number;
  /**
   * Extra fade into the paper body so the photo→paper ramp finishes solid.
   */
  fadeBleed?: number;
  /** Full destination hero height for Android plate alignment. */
  heroHeight: number;
  /**
   * Active hero source for Android soft plate (iOS BlurView samples the
   * live hero underneath — no duplicate plate).
   */
  source?: ImageSource | number | string;
  /**
   * Remount BlurView when the hero URI arrives after reload — otherwise iOS
   * keeps a stale/empty sample.
   */
  blurKey?: string;
  /** Solid paper color the blend must reach (`#FFFFFF` / sunken). */
  paperColor: string;
  borderTopLeftRadius: number;
  borderTopRightRadius: number;
};

/**
 * Photo→paper blend under the trip-card title.
 *
 * One continuous milk-out from the live hero into solid paper — not a frosted
 * glass panel. A light blur only softens the photo; the LinearGradient does
 * the readable blend so there is no dark band / clear strip / white sandwich.
 *
 * Must NOT sit under a card-wide `overflow: 'hidden'` ancestor — that kills
 * UIVisualEffect sampling on iOS.
 */
export function TravelHomeTripFrostScoop({
  children,
  height,
  fadeBleed = 0,
  heroHeight,
  source,
  blurKey = 'frost',
  paperColor,
  borderTopLeftRadius,
  borderTopRightRadius,
  style,
  ...rest
}: TravelHomeTripFrostScoopProps) {
  const theme = useTheme();
  const { allowsBlur } = usePerformanceTier();
  const dark = theme.name === 'dark';
  const imageSource =
    typeof source === 'string' ? { uri: source } : source;
  const totalHeight = height + fadeBleed;
  /** Softener ends just above the solid paper seal. */
  const blurEndInset = Math.max(0, Math.round(fadeBleed * 0.35));
  /** Full-height ramp — long blend, no hard material edge. */
  const fadeHeight = totalHeight;
  const radiusStyle = {
    borderTopLeftRadius,
    borderTopRightRadius,
    borderCurve: 'continuous' as const,
  };
  const paperRgba = dark
    ? hexToRgba(paperColor, 1) ?? 'rgba(12, 16, 24, 1)'
    : hexToRgba(paperColor, 1) ?? 'rgba(255, 255, 255, 1)';
  // Ease from clear photo → readable ink → solid paper in one ramp.
  // Light mode leans a bit milkier so title/location sit on clearer white.
  const c0 = dark
    ? hexToRgba(paperColor, 0) ?? 'rgba(12, 16, 24, 0)'
    : hexToRgba(paperColor, 0.08) ?? 'rgba(255, 255, 255, 0.08)';
  const c1 = dark
    ? hexToRgba(paperColor, 0.28) ?? 'rgba(12, 16, 24, 0.28)'
    : hexToRgba(paperColor, 0.42) ?? 'rgba(255, 255, 255, 0.42)';
  const c2 = dark
    ? hexToRgba(paperColor, 0.66) ?? 'rgba(12, 16, 24, 0.66)'
    : hexToRgba(paperColor, 0.8) ?? 'rgba(255, 255, 255, 0.8)';
  const c3 = dark
    ? hexToRgba(paperColor, 0.93) ?? 'rgba(12, 16, 24, 0.93)'
    : hexToRgba(paperColor, 0.96) ?? 'rgba(255, 255, 255, 0.96)';

  return (
    <View
      {...rest}
      collapsable={false}
      style={[
        styles.scoop,
        {
          height: totalHeight,
          // No border — a hairline reads as a separate plate on the photo.
          borderWidth: 0,
          ...radiusStyle,
        },
        style,
      ]}>
      {/* Subtle softener only — keep intensity low so it doesn’t muddy a band. */}
      {Platform.OS === 'ios' ? (
        <BlurView
          key={`ios-frost-${blurKey}`}
          intensity={allowsBlur ? (dark ? 18 : 22) : 0}
          tint={dark ? 'dark' : 'light'}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            radiusStyle,
            styles.blurClip,
            { bottom: blurEndInset, opacity: 0.55 },
          ]}
        />
      ) : imageSource && allowsBlur ? (
        <Image
          key={`android-frost-${blurKey}`}
          pointerEvents="none"
          source={imageSource}
          blurRadius={14}
          contentFit="cover"
          contentPosition={{ top: '50%', left: '50%' }}
          accessible={false}
          importantForAccessibility="no"
          recyclingKey={`travel-trip-frost-scoop-${blurKey}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: height - heroHeight,
            height: heroHeight,
            zIndex: 0,
            opacity: 0.45,
            ...radiusStyle,
            ...({ filter: 'blur(8px)' } as object),
          }}
        />
      ) : null}
      {/*
        Seal the lower bleed solid so the ramp can never open a clear window
        onto the hero under the paper join.
      */}
      {fadeBleed > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: Math.max(10, Math.round(fadeBleed * 0.65)),
            backgroundColor: paperColor,
            zIndex: 0,
          }}
        />
      ) : null}
      {/* One photo→paper blend — the visual transition. */}
      <LinearGradient
        pointerEvents="none"
        colors={[c0, c1, c2, c3, paperRgba]}
        locations={[0, 0.28, 0.52, 0.78, 1]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: fadeHeight,
          zIndex: 0,
          ...radiusStyle,
        }}
      />
      <View style={[styles.chrome, { height }]}>{children}</View>
    </View>
  );
}

function hexToRgba(hex: string, alpha: number): string | null {
  const raw = hex.trim();
  const match = /^#([0-9a-fA-F]{6})$/.exec(raw);
  if (!match) return null;
  const n = parseInt(match[1]!, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  scoop: {
    // No overflow:hidden here — it breaks UIVisualEffect sampling of the hero.
    backgroundColor: 'transparent',
  },
  blurClip: {
    overflow: 'hidden',
  },
  chrome: {
    zIndex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
});
