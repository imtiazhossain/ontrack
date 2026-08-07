import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/primitives';
import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import { TravelHomeDateBlock } from '@/features/travel/travel-home-date-block';
import { TravelHomeHeroCarousel } from '@/features/travel/travel-home-hero-carousel';
import {
    TravelHomeChevronRight,
    TravelHomeLocationPin,
    TravelHomeRouteIcon,
} from '@/features/travel/travel-home-icons';
import {
    travelHomeFontFamily,
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
  const ink =
    theme.name === 'dark' ? theme.textPrimary : travelHomeTokens.colors.ink;
  const muted =
    theme.name === 'dark' ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const brand =
    theme.name === 'dark' ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const titleSize = Math.max(24, s(travelHomeTokens.sizes.tripTitle));
  const compact = layoutWidth < 360;
  const radius = travelHomeTokens.radius.tripCard;

  const openHub = () => {
    haptics.tap();
    onOpenTrip(plan.id);
  };
  const viewItinerary = () => {
    haptics.tap();
    onViewItinerary(plan.id);
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
  // Light: navy fill + white ink. Dark: location-pin blue fill + navy ink.
  const dark = theme.name === 'dark';
  const itineraryFg = dark
    ? travelHomeTokens.colors.countCircle
    : '#FFFFFF';
  const itineraryBg = dark ? brand : travelHomeTokens.colors.countCircle;
  const itineraryBorder = dark ? brand : travelHomeTokens.colors.countCircle;

  return (
    // Shadow and overflow:hidden cannot share one view on iOS — split so the
    // large mock corner radii actually clip the destination hero.
    <View
      onLayout={(event) => {
        const { width, y } = event.nativeEvent.layout;
        if (width > 0 && Math.abs(width - cardWidth) > 1) setCardWidth(width);
        onLayoutY?.(plan.id, y);
      }}
      style={[
        styles.shadow,
        {
          borderRadius: radius,
          boxShadow:
            theme.name === 'dark'
              ? travelHomeTokens.colors.cardShadowDark
              : travelHomeTokens.colors.cardShadow,
          width: '100%',
        },
      ]}>
      <View
        style={[
          styles.clip,
          {
            backgroundColor: theme.name === 'light' ? '#FFFFFF' : theme.backgroundElevated,
            borderRadius: radius,
          },
        ]}>
        <TravelHomeHeroCarousel
          plan={plan}
          width={cardWidth}
          onEdit={() => onEditTrip(plan.id)}
          onActiveImageChange={(uri) => onActiveImageChange?.(plan.id, uri)}
        />

        {/*
          White meta panel overlaps the hero with large top radii — the curves
          in the user mock (photo shows through the corner wedges).
        */}
        <View
          style={[
            styles.metaPanel,
            {
              marginTop: -travelHomeTokens.spacing.bodyOverlap,
              borderTopLeftRadius: travelHomeTokens.radius.bodyTop,
              borderTopRightRadius: travelHomeTokens.radius.bodyTop,
              backgroundColor:
                theme.name === 'light' ? '#FFFFFF' : theme.backgroundElevated,
            },
          ]}>
          <AgentTestId
            testID={AgentUiIds.travel.list.openHub(plan.id)}
            label={`Open ${plan.title}`}
            onPress={openHub}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${plan.title}`}
              onPress={openHub}
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
                paddingBottom: travelHomeTokens.spacing.cardBottom,
                paddingTop: travelHomeTokens.spacing.dividerToMeta,
                gap: Math.max(10, rs.sm),
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
                    height: Math.max(28, s(32)),
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
                styles.itineraryButton,
                {
                  height: buttonHeight,
                  paddingHorizontal: Math.max(
                    12,
                    s(travelHomeTokens.sizes.itineraryHorizontalPadding),
                  ),
                  borderRadius: travelHomeTokens.radius.itineraryButton,
                  backgroundColor: itineraryBg,
                  borderColor: itineraryBorder,
                  boxShadow: travelHomeTokens.colors.itineraryButtonShadow,
                  opacity: pressed ? 0.88 : 1,
                  alignSelf: compact ? 'stretch' : 'center',
                  maxWidth: compact
                    ? undefined
                    : Math.max(168, s(travelHomeTokens.sizes.itineraryButtonMaxWidth + 12)),
                },
              ]}>
              <TravelHomeRouteIcon
                size={Math.max(16, s(travelHomeTokens.sizes.itineraryIcon))}
                color={itineraryFg}
              />
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
              <TravelHomeChevronRight
                size={Math.max(14, s(15))}
                color={itineraryFg}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
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
  metaPanel: {
    zIndex: 1,
    borderCurve: 'continuous',
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
  itineraryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    flexGrow: 0,
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
