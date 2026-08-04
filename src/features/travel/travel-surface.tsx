import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText, Card, Symbol } from '@/components/primitives';
import {
  darkTheme,
  darkTravelTheme,
  lightTheme,
  lightTravelTheme,
  type AppIconName,
  type Theme,
} from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import {
  travelAtmosphereScheme,
  type TravelAtmosphere,
} from './travel-atmosphere-model';

/** Travel's open-sky accent. Shared control semantics remain unchanged. */
export const TRAVEL_EDITORIAL_ACCENT = '#2474A8';

/** Multicolor route rail: sky, lagoon, and twilight. */
const TRAVEL_RAIL_LIGHT = ['#2F80ED', '#21B6A8', '#8B5CF6'] as const;
const TRAVEL_RAIL_DARK = ['#78BCE8', '#4FD1C5', '#B69CFF'] as const;

/** Cool shadow that sits naturally on Travel's sky wash. */
export const TRAVEL_CARD_SHADOW = '0 3px 12px rgba(17, 74, 110, 0.16)';
export const TRAVEL_CARD_SHADOW_DARK = '0 4px 16px rgba(0, 0, 0, 0.45)';

export function travelCardShadow(theme: Theme): string {
  return theme.name === 'dark' ? TRAVEL_CARD_SHADOW_DARK : TRAVEL_CARD_SHADOW;
}

/** Travel pages fade a single blue wash into Today's neutral paper. */
const FALLBACK_ATMOSPHERE: TravelAtmosphere = {
  destination: 'Travel',
  timeOfDay: 'day',
};

function todayTheme(theme: Theme): Theme {
  return theme.name === 'dark' ? darkTheme : lightTheme;
}

function todayPageBackground(theme: Theme): string {
  return todayTheme(theme).backgroundPrimary;
}

function travelTopWash(theme: Theme): string {
  return theme.name === 'dark'
    ? darkTravelTheme.backgroundSecondary
    : lightTravelTheme.backgroundPrimary;
}

export function travelSafeAreaBackground(theme: Theme): string {
  return travelTopWash(theme);
}

function travelBluePageGradient(theme: Theme): string {
  const wash = travelTopWash(theme);
  const paper = todayPageBackground(theme);
  return `linear-gradient(to bottom, ${wash} 0%, ${paper} 38%, ${paper} 100%)`;
}

export function travelPageBg(
  theme: Theme,
  _atmosphere: TravelAtmosphere = FALLBACK_ATMOSPHERE,
): string {
  return todayPageBackground(theme);
}

/** Blue-to-neutral page style shared by every Travel route. */
export function travelPageStyle(
  theme: Theme,
  atmosphere: TravelAtmosphere = FALLBACK_ATMOSPHERE,
): ViewStyle {
  return {
    backgroundColor: travelPageBg(theme, atmosphere),
    experimental_backgroundImage: travelBluePageGradient(theme),
  };
}

export function useTravelPageStyle(theme: Theme): ViewStyle {
  return travelPageStyle(theme);
}

/** Continue the page wash behind the status bar without changing content insets. */
export function travelSafeAreaStyle(
  theme: Theme,
  _atmosphere: TravelAtmosphere = FALLBACK_ATMOSPHERE,
): ViewStyle {
  return { backgroundColor: travelSafeAreaBackground(theme) };
}

/** Elevated card fill — cream sheet in light, field panel in dark. */
export function travelCardFill(theme: Theme): string {
  return theme.backgroundElevated;
}

/** White main cards on the light Travel wash; preserve dark-mode elevation. */
export function travelMainCardFill(theme: Theme): string {
  return theme.name === 'light' ? '#FFFFFF' : travelCardFill(theme);
}

/** Hairline card border from sheet chrome. */
export function travelCardBorder(theme: Theme): string {
  return theme.separator;
}

/** Soft sunken / field panel tint (Add Stay input fill). */
export function travelPanelTint(theme: Theme): string {
  return theme.backgroundSunken;
}

