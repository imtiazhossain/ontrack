import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import {
    TravelHomePlusIcon,
    TravelHomeRouteFlourish,
} from '@/features/travel/travel-home-icons';
import {
    travelHomeFontFamily,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

type TravelHomeHeaderProps = {
  onAddTrip?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Compact Travel Home header — title, tagline, route motif, FAB +. */
export function TravelHomeHeader({ onAddTrip, style }: TravelHomeHeaderProps) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const ink =
    theme.name === 'dark' ? theme.textPrimary : travelHomeTokens.colors.ink;
  const muted =
    theme.name === 'dark' ? theme.textSecondary : travelHomeTokens.colors.inkMuted;
  const brand =
    theme.name === 'dark' ? theme.accentPrimary : travelHomeTokens.colors.brandBlue;
  const addVisual = Math.max(44, s(travelHomeTokens.sizes.addButton));
  const addHit = Math.max(travelHomeTokens.sizes.touchTargetMin, addVisual);
  const titleSize = Math.max(42, s(travelHomeTokens.sizes.displayTitle));
  const taglineSize = Math.max(13, s(travelHomeTokens.type.heroTagline));
  const titleToTagline = Math.max(6, s(travelHomeTokens.type.titleToTaglineGap));
  /** Clear air between trail tip and the add FAB. */
  const trailButtonGap = Math.max(12, s(14));
  /** Keep the plane off the title ink — shortens the flex trail. */
  const titlePlaneGap = Math.max(14, s(18));
  const planeSize = Math.max(30, s(34));
  /** Tall enough for the kit mock S (trough + crest) without vertical crush. */
  const flourishHeight = Math.max(40, s(44));
  /**
   * Title allows Dynamic Type up to 1.15× — line box must clear the scaled
   * serif caps or iOS clips the top of “Travel” (and the row/FAB with it).
   */
  const titleMaxMultiplier = 1.15;
  const titleLineHeight = Math.round(titleSize * titleMaxMultiplier * 1.12);
  const [flourishWidth, setFlourishWidth] = useState(0);

  return (
    <View
      style={[
        styles.root,
        {
          gap: Math.max(2, rs.xs - 1),
          // Keep the first ink/FAB below the ScrollView clip edge.
          paddingTop: Math.max(4, rs.xs),
          paddingBottom: travelHomeTokens.spacing.headerBottom,
        },
        style,
      ]}>
      <View style={styles.topRow}>
        <Text
          allowFontScaling
          maxFontSizeMultiplier={titleMaxMultiplier}
          numberOfLines={1}
          style={{
            color: ink,
            fontFamily: travelHomeFontFamily,
            fontSize: titleSize,
            lineHeight: titleLineHeight,
            fontWeight: '400',
            letterSpacing: 0,
            includeFontPadding: false,
            flexShrink: 0,
            zIndex: 1,
          }}>
          Travel
        </Text>

        <View
          pointerEvents="none"
          onLayout={(event) => {
            const next = Math.round(event.nativeEvent.layout.width);
            if (next > 0 && next !== flourishWidth) setFlourishWidth(next);
          }}
          style={[
            styles.motifBand,
            {
              height: flourishHeight,
              marginLeft: titlePlaneGap,
              marginRight: onAddTrip ? trailButtonGap : 0,
            },
          ]}>
          {flourishWidth > 0 ? (
            <TravelHomeRouteFlourish
              width={flourishWidth}
              planeSize={planeSize}
              height={flourishHeight}
              color={travelHomeTokens.colors.motifTan}
            />
          ) : null}
        </View>

        {onAddTrip ? (
          <AgentTestId
            testID={AgentUiIds.travel.newTrip.open}
            label="Add trip"
            onPress={() => {
              haptics.tap();
              onAddTrip();
            }}
            style={[styles.addWrap, { width: addHit, height: addHit }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add trip"
              onPress={() => {
                haptics.tap();
                onAddTrip();
              }}
              hitSlop={4}
              style={({ pressed }) => [
                styles.addButton,
                {
                  width: addVisual,
                  height: addVisual,
                  borderRadius: addVisual / 2,
                  backgroundColor:
                    theme.name === 'dark' ? theme.backgroundElevated : '#FFFFFF',
                  borderColor:
                    theme.name === 'dark'
                      ? theme.separator
                      : travelHomeTokens.colors.circleFabBorder,
                  opacity: pressed ? 0.84 : 1,
                  boxShadow:
                    theme.name === 'dark'
                      ? undefined
                      : travelHomeTokens.colors.circleFabShadow,
                },
              ]}>
              <TravelHomePlusIcon
                size={Math.max(18, s(20))}
                color={theme.name === 'dark' ? brand : travelHomeTokens.colors.ink}
              />
            </Pressable>
          </AgentTestId>
        ) : null}
      </View>

      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.15}
        numberOfLines={1}
        style={{
          color: muted,
          fontFamily: travelHomeFontFamily,
          fontSize: taglineSize,
          lineHeight: Math.round(taglineSize * 1.28),
          fontWeight: '400',
          letterSpacing: 0,
          includeFontPadding: false,
          marginTop: titleToTagline,
        }}>
        Plan. Explore. Remember.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  motifBand: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  addWrap: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
