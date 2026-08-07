import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { TravelHeaderSkyDecor } from '@/features/travel/travel-header-sky-decor';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

const FLIGHT_PATH_FLOURISH = require('../../../assets/images/travel/flight-path-flourish.png');

/**
 * Compact hero flourish — provided plane + trail asset, behind title copy.
 */
export function TravelFlightPathArc() {
  const { s } = useResponsive();
  // Asset is ~2.4:1 — keep it small so it sits in the pin-row space.
  const width = Math.max(88, s(96));
  const height = Math.max(36, s(40));

  return (
    <AgentTestId testID={AgentUiIds.travel.chrome.flightPath}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.host, { width, height }]}>
        <Image
          source={FLIGHT_PATH_FLOURISH}
          resizeMode="contain"
          style={styles.image}
        />
      </View>
    </AgentTestId>
  );
}

/**
 * Places {@link TravelFlightPathArc} behind header copy (title / pin / subtitle).
 * Use around custom travel header text columns; prefer `TravelScreenHeader` for
 * standard `ScreenHeader` pages.
 */
export function TravelHeaderFlourish({
  children,
  style,
  contentStyle,
  /** When false, caller paints {@link TravelHeaderSkyDecor} on a wider row. */
  sky = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Applied to the foreground title stack (gap, padding). */
  contentStyle?: StyleProp<ViewStyle>;
  sky?: boolean;
}) {
  return (
    <View style={[styles.wrap, style]}>
      {sky ? (
        <View style={styles.skyBehind} pointerEvents="none">
          <TravelHeaderSkyDecor />
        </View>
      ) : null}
      <View style={styles.flourishBehind} pointerEvents="none">
        <TravelFlightPathArc />
      </View>
      <View style={[styles.foreground, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flexShrink: 0,
    zIndex: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  wrap: {
    position: 'relative',
    overflow: 'visible',
    minWidth: 0,
    flexShrink: 1,
  },
  skyBehind: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  flourishBehind: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  foreground: {
    zIndex: 1,
    elevation: 1,
    minWidth: 0,
  },
});
