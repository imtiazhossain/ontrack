import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

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
export function TravelTripCover({ plan }: { plan: TravelPlan }) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const flightTone = chrome.icons.flight;
  const { s } = useResponsive();
  // ~80pt square thumb — matches mock proportion vs the Travel title.
  const size = Math.max(76, s(80));
  const localUri = localTripCoverUri(plan);
  const [uri, setUri] = useState<string | undefined>(localUri);
  const destinationKey = `${plan.id}:${plan.destination}:${plan.title}`;

  useEffect(() => {
    let active = true;
    if (localUri) {
      setUri(localUri);
      return () => {
        active = false;
      };
    }
    setUri(undefined);
    void fetchDestinationCoverUri(plan).then((next) => {
      if (active) setUri(next);
    });
    return () => {
      active = false;
    };
  }, [destinationKey, localUri, plan]);

  return (
    <View
      style={[
        styles.cover,
        {
          width: size,
          height: size,
          borderRadius: Math.max(18, s(18)),
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
