import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useTheme } from '@/hooks/use-theme';

type TravelHomeTripFrostScoopProps = ViewProps & {
  children?: React.ReactNode;
  /**
   * Title band height — usually measured content (≥ `bodyOverlap`) so the
   * swoop matches the single-line title + traveler row.
   */
  height: number;
  /**
   * Extra fade into the paper body so the photo→paper ramp finishes solid.
   */
  fadeBleed?: number;
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
 * Separate ramps (never black→white in one gradient — muddy shelf):
 * 1. Soft photo soften (iOS blur) under the title band
 * 2. Short full-width paper join into solid paper
 * 3. Wedge title veil — dense milk under left title ink, tapers out right
 *
 * Destination lives on paper below. iOS BlurView softener over the title band
 * only; Android stays gradient-only.
 *
 * Must NOT sit under a card-wide `overflow: 'hidden'` ancestor — that kills
 * UIVisualEffect sampling on iOS.
 */
export function TravelHomeTripFrostScoop({
  children,
  height,
  fadeBleed = 0,
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
  const totalHeight = height + fadeBleed;
  const radiusStyle = {
    borderTopLeftRadius,
    borderTopRightRadius,
    borderCurve: 'continuous' as const,
  };
  const paperRgba = dark
    ? hexToRgba(paperColor, 1) ?? 'rgba(12, 16, 24, 1)'
    : hexToRgba(paperColor, 1) ?? 'rgba(255, 255, 255, 1)';
  const milkHeight = totalHeight;
  const joinHeight = Math.max(
    fadeBleed + 18,
    Math.round(totalHeight * 0.42),
  );
  /** Full scoop height — title scrim + paper milk cover the band. */
  const fadeHeight = totalHeight;
  const milkClear = dark
    ? hexToRgba(paperColor, 0) ?? 'rgba(12, 16, 24, 0)'
    : 'rgba(255,255,255,0)';
  const milkSoft = dark
    ? hexToRgba(paperColor, 0.38) ?? 'rgba(12, 16, 24, 0.38)'
    : 'rgba(255,255,255,0.45)';
  const milkStrong = dark
    ? hexToRgba(paperColor, 0.82) ?? 'rgba(12, 16, 24, 0.82)'
    : 'rgba(255,255,255,0.86)';
  const milkFill = dark
    ? (hexToRgba(paperColor, 1) ?? paperColor)
    : '#FFFFFF';
  /**
   * Wedge in viewBox units (x 0–100). Left hugs the top so serif ascenders
   * sit on milk (not busy photo); right still drops so avatars keep open photo.
   */
  const leftTop = 0;
  const rightTop = Math.max(
    Math.round(milkHeight - joinHeight * 0.55),
    Math.round(milkHeight * 0.52),
  );
  const veilPath = [
    `M 0 ${leftTop}`,
    // Hold high through the title column (~45%), then ease down for avatars.
    `C 32 ${leftTop} 48 ${leftTop + (rightTop - leftTop) * 0.22} 100 ${rightTop}`,
    `L 100 ${milkHeight}`,
    `L 0 ${milkHeight}`,
    'Z',
  ].join(' ');
  /**
   * Extra left-side milk under the title — bright glacier/fog washes need a
   * denser plate on the ink side; right stays open for avatars.
   */
  const sideBoost = dark ? 0.68 : 0.64;

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
      {/* iOS softener — light frost under black title on milk. */}
      {Platform.OS === 'ios' ? (
        <BlurView
          key={`ios-frost-${blurKey}`}
          intensity={allowsBlur ? 16 : 0}
          tint="light"
          pointerEvents="none"
          style={[
            radiusStyle,
            styles.blurClip,
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height,
              opacity: 0.28,
              zIndex: 0,
            },
          ]}
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
            height: Math.max(10, Math.round(fadeBleed * 0.7)),
            backgroundColor: paperColor,
            zIndex: 0,
          }}
        />
      ) : null}
      {/* Short full-width join — photo→paper seam under the whole card. */}
      <LinearGradient
        pointerEvents="none"
        colors={[milkClear, milkSoft, milkStrong, paperRgba]}
        locations={[0, 0.35, 0.7, 1]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: joinHeight,
          zIndex: 0,
        }}
      />
      {/*
        Title veil — high behind left title ink, tapers out toward the right
        (avatars keep more open photo). Vertical milk + left-side boost.
      */}
      <Svg
        pointerEvents="none"
        width="100%"
        height={milkHeight}
        viewBox={`0 0 100 ${milkHeight}`}
        preserveAspectRatio="none"
        style={styles.titleVeil}>
        <Defs>
          <SvgLinearGradient id="titleMilk" x1="0" y1="0" x2="0" y2="1">
            {/* Early milk so title glyphs never straddle clear photo → solid paper. */}
            <Stop offset="0" stopColor={milkFill} stopOpacity={0.42} />
            <Stop offset="0.18" stopColor={milkFill} stopOpacity={0.78} />
            <Stop offset="0.45" stopColor={milkFill} stopOpacity={0.96} />
            <Stop offset="1" stopColor={milkFill} stopOpacity={1} />
          </SvgLinearGradient>
          <SvgLinearGradient id="titleSide" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={milkFill} stopOpacity={sideBoost} />
            <Stop
              offset="0.42"
              stopColor={milkFill}
              stopOpacity={sideBoost * 0.62}
            />
            <Stop offset="0.72" stopColor={milkFill} stopOpacity={0} />
          </SvgLinearGradient>
        </Defs>
        <Path d={veilPath} fill="url(#titleMilk)" />
        <Path d={veilPath} fill="url(#titleSide)" />
      </Svg>
      <View style={[styles.chrome, { height: Math.min(height, fadeHeight) }]}>
        {children}
      </View>
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
  titleVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  chrome: {
    zIndex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
});
