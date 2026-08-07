import { memo, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';

import { AppText } from '@/components/primitives';
import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import { travelHomeSoloTripCardShadow } from '@/features/travel/travel-home-atmosphere-ink';
import { travelHomeFixtureHeroSource } from '@/features/travel/fixtures/travel-home';
import { TravelHomeCarouselStepper } from '@/features/travel/travel-home-carousel-stepper';
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
  const [heroPager, setHeroPager] = useState({ index: 0, count: 0 });
  /** Continuous hero page position for smooth glass tick crossfades. */
  const heroScrollProgress = useSharedValue(0);
  /** Active remote hero URI — glass frosts this plate in the scoop (iOS + Android). */
  const [heroFrostUri, setHeroFrostUri] = useState<string | undefined>();
  useEffect(() => {
    setHeroPager({ index: 0, count: 0 });
    heroScrollProgress.value = 0;
    setHeroFrostUri(undefined);
  }, [plan.id, heroScrollProgress]);
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
  const fixtureFrost = __DEV__ ? travelHomeFixtureHeroSource(plan.id) : undefined;
  const heroFrostSource = heroFrostUri
    ? { uri: heroFrostUri }
    : fixtureFrost;
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
  // Light: inverted dark glass + white ink (spec navy CTA). Dark: brand blue +
  // white — medium-grey glass + black ink reads as a disabled control.
  const itineraryFg = '#FFFFFF';
  const itineraryFill = dark ? travelHomeTokens.colors.brandBlue : undefined;
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
      <View
        style={[
          styles.clip,
          {
            backgroundColor: 'transparent',
            borderRadius: radius,
          },
        ]}>
        <View collapsable={false} style={styles.heroWrap}>
          <TravelHomeHeroCarousel
            plan={plan}
            width={cardWidth}
            onEdit={() => onEditTrip(plan.id)}
            scrollProgress={heroScrollProgress}
            onActiveImageChange={(uri, index, pageCount) => {
              setHeroPager((previous) => {
                // Ignore transient empty reports so ticks stay visible once known.
                if (pageCount <= 0 && previous.count > 1) return previous;
                if (previous.index === index && previous.count === pageCount) {
                  return previous;
                }
                return { index, count: pageCount };
              });
              setHeroFrostUri(uri);
              onActiveImageChange?.(plan.id, uri);
            }}
          />
          {/*
            Page ticks overlay the visible hero band (above the glass scoop),
            not the meta panel — keeps them on the photo toward its bottom.
          */}
          <View
            collapsable={false}
            pointerEvents="none"
            style={[
              styles.stepperOverlay,
              {
                bottom:
                  bodyOverlap +
                  Math.max(6, s(travelHomeTokens.sizes.carouselBottomInset)),
              },
            ]}>
            <TravelHomeCarouselStepper
              count={heroPager.count}
              index={heroPager.index}
              progress={heroScrollProgress}
            />
          </View>
        </View>

        {/*
          Glass meta panel scoops into the hero so the title sits on frost.
          Hero-aligned plate + milk-out (iOS BlurView / Android photo blur).
        */}
        <TravelHomeGlass
          frost={
            heroFrostSource
              ? {
                  source: heroFrostSource,
                  heroHeight,
                  overlap: bodyOverlap,
                }
              : undefined
          }
          style={[
            styles.metaPanel,
            {
              marginTop: -bodyOverlap,
              borderTopLeftRadius: travelHomeTokens.radius.bodyTop,
              borderTopRightRadius: travelHomeTokens.radius.bodyTop,
              borderBottomLeftRadius: radius,
              borderBottomRightRadius: radius,
            },
          ]}>
          {/*
            Always mount this collapsed slot as a Fabric sibling of BlurView.
            Toggling a real child here caused iOS SIGABRT:
            `unmountChildComponentView` index mismatch on the meta glass plate
            (child y≈-12, pointerEvents=none — former in-glass stepper).
          */}
          <View
            collapsable={false}
            pointerEvents="none"
            style={styles.stepperSlotCollapsed}
          />
          <AgentTestId
            testID={AgentUiIds.travel.list.openHub(plan.id)}
            label={`Open ${plan.title}`}
            onPress={openTrip}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${plan.title}`}
              onPress={openTrip}
              style={({ pressed }) => [
                styles.body,
                {
                  paddingHorizontal: travelHomeTokens.spacing.cardHorizontal,
                  paddingTop: travelHomeTokens.spacing.bodyTop,
                  paddingBottom: travelHomeTokens.spacing.locationToDivider,
                  gap: travelHomeTokens.spacing.titleToLocation,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}>
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

              {destination ? (
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
              ) : null}

              {compact ? (
                <TravelHomeTravelerStack
                  people={travelers}
                  tripTitle={plan.title}
                  testID={AgentUiIds.travel.list.coTravelers(plan.id)}
                  onPress={() => onViewTravelers(plan.id)}
                />
              ) : null}
            </Pressable>
          </AgentTestId>

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
                // iOS TNR footer ink sits optically low — give the band equal air
                // so the dates cluster + CTA share one centered midline.
                paddingBottom:
                  Platform.OS === 'ios'
                    ? Math.max(16, travelHomeTokens.spacing.cardBottom + 4)
                    : travelHomeTokens.spacing.cardBottom,
                paddingTop:
                  Platform.OS === 'ios'
                    ? Math.max(14, travelHomeTokens.spacing.dividerToMeta + 6)
                    : travelHomeTokens.spacing.dividerToMeta,
                gap: Math.max(
                  Platform.OS === 'ios' ? 14 : 10,
                  rs.sm,
                ),
                flexDirection: compact ? 'column' : 'row',
                alignItems: compact ? 'stretch' : 'center',
              },
            ]}>
            <TravelHomeDateBlock startDate={plan.startDate} endDate={plan.endDate} />
            {!compact ? (
              <View
                style={[
                  styles.footerRule,
                  {
                    backgroundColor:
                      theme.name === 'dark'
                        ? 'rgba(255,255,255,0.14)'
                        : travelHomeTokens.colors.divider,
                    // Span the date line + label cluster optical mid — not the full
                    // footer height — so the rule matches the shorter, centered read.
                    height:
                      Platform.OS === 'ios'
                        ? Math.max(28, s(30))
                        : Math.max(24, s(26)),
                  },
                ]}
              />
            ) : null}
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
                  height: buttonHeight,
                  borderRadius: travelHomeTokens.radius.itineraryButton,
                  opacity: pressed ? 0.88 : 1,
                  alignSelf: compact ? 'stretch' : 'center',
                  maxWidth: compact
                    ? undefined
                    : Math.max(168, s(travelHomeTokens.sizes.itineraryButtonMaxWidth + 12)),
                },
              ]}>
              {itineraryFill ? (
                <View
                  style={[
                    styles.itineraryButton,
                    {
                      height: buttonHeight,
                      paddingHorizontal: itineraryPadH,
                      borderRadius: travelHomeTokens.radius.itineraryButton,
                      backgroundColor: itineraryFill,
                      boxShadow: travelHomeTokens.colors.itineraryButtonShadowDark,
                    },
                  ]}>
                  {itineraryContent}
                </View>
              ) : (
                <TravelHomeGlass
                  inverted
                  intensity={44}
                  style={[
                    styles.itineraryButton,
                    {
                      height: buttonHeight,
                      paddingHorizontal: itineraryPadH,
                      borderRadius: travelHomeTokens.radius.itineraryButton,
                      boxShadow: travelHomeTokens.colors.itineraryButtonShadow,
                    },
                  ]}>
                  {itineraryContent}
                </TravelHomeGlass>
              )}
            </Pressable>
          </View>
        </TravelHomeGlass>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  shadow: {
    borderCurve: 'continuous',
  },
  clip: {
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  heroWrap: {
    width: '100%',
  },
  metaPanel: {
    zIndex: 1,
    borderCurve: 'continuous',
  },
  stepperOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    alignItems: 'center',
  },
  stepperSlotCollapsed: {
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
    opacity: 0,
    zIndex: 3,
  },
  body: {
    width: '100%',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  footer: {
    justifyContent: 'space-between',
  },
  footerRule: {
    width: StyleSheet.hairlineWidth,
    flexShrink: 0,
    alignSelf: 'center',
  },
  itineraryHit: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  itineraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 0,
    flexShrink: 0,
    borderCurve: 'continuous',
  },
});