/** Warm sand tint for secondary panels. */
export function travelWarmTint(theme: Theme): string {
  return theme.backgroundSunken;
}

/** Soft pill behind secondary labels — sheet field fill. */
export function travelPillBg(theme: Theme): string {
  return theme.backgroundSunken;
}

/** CTA / accent from sheet chrome (gradient start). */
export function travelAccent(theme: Theme): string {
  return theme.accentPrimary;
}

/** Three representative stops for callers that need concrete gradient colors. */
export function travelWashColors(
  theme: Theme,
  atmosphere: TravelAtmosphere = FALLBACK_ATMOSPHERE,
): [string, string, string] {
  const gradient = travelAtmosphereScheme(theme, atmosphere);
  return [gradient.stops[0], gradient.stops[1], gradient.stops[3]];
}

export function travelSkyColors(theme: Theme): [string, string, string] {
  return travelWashColors(theme);
}

/** @deprecated Cream-on-sky text; prefer sheet chrome title. */
export const TRAVEL_ON_SKY = '#0B1C28';

/** Blue-to-neutral page backdrop matching the Travel routes. */
export function TravelSkyBackdrop(_props?: { variant?: 'wash' | 'sky' }) {
  const theme = useTheme();
  const pageStyle = useTravelPageStyle(theme);
  return (
    <View
      style={[StyleSheet.absoluteFill, pageStyle]}
      pointerEvents="none"
    />
  );
}

/** Elevated travel card — continuous radius + warm shadow like Add Stay panels. */
export function TravelSurfaceCard({
  children,
  stripeColor,
  stripe = Boolean(stripeColor),
  style,
  bodyStyle,
  padding,
  onLayout,
}: PropsWithChildren<{
  /** @deprecated Prefer `stripe` — solid override when a non-gold accent is needed. */
  stripeColor?: string;
  /** Multicolor Travel rail (default when `stripeColor` is not supplied). */
  stripe?: boolean;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  padding?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}>) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const pad = padding ?? rs.md;
  const stripeW = Math.max(3, s(3));
  const showStripe = stripe || Boolean(stripeColor);
  const railColors =
    theme.name === 'dark' ? TRAVEL_RAIL_DARK : TRAVEL_RAIL_LIGHT;
  return (
    <Card
      padded={false}
      onLayout={onLayout}
      style={[
        styles.card,
        { backgroundColor: travelMainCardFill(theme) },
        style,
      ]}>
      {showStripe ? (
        <View style={[styles.stripe, { width: stripeW }]}>
          {stripeColor ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: stripeColor }]} />
          ) : (
            <LinearGradient
              colors={[...railColors]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
      ) : null}
      <View style={[styles.cardBody, { padding: pad, gap: rs.md }, bodyStyle]}>{children}</View>
    </Card>
  );
}

/** Tinted section label used across travel lists. */
export function TravelSectionLabel({
  title,
  count,
  icon,
}: {
  title: string;
  count?: number;
  icon?: AppIconName;
}) {
  const theme = useTheme();
  const accent = travelAccent(theme);
  const { spacing: rs, s } = useResponsive();
  const badge = Math.max(22, s(24));
  return (
    <View
      style={[
        styles.sectionLabel,
        {
          paddingVertical: rs.xs,
          gap: rs.sm,
          minHeight: Math.max(44, s(44)),
        },
      ]}>
      {icon ? <Symbol name={icon} size="sm" color={accent} /> : null}
      <AppText
        variant="heading"
        style={styles.flex}
        fit
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}>
        {title}
      </AppText>
      {count !== undefined ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: theme.accentPrimary,
              width: badge,
              height: badge,
              borderRadius: badge / 2,
            },
          ]}>
          <AppText
            variant="callout"
            fit
            fitMinimumScale={0.85}
            color="onAccent"
            bold>
            {count}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
  },
  stripe: {
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flex: { flex: 1, flexShrink: 1, minWidth: 0 },
});
