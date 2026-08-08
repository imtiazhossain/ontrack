import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { glassMaterials, glassMistWashStyle, radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { GlassPlate } from './glass-plate';

type GlassIconWellProps = {
  children: ReactNode;
  /** Outer size in points (defaults to min tap / 44). */
  size?: number;
  /** Corner radius; defaults to continuous md scaled. */
  borderRadius?: number;
  /**
   * `mist` = translucent frost well (default — replaces accentFaint / sunken).
   * `airy` = lighter frost for larger chrome (BlurView — not under clipped parents).
   * `tint` = solid brand tint (airline / kind color) — not paper chrome.
   */
  variant?: 'mist' | 'airy' | 'tint';
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared frosted icon well for cards, hubs, and toolbars.
 * Prefer over `backgroundColor: theme.accentFaint` / `backgroundSunken` squares.
 *
 * Mist wells use fill-only white frost (bright rim) so they read as glass on
 * cream SettingsGroup / Card plates — not the graphite mistLight paper wash.
 */
export function GlassIconWell({
  children,
  size,
  borderRadius,
  variant = 'mist',
  tintColor,
  style,
}: GlassIconWellProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const box = size ?? Math.max(44, s(44));
  const radius = borderRadius ?? Math.max(radii.md, s(12));
  const boxStyle = [
    styles.well,
    {
      width: box,
      height: box,
      borderRadius: radius,
    },
    style,
  ];

  if (variant === 'tint') {
    return (
      <View
        style={[
          boxStyle,
          { backgroundColor: tintColor ?? 'transparent' },
        ]}>
        {children}
      </View>
    );
  }

  if (variant === 'airy') {
    return (
      <GlassPlate airy style={boxStyle}>
        {children}
      </GlassPlate>
    );
  }

  const dark = theme.name === 'dark';
  return (
    <View
      collapsable={false}
      style={[
        boxStyle,
        {
          borderWidth: 1,
          borderColor: dark
            ? glassMaterials.border.mist
            : glassMaterials.border.lightAiry,
          backgroundColor: 'transparent',
        },
      ]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          dark ? styles.mistTintDark : styles.mistTintLight,
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  well: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  /** White frost on cream/glass boards — bright rim + translucent wash. */
  mistTintLight: glassMistWashStyle.brightWell,
  mistTintDark: glassMistWashStyle.onDark,
});
