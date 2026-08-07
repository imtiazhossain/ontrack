import { memo, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import { travelHomeSoloTripCardShadow } from '@/features/travel/travel-home-atmosphere-ink';
import { travelHomeFixtureHeroSource } from '@/features/travel/fixtures/travel-home';
import { TravelHomeDateBlock } from '@/features/travel/travel-home-date-block';
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
  /** Active remote hero URI — Android scoop frosts this plate. */
  const [heroFrostUri, setHeroFrostUri] = useState<string | undefined>();
  useEffect(() => {
    setHeroFrostUri(undefined);
  }, [plan.id]);
  const destination = plan.destination.trim();
  const destinationLabel = destination || plan.title;
  const dark = theme.name === 'dark';
  const ink = dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  const muted = dark ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const brand = dark ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const titleSize = Math.max(24, s(travelHomeTokens.sizes.tripTitle));
  const compact = layoutWidth < 360;
  const radius = travelHomeTokens.radius.tripCard;
  const heroHeight = travelHomeImageHeight(cardWidth);
  const bodyOverlap = travelHomeTokens.spacing.bodyOverlap;
  /**
   * Visual milk under the title into paper. Keep short — paper paints above
   * this bleed (zIndex) so footer never gets clipped by the scoop.
   */
  const frostFadeBleed = Math.max(16, s(18));
  const titleToLocation = Math.max(4, travelHomeTokens.spacing.titleToLocation);
  const locationToDivider = Math.max(6, travelHomeTokens.spacing.locationToDivider - 2);
  const footerPadV = Math.max(10, travelHomeTokens.spacing.cardBottom);
  const fixtureFrost = __DEV__ ? travelHomeFixtureHeroSource(plan.id) : undefined;
  const coverFrost =
    typeof plan.coverUri === 'string' && plan.coverUri.trim()
      ? { uri: plan.coverUri.trim() }
      : undefined;
  const heroFrostSource = heroFrostUri
    ? { uri: heroFrostUri }
    : coverFrost ?? fixtureFrost;
  const paper = dark ? theme.backgroundSunken : '#FFFFFF';
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
  // Light: solid black + white ink. Dark: brand blue + white.
  const itineraryFg = '#FFFFFF';
  const itineraryFill = dark
    ? travelHomeTokens.colors.brandBlue
    : travelHomeTokens.colors.ink;
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
    <View style={[styles.locationRow, { gap: 6 }]}>
      <TravelHomeLocationPin size={Math.max(14, s(15))} color={brand} />
      <AppText
        variant="callout"
        numberOfLines={1}
        style={{
          color: muted,
          fontFamily: travelHomeFontFamily,
          fontSize: Math.max(14, s(travelHomeTokens.type.location)),
          flexShrink: 1,
          minWidth: 0,
        }}>
        {destination}
      </AppText>
    </View>
  ) : null;

  const titleBlock = (
    <View style={[styles.titleCluster, { gap: titleToLocation }]}>
      <View style={[styles.titleRow, { gap: rs.sm }]}>
        <View style={styles.titleCopy}>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              color: ink,
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
      {/* Location lives in frost chrome — paper sits under the milk overlay. */}
      {locationRow}
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
              if (uri) setHeroFrostUri(uri);
              onActiveImageChange?.(plan.id, uri);
            }}
          />
        </View>

        {/*
          Frost overlays the hero bottom via negative margin — sibling of the
          clipped hero media so BlurView can sample the live photo. Long
          fadeBleed milks frost into solid paper (no glass→white rim).
        */}
        <View
          collapsable={false}
          style={[
            styles.frostBand,
            {
              height: bodyOverlap + frostFadeBleed,
              marginTop: -bodyOverlap,
            },
          ]}>
          <TravelHomeTripFrostScoop
            height={bodyOverlap}
            fadeBleed={frostFadeBleed}
            heroHeight={heroHeight}
            source={heroFrostSource}
            paperColor={paper}
            blurKey={
              heroFrostUri ??
              (typeof plan.coverUri === 'string' ? plan.coverUri : 'seed')
            }
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
                    paddingTop: travelHomeTokens.spacing.bodyTop,
                    paddingBottom: Math.max(6, s(6)),
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}>
                {titleBlock}
              </Pressable>
            </AgentTestId>
          </TravelHomeTripFrostScoop>
        </View>

        {/* Solid paper body — pulled under the frost milk-out for a soft join. */}
        <View
          style={[
            styles.metaBody,
            {
              backgroundColor: paper,
              borderBottomLeftRadius: radius,
              borderBottomRightRadius: radius,
              marginTop: -frostFadeBleed,
              // Tight under location; metaBody stacks above the frost bleed so
              // dates/CTA are never covered by the milk overlay.
              paddingTop: locationToDivider,
            },
          ]}>
          {compact ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${plan.title}`}
              onPress={openTrip}
              style={({ pressed }) => [
                styles.body,
                {
                  paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                  paddingBottom: locationToDivider,
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
              styles.divider,
              {
                marginHorizontal: travelHomeTokens.spacing.cardHorizontal,
                backgroundColor:
                  theme.name === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : travelHomeTokens.colors.divider,
              },
            ]}
          />

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                paddingTop: Math.max(8, footerPadV - 2),
                paddingBottom: footerPadV,
                // Invisible 50/50 split — no divider; gap is the only seam.
                gap: Math.max(10, rs.sm),
                flexDirection: compact ? 'column' : 'row',
                alignItems: 'stretch',
              },
            ]}>
            <TravelHomeDateBlock startDate={plan.startDate} endDate={plan.endDate} />
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
                  alignSelf: 'stretch',
                },
              ]}>
              <View
                style={[
                  styles.itineraryButton,
                  {
                    flex: 1,
                    height: buttonHeight,
                    paddingHorizontal: itineraryPadH,
                    borderRadius: travelHomeTokens.radius.itineraryButton,
                    backgroundColor: itineraryFill,
                    boxShadow: dark
                      ? travelHomeTokens.colors.itineraryButtonShadowDark
                      : travelHomeTokens.colors.itineraryButtonShadow,
                  },
                ]}>
                {itineraryContent}
              </View>
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
    overflow: 'hidden',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    flexShrink: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
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
