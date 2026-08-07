import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { travelHomeTokens } from '@/features/travel/travel-home-tokens';
import { useTheme } from '@/hooks/use-theme';

export const TRAVEL_HOME_ATMOSPHERE = require('../../../assets/images/travel/header-atmosphere-v2.png');
/** Dark-mode header wash — Iceland northern lights (not trip-card hero imagery). */
export const TRAVEL_HOME_ATMOSPHERE_NIGHT = require('../../../assets/images/travel/header-atmosphere-iceland-aurora.png');

type TravelHomeBackgroundProps = {
  /** Reserved for future trip-synced heroes; cards own destination photography. */
  imageUri?: string;
  enabled: boolean;
};

/** Window-space height for the atmosphere band (includes status-bar inset). */
export function travelHomeAtmosphereHeight(windowHeight: number, topInset: number): number {
  return Math.round(windowHeight * 0.42) + topInset;
}

/** Day mountain wash or Iceland aurora — same geometry either theme. */
export function travelHomeAtmosphereSource(themeName: string) {
  return themeName === 'dark' ? TRAVEL_HOME_ATMOSPHERE_NIGHT : TRAVEL_HOME_ATMOSPHERE;
}

/**
 * Scenic Travel home backdrop.
 * Paints the content-area wash; the matching status-bar strip is registered
 * via `useSafeAreaChrome` so AppSafeArea fills the notch band (SafeAreaView
 * clips negative offsets, so the chrome layer owns that region).
 */
export function TravelHomeBackground({
  enabled: _enabled,
}: TravelHomeBackgroundProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const dark = theme.name === 'dark';
  const paper = dark ? theme.backgroundPrimary : travelHomeTokens.colors.surfaceMuted;
  /** Include status-bar inset so the photo aligns with the chrome-layer strip. */
  const photoHeight = travelHomeAtmosphereHeight(height, insets.top);
  const atmosphere = travelHomeAtmosphereSource(theme.name);

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          backgroundColor: dark
            ? travelHomeTokens.colors.atmosphereNight
            : travelHomeTokens.colors.surfaceMuted,
        },
      ]}>
      <Image
        source={atmosphere}
        style={[
          styles.photo,
          {
            top: -insets.top,
            height: photoHeight,
          },
        ]}
        contentFit="cover"
        contentPosition={{ top: '0%', left: '50%' }}
        blurRadius={travelHomeTokens.sizes.heroBlurRadius}
      />
      <LinearGradient
        pointerEvents="none"
        colors={
          dark
            ? [
                'rgba(4,10,24,0.05)',
                'rgba(4,10,24,0.0)',
                'rgba(8,14,28,0.45)',
                paper,
              ]
            : [
                'rgba(255,255,255,0.12)',
                'rgba(255,255,255,0.0)',
                'rgba(244,246,249,0.28)',
                'rgba(244,246,249,0.72)',
              ]
        }
        locations={[0, 0.28, 0.68, 1]}
        style={[
          styles.fade,
          {
            top: -insets.top,
            // Stop short of a hard paper cut so card/sheet top curves stay visible.
            height: photoHeight + 8,
          },
        ]}
      />
      {/*
        Curved paper sheet — large top radii so atmosphere peeks through
        the corner wedges behind the first trip card (matches user mock).
        Start slightly below the atmosphere band so card top-curves aren’t
        flattened against an opaque rectangular wash.
      */}
      <View
        style={[
          styles.paperFill,
          {
            top: photoHeight - insets.top + Math.round(travelHomeTokens.radius.sheetTop * 0.35),
            backgroundColor: paper,
            borderTopLeftRadius: travelHomeTokens.radius.sheetTop,
            borderTopRightRadius: travelHomeTokens.radius.sheetTop,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'visible',
  },
  photo: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  paperFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
});
