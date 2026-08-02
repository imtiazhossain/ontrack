import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText, Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import { fontFamilies, spacing, type Theme } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
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
  const chrome = itinerarySheetChrome(theme);
  return theme.name === 'dark' ? chrome.fieldBg : '#FFFFFF';
}

/** Hairline card border from sheet chrome. */
export function travelCardBorder(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBorder;
}

/** Soft sunken / field panel tint (Add Stay input fill). */
export function travelPanelTint(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBg;
}

/** Warm sand tint for secondary panels. */
export function travelWarmTint(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBg;
}

/** Soft pill behind secondary labels — sheet field fill. */
export function travelPillBg(theme: Theme): string {
  return itinerarySheetChrome(theme).fieldBg;
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
  padding,
}: PropsWithChildren<{
  /** @deprecated Prefer `stripe` — solid override when a non-gold accent is needed. */
  stripeColor?: string;
  /** Metallic gold left rail (default when `stripeColor` is set). */
  stripe?: boolean;
  style?: ViewStyle;
  padding?: number;
}>) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const pad = padding ?? rs.md;
  const stripeW = Math.max(4, s(4));
  const showStripe = stripe || Boolean(stripeColor);
  const railColors =
    theme.name === 'dark' ? TRAVEL_RAIL_GOLD_DARK : TRAVEL_RAIL_GOLD_LIGHT;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: travelCardFill(theme),
          borderRadius: 18,
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
      <View style={[styles.cardBody, { padding: pad, gap: rs.md }]}>{children}</View>
    </View>
  );
}

/**
 * Sheet / landing header — serif display title matching Add Stay chrome.
 */
export function TravelSkyHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing: rs, s } = useResponsive();
  return (
    <View
      style={[
        styles.editorialHeader,
        {
          gap: rs.xs,
          paddingVertical: rs.sm,
          minHeight: Math.max(72, s(72)),
        },
      ]}>
      <View style={[styles.editorialHeaderRow, { gap: rs.sm }]}>
        <View style={styles.editorialHeaderCopy}>
          {eyebrow ? (
            <AppText
              variant="overline"
              fit
              style={[travelOverlineStyle, styles.serif, { color: chrome.subtitle }]}>
              {eyebrow}
            </AppText>
          ) : null}
          <AppText
            style={[styles.editorialTitle, { color: chrome.title }]}
            fit
            numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText
              variant="callout"
              style={[styles.serif, { color: chrome.subtitle }]}
              numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        {trailing}
      </View>
      <View style={[styles.editorialRule, { backgroundColor: chrome.fieldBorder }]} />
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
  const { spacing: rs, s } = useResponsive();
  const badge = Math.max(22, s(22));
  return (
    <View
      style={[
        styles.sectionLabel,
        {
          paddingVertical: rs.xs,
          gap: rs.sm,
          minHeight: Math.max(40, s(40)),
        },
      ]}>
      {icon ? <Symbol name={icon} size="sm" color={accent} /> : null}
      <AppText
        style={[styles.sectionTitle, styles.flex, { color: theme.textPrimary }]}
        fit
        numberOfLines={1}>
        {title}
      </AppText>
      {count !== undefined ? (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: accent,
              width: badge,
              height: badge,
              borderRadius: badge / 2,
            },
          ]}>
          <AppText
            variant="caption"
            fit
            style={{ color: chrome.ctaText, fontWeight: '600' }}>
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
  editorialHeader: {
    width: '100%',
  },
  editorialHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editorialHeaderCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  editorialTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '400',
    letterSpacing: -0.6,
  },
  editorialRule: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginTop: spacing.xs,
  },
  serif: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fontFamilies.serif,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  countBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flex: { flex: 1, flexShrink: 1, minWidth: 0 },
});
