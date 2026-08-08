import { memo, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import { travelHomeSoloTripCardShadow } from '@/features/travel/travel-home-atmosphere-ink';
import { TravelHomeDateBlock } from '@/features/travel/travel-home-date-block';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { TravelHomeHeroCarousel } from '@/features/travel/travel-home-hero-carousel';
import {
    TravelHomeLocationPin,
    TravelHomeRouteIcon,
} from '@/features/travel/travel-home-icons';
import {
    travelHomeFontFamily,
    travelHomeImageHeight,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { TravelHomeTravelerStack } from '@/features/travel/travel-home-traveler-stack';
import { TravelHomeTripFrostScoop } from '@/features/travel/travel-home-trip-frost-scoop';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

export type TravelHomeTripCardProps = {
  plan: TravelPlan;
  travelers: CoTravelerAvatarPerson[];
  onOpenTrip: (tripId: string) => void;
  onViewItinerary: (tripId: string) => void;
  onEditTrip: (tripId: string) => void;
  onViewTravelers: (tripId: string) => void;
  onActiveImageChange?: (tripId: string, uri: string | undefined) => void;
  onLayoutY?: (tripId: string, y: number) => void;
  /** Stagger entrance like Today activity cards. */
  index?: number;
  /**
   * Only trip on the launcher — stronger bottom lift tinted by the
   * Travel home atmosphere plate so the card grounds on empty paper.
   */
  soloAtmosphereShadow?: boolean;
  /** Atmosphere plate average color (`#RRGGBB`) for the solo lift. */
  atmosphereAverageColor?: string;
};

/** Compact landscape trip card — hero, travelers, dates, View Itinerary. */
export const TravelHomeTripCard = memo(function TravelHomeTripCard({
  plan,
  travelers,
  onOpenTrip,
  onViewItinerary,
  onEditTrip,
  onViewTravelers,
  onActiveImageChange,
  onLayoutY,
  index = 0,
  soloAtmosphereShadow = false,
  atmosphereAverageColor,
}: TravelHomeTripCardProps) {
  const theme = useTheme();
  const { s, spacing: rs, width: layoutWidth } = useResponsive();
  const [cardWidth, setCardWidth] = useState(
    Math.max(
      1,
      layoutWidth - travelHomeTokens.spacing.screenHorizontal * 2,
    ),
  );
  const destination = plan.destination.trim();
  const destinationLabel = destination || plan.title;
  const dark = theme.name === 'dark';
  /** Black/ink title on the paper-milk veil (both themes). */
  const titleInk = dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  /** Destination stays black/ink on the paper join — not on the scrim. */
  const locationInk = dark ? theme.textSecondary : travelHomeTokens.colors.ink;
  const brand = dark ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const titleSize = Math.max(24, s(travelHomeTokens.sizes.tripTitle));
  const compact = layoutWidth < 360;
  const radius = travelHomeTokens.radius.tripCard;
  const heroHeight = travelHomeImageHeight(cardWidth);
  const minBodyOverlap: number = travelHomeTokens.spacing.bodyOverlap;
  /**
   * Frost title band — grows when the destination title wraps (up to 2 lines).
   * Floor stays at `bodyOverlap` so avatars keep their photo bite.
   */
  const [titleBandHeight, setTitleBandHeight] = useState<number>(minBodyOverlap);
  const titlePadTop = travelHomeTokens.spacing.bodyTop;
  const titlePadBottom = Math.max(6, s(6));
  /**
   * Visual milk under the title into paper. Keep short — paper paints above
   * this bleed (zIndex) so footer never gets clipped by the scoop.
   */
  const frostFadeBleed = Math.max(22, s(24));
  const titleToLocation = Math.max(6, travelHomeTokens.spacing.titleToLocation);
  const locationToFooter = Math.max(
    10,
    travelHomeTokens.spacing.locationToFooter,
  );
  const footerPadV = Math.max(10, travelHomeTokens.spacing.cardBottom);
  const locationChipPadV = Math.max(
    8,
    s(travelHomeTokens.spacing.locationChipPadV),
  );
  const locationChipPadH = Math.max(
    10,
    s(travelHomeTokens.spacing.locationChipPadH),
  );
  const locationChipBorder = dark
    ? travelHomeTokens.colors.locationChipBorderDark
    : travelHomeTokens.colors.locationChipBorder;
  const paper = dark ? theme.backgroundSunken : '#FFFFFF';
  /** Remount iOS BlurView when the live hero URI arrives / changes. */
  const [frostBlurKey, setFrostBlurKey] = useState(
    () =>
      (typeof plan.coverUri === 'string' && plan.coverUri.trim()) || plan.id,
  );
  useEffect(() => {
    setFrostBlurKey(
      (typeof plan.coverUri === 'string' && plan.coverUri.trim()) || plan.id,
    );
  }, [plan.id, plan.coverUri]);
  useEffect(() => {
    setTitleBandHeight(minBodyOverlap);
  }, [plan.id, plan.title, minBodyOverlap]);
  const cardShadow = soloAtmosphereShadow
    ? travelHomeSoloTripCardShadow({
        averageColor: atmosphereAverageColor,
        dark,
      })
    : dark
      ? travelHomeTokens.colors.cardShadowDark
      : travelHomeTokens.colors.cardShadow;

  const openTrip = () => {
    haptics.tap();
    onOpenTrip(plan.id);
  };
  const viewItinerary = () => {
    // Navigate first — haptic after so it never delays the stack push.
    onViewItinerary(plan.id);
    haptics.tap();
  };
  const itineraryLabel = `View itinerary for ${destinationLabel}`;
  const itineraryAgent = useAgentUiTarget(AgentUiIds.travel.list.itinerary(plan.id), {
    label: itineraryLabel,
    onPress: viewItinerary,
  });
  const buttonHeight = Math.max(
    40,
    s(travelHomeTokens.sizes.itineraryButtonHeight),
  );
  const buttonHitSlop = Math.max(
    0,
    Math.ceil(
      ((Platform.OS === 'android'
        ? travelHomeTokens.sizes.touchTargetMinAndroid
        : travelHomeTokens.sizes.touchTargetMin) -
        buttonHeight) /
        2,
    ),
  );
  const labelSize = Math.max(13, s(travelHomeTokens.type.button));
  // Both themes: frosted sage glass + white ink.
  const itineraryFg = '#FFFFFF';
  const itineraryPadH = Math.max(
    12,
    s(travelHomeTokens.sizes.itineraryHorizontalPadding),
  );
  const itineraryIconSize = Math.max(16, s(travelHomeTokens.sizes.itineraryIcon));
  const itineraryContent = (
    <>
      <TravelHomeRouteIcon size={itineraryIconSize} color={itineraryFg} />
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.05}
        numberOfLines={1}
        style={{
          color: itineraryFg,
          fontSize: labelSize,
          lineHeight: labelSize * 1.1,
          fontWeight: '400',
          fontFamily: travelHomeFontFamily,
          flexShrink: 1,
          minWidth: 0,
        }}>
        View Itinerary
      </Text>
    </>
  );
  const locationRow = destination ? (
    <View
      style={[
        styles.locationChip,
        {
          gap: 8,
          paddingVertical: locationChipPadV,
          paddingHorizontal: locationChipPadH,
          borderRadius: travelHomeTokens.radius.locationChip,
          borderColor: locationChipBorder,
        },
      ]}>
      <TravelHomeLocationPin size={Math.max(14, s(15))} color={brand} />
      <AppText
        variant="callout"
        numberOfLines={1}
        style={{
          color: locationInk,
          fontFamily: travelHomeFontFamily,
          fontSize: Math.max(14, s(travelHomeTokens.type.location)),
          flexShrink: 1,
          minWidth: 0,
        }}>
        {destination}
      </AppText>
    </View>
  ) : null;

  const avatarSize = Math.max(34, s(travelHomeTokens.sizes.avatar));
  const syncTitleBandHeight = (titleContentHeight: number) => {
    const rowH = Math.max(
      titleContentHeight,
      compact || travelers.length === 0 ? 0 : avatarSize,
    );
    const next = Math.max(
      minBodyOverlap,
      Math.ceil(rowH + titlePadTop + titlePadBottom),
    );
    setTitleBandHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
  };
  const titleBlock = (
    <View style={styles.titleCluster}>
      <View style={[styles.titleRow, { gap: rs.sm }]}>
        <View style={styles.titleCopy}>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.15}
            numberOfLines={2}
            ellipsizeMode="tail"
            onLayout={(event) => {
              syncTitleBandHeight(event.nativeEvent.layout.height);
            }}
            style={{
              color: titleInk,
              fontFamily: travelHomeFontFamily,
              fontSize: titleSize,
              lineHeight: titleSize * 1.1,
              fontWeight: '400',
              letterSpacing: -0.4,
            }}>
            {plan.title}
          </Text>
        </View>
        {!compact ? (
          <TravelHomeTravelerStack
            people={travelers}
            tripTitle={plan.title}
            testID={AgentUiIds.travel.list.coTravelers(plan.id)}
            onPress={() => onViewTravelers(plan.id)}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    // Shadow and overflow:hidden cannot share one view on iOS — split so the
    // large mock corner radii actually clip the destination hero.
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 40).springify().damping(18)}
      onLayout={(event) => {
        const { width, y } = event.nativeEvent.layout;
        if (width > 0 && Math.abs(width - cardWidth) > 1) setCardWidth(width);
        onLayoutY?.(plan.id, y);
      }}
      style={[
        styles.shadow,
        {
          borderRadius: radius,
          boxShadow: cardShadow,
          width: '100%',
        },
      ]}>
      {/*
        Do not wrap hero + frost in one overflow:hidden clip — that kills iOS
        UIVisualEffect sampling after reload (dark bar, “missing” title).
        Clip the hero media and paper body separately; frost sits between.
      */}
      <View collapsable={false} style={styles.column}>
        <View
          collapsable={false}
          style={[
            styles.heroMedia,
            {
              height: heroHeight,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
            },
          ]}>
          <TravelHomeHeroCarousel
            plan={plan}
            width={cardWidth}
            onEdit={() => onEditTrip(plan.id)}
            onActiveImageChange={(uri) => {
              if (uri) setFrostBlurKey(uri);
              onActiveImageChange?.(plan.id, uri);
            }}
          />
        </View>

        {/*
          Frost overlays the hero bottom via negative margin — sibling of the
          clipped hero media so iOS BlurView can sample the live photo. Long
          fadeBleed milks into solid paper (no glass→white rim).
        */}
        <View
          collapsable={false}
          style={[
            styles.frostBand,
            {
              height: titleBandHeight + frostFadeBleed,
              marginTop: -titleBandHeight,
            },
          ]}>
          <TravelHomeTripFrostScoop
            height={titleBandHeight}
            fadeBleed={frostFadeBleed}
            paperColor={paper}
            blurKey={frostBlurKey}
            borderTopLeftRadius={travelHomeTokens.radius.bodyTop}
            borderTopRightRadius={travelHomeTokens.radius.bodyTop}>
            <AgentTestId
              testID={AgentUiIds.travel.list.openHub(plan.id)}
              label={
                destination
                  ? `Open ${plan.title}, ${destination}`
                  : `Open ${plan.title}`
              }
              onPress={openTrip}
              style={styles.frostTitleFill}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  destination
                    ? `Open ${plan.title}, ${destination}`
                    : `Open ${plan.title}`
                }
                onPress={openTrip}
                style={({ pressed }) => [
                  styles.frostTitle,
                  {
                    paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                    paddingTop: titlePadTop,
                    paddingBottom: titlePadBottom,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}>
                {titleBlock}
              </Pressable>
            </AgentTestId>
          </TravelHomeTripFrostScoop>
        </View>

        {/* Solid paper body — destination + footer on paper (black ink). */}
        <View
          style={[
            styles.metaBody,
            {
              backgroundColor: paper,
              borderBottomLeftRadius: radius,
              borderBottomRightRadius: radius,
              marginTop: -frostFadeBleed,
              // Above frost bleed so destination/dates never sit on the scrim.
              paddingTop: Math.max(4, titleToLocation),
            },
          ]}>
          {locationRow ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                destination
                  ? `Open ${plan.title}, ${destination}`
                  : `Open ${plan.title}`
              }
              onPress={openTrip}
              style={({ pressed }) => [
                styles.body,
                {
                  paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                  paddingBottom: locationToFooter,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              {locationRow}
            </Pressable>
          ) : null}
          {compact ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${plan.title}`}
              onPress={openTrip}
              style={({ pressed }) => [
                styles.body,
                {
                  paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                  paddingBottom: locationToFooter,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
              <TravelHomeTravelerStack
                people={travelers}
                tripTitle={plan.title}
                testID={AgentUiIds.travel.list.coTravelers(plan.id)}
                onPress={() => onViewTravelers(plan.id)}
              />
            </Pressable>
          ) : null}

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                paddingTop: locationRow || compact ? 0 : Math.max(8, footerPadV - 2),
                paddingBottom: footerPadV,
                // Invisible 50/50 split — gap is the only seam (no hairline).
                // Center (not stretch): date block is taller than the CTA once
                // weekdays + day pill stack; stretch + metaBody overflow clips
                // the calendar range line off the top.
                gap: Math.max(10, rs.sm),
                flexDirection: compact ? 'column' : 'row',
                alignItems: compact ? 'stretch' : 'center',
              },
            ]}>
            <TravelHomeDateBlock
              tripId={plan.id}
              startDate={plan.startDate}
              endDate={plan.endDate}
            />
            <Pressable
              ref={itineraryAgent.ref}
              testID={AgentUiIds.travel.list.itinerary(plan.id)}
              onLayout={itineraryAgent.onLayout}
              accessibilityRole="button"
              accessibilityLabel={itineraryLabel}
              onPress={viewItinerary}
              hitSlop={buttonHitSlop}
              style={({ pressed }) => [
                styles.itineraryHit,
                {
                  flex: compact ? undefined : 1,
                  height: buttonHeight,
                  borderRadius: travelHomeTokens.radius.itineraryButton,
                  opacity: pressed ? 0.88 : 1,
                  alignSelf: compact ? 'stretch' : 'center',
                },
              ]}>
              <TravelHomeGlass
                accent="green"
                style={[
                  styles.itineraryButton,
                  {
                    flex: 1,
                    height: buttonHeight,
                    paddingHorizontal: itineraryPadH,
                    borderRadius: travelHomeTokens.radius.itineraryButton,
                    boxShadow: dark
                      ? travelHomeTokens.colors.itineraryButtonShadowDark
                      : travelHomeTokens.colors.itineraryButtonShadow,
                  },
                ]}>
                {itineraryContent}
              </TravelHomeGlass>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  shadow: {
    borderCurve: 'continuous',
  },
  column: {
    width: '100%',
    borderCurve: 'continuous',
  },
  heroMedia: {
    width: '100%',
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  frostBand: {
    width: '100%',
    // Below paper body — bleed must not cover divider/footer.
    zIndex: 1,
  },
  frostTitleFill: {
    flex: 1,
  },
  frostTitle: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  metaBody: {
    // Above frost bleed so dates + View Itinerary stay fully visible.
    zIndex: 2,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  body: {
    width: '100%',
  },
  titleCluster: {
    width: '100%',
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderCurve: 'continuous',
  },
  footer: {
    width: '100%',
  },
  itineraryHit: {
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  itineraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    width: '100%',
    minWidth: 0,
    borderCurve: 'continuous',
  },
});
