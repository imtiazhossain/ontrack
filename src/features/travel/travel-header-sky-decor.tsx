import { StyleSheet, View } from 'react-native';

import { resolveHeaderSkyCondition } from '@/features/travel/travel-sky-condition';
import { TravelSkyDay } from '@/features/travel/travel-sky-day';
import { TravelSkyNight } from '@/features/travel/travel-sky-night';
import { SKY_VIEW_H } from '@/features/travel/travel-sky-plate';
import { useTiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';
import type { TravelTimeOfDay } from '@/features/travel/travel-atmosphere-model';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

/**
 * Theme + weather sky for itinerary headers.
 * Painted in the header band (dynamic art). Status bar uses a matching static
 * wash via `headerSkyChromeColor` so stack fills cannot hide the scenery.
 * Night: projected stars, phase moon, satellites, meteors, aurora.
 * Day: sun rays / clouds / flocking birds with dawn/dusk palettes.
 * Both: rain/lightning FX and destination accents (tropical/desert/fog).
 *
 * @param statusBandRatio Fraction reserved above celestial bodies (0 when the
 *   plate is header-only).
 */
export function TravelHeaderSkyDecor({
  statusBandRatio = 0.35,
  destination = '',
  dateKey = '',
  latitude,
  longitude,
  timeOfDay,
  weatherCode,
  timezone,
}: {
  statusBandRatio?: number;
  destination?: string;
  dateKey?: string;
  latitude?: number;
  longitude?: number;
  timeOfDay?: TravelTimeOfDay;
  weatherCode?: number;
  timezone?: string;
} = {}) {
  const theme = useTheme();
  const dark = theme.name === 'dark';
  const motion = useTiltSkyMotion();
  const statusBand = Math.max(0, Math.min(0.55, statusBandRatio)) * SKY_VIEW_H;
  const condition = resolveHeaderSkyCondition({
    themeDark: dark,
    timeOfDay,
    weatherCode,
    timezone,
    destination,
    latitude,
  });
  const night =
    dark ||
    condition.look.startsWith('night') ||
    condition.timeOfDay === 'night';

  return (
    <AgentTestId
      testID={AgentUiIds.travel.chrome.skyDecor}
      style={styles.host}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.fill}>
        {night ? (
          <TravelSkyNight
            condition={condition}
            destination={destination}
            dateKey={dateKey}
            latitude={latitude}
            longitude={longitude}
            statusBand={statusBand}
            motion={motion}
          />
        ) : (
          <TravelSkyDay
            condition={condition}
            statusBand={statusBand}
            motion={motion}
          />
        )}
      </View>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
