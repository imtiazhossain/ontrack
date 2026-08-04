import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Symbol } from '@/components/primitives';
import {
  fetchDestinationCoverUri,
  localTripCoverUri,
} from '@/features/travel/destination-cover';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Trip thumbnail — moment photo, destination landscape, or flight fallback. */
export function TravelTripCover({
  plan,
  width,
  height,
  borderRadius,
}: {
  plan: TravelPlan;
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const flightTone = chrome.icons.flight;
  const { s } = useResponsive();
  const size = Math.max(88, s(96));
  const resolvedRadius = borderRadius ?? Math.max(16, s(18));
  const localUri = localTripCoverUri(plan);
  const [uri, setUri] = useState<string | undefined>(localUri);
  const destinationKey = `${plan.id}:${plan.destination}:${plan.title}`;

  useEffect(() => {
    let active = true;
    if (localUri) return () => {
      active = false;
    };
    // Key on destination fields only — `plan` identity churn (weather/sync) must not abort.
    void fetchDestinationCoverUri(plan).then((next) => {
      if (active) setUri(next);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- destinationKey covers plan fields used for remote covers
  }, [destinationKey, localUri]);

  return (
    <View
      style={[
        styles.cover,
        {
          width: width ?? size,
          height: height ?? size,
          borderRadius: resolvedRadius,
          backgroundColor: flightTone.bg,
        },
      ]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          recyclingKey={uri}
        />
      ) : (
        <Symbol name="flight" size="md" color={flightTone.fg} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
});
