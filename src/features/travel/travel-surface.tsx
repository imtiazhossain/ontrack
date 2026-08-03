import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText, Symbol } from '@/components/primitives';
import { type AppIconName, type Theme } from '@/design-system';
import {
  itinerarySheetChrome,
  travelInputFieldBackground,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Warm copper accent aligned with Add Stay sheet CTA (light). */
export const TRAVEL_EDITORIAL_ACCENT = '#A07850';

/** Metallic gold left-rail colors matching the trip-card mock (light / dark). */
const TRAVEL_RAIL_GOLD_LIGHT = ['#E8C97A', '#DEB159', '#C49649'] as const;
const TRAVEL_RAIL_GOLD_DARK = ['#E8C9A0', '#D4A574', '#B8895A'] as const;

/** Soft brown-tint shadow matching Add Stay sheet elevation. */
export const TRAVEL_CARD_SHADOW = '0 3px 12px rgba(51, 39, 28, 0.11)';
export const TRAVEL_CARD_SHADOW_DARK = '0 4px 16px rgba(0, 0, 0, 0.45)';

export function travelCardShadow(theme: Theme): string {
  return theme.name === 'dark' ? TRAVEL_CARD_SHADOW_DARK : TRAVEL_CARD_SHADOW;
}

/** Page / sheet backdrop — exact Add Stay sheet background. */
export function travelPageBg(theme: Theme): string {
  return itinerarySheetChrome(theme).sheetBg;
}

/** Elevated card fill — cream sheet in light, field panel in dark. */
export function travelCardFill(theme: Theme): string {
  return travelInputFieldBackground(theme);
}

/** Hairline card border from sheet chrome. */
export function travelCardBorder(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBorder;
}

/** Soft sunken / field panel tint (Add Stay input fill). */
export function travelPanelTint(theme: Theme): string {
  return travelInputFieldBackground(theme);
}

/** Warm sand tint for secondary panels. */
export function travelWarmTint(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBg;
}

/** Soft pill behind secondary labels — sheet field fill. */
export function travelPillBg(theme: Theme): string {
  return travelInputFieldBackground(theme);
}

/** CTA / accent from sheet chrome (gradient start). */
export function travelAccent(theme: Theme): string {
  return itinerarySheetChrome(theme).ctaFrom;
}

/** @deprecated Flat paper — kept for call sites that still pass a wash. */
export function travelWashColors(theme: Theme): [string, string, string] {
  const base = travelPageBg(theme);
  return [base, base, base];
}

/** @deprecated Editorial surfaces no longer use sky gradients. */
export function travelSkyColors(theme: Theme): [string, string, string] {
  return travelWashColors(theme);
}

/** @deprecated Cream-on-sky text; prefer sheet chrome title. */
export const TRAVEL_ON_SKY = '#2D1C13';

/** Paper page backdrop matching Add Stay sheet. */
export function TravelSkyBackdrop(_props?: { variant?: 'wash' | 'sky' }) {
  const theme = useTheme();
  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: travelPageBg(theme) }]}
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
}: PropsWithChildren<{
  /** @deprecated Prefer `stripe` — solid override when a non-gold accent is needed. */
  stripeColor?: string;
  /** Metallic gold left rail (default when `stripeColor` is set). */
  stripe?: boolean;
  style?: ViewStyle;
  bodyStyle?: ViewStyle;
  padding?: number;
}>) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const pad = padding ?? rs.md;
  const stripeW = Math.max(3, s(3));
  const showStripe = stripe || Boolean(stripeColor);
  const railColors =
    theme.name === 'dark' ? TRAVEL_RAIL_GOLD_DARK : TRAVEL_RAIL_GOLD_LIGHT;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: travelCardFill(theme),
          borderRadius: 22,
          borderCurve: 'continuous',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: chrome.fieldBorder,
          boxShadow: travelCardShadow(theme),
        },
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
    </View>
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
  const chrome = itinerarySheetChrome(theme);
  const accent = travelAccent(theme);
  /** Warm bronze count chip matching the travel mock. */
  const badgeFill = theme.name === 'light' ? '#8B6B45' : chrome.ctaFrom;
  const { spacing: rs, s } = useResponsive();
  const badge = Math.max(22, s(24));
  const titleSize = Math.max(22, s(24));
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
        style={[
          styles.flex,
          {
            color: theme.textPrimary,
            fontSize: titleSize,
            lineHeight: Math.max(28, s(30)),
            fontWeight: '400',
            letterSpacing: -0.25,
          },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}>
        {title}
      </AppText>
      {count !== undefined ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: badgeFill,
              width: badge,
              height: badge,
              borderRadius: badge / 2,
            },
          ]}>
          <AppText
            variant="callout"
            fit
            fitMinimumScale={0.85}
            style={{ color: '#FFFFFF', fontWeight: '600', fontSize: s(13) }}>
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
    overflow: 'hidden',
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
