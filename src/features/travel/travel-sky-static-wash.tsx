import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import type { HeaderSkyLook } from '@/features/travel/travel-sky-condition';

/**
 * Lowest-fidelity itinerary sky — a static gradient “image” of the look.
 * Used when the device cannot host the SVG / Reanimated plate.
 */
export function TravelSkyStaticWash({
  chrome,
  look,
  night,
  fadeTo,
}: {
  chrome: string;
  look: HeaderSkyLook;
  night: boolean;
  fadeTo: string;
}) {
  const mid = midStopForLook(look, night, chrome);
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[chrome, mid, fadeTo]}
      locations={night ? [0, 0.55, 1] : [0, 0.48, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

function midStopForLook(
  look: HeaderSkyLook,
  night: boolean,
  chrome: string,
): string {
  if (night) {
    if (look.includes('storm') || look.includes('rain')) return '#152033';
    if (look.includes('cloudy')) return '#141C2C';
    return '#152238';
  }
  switch (look) {
    case 'sunrise':
      return '#F0C4A0';
    case 'sunset':
      return '#E0A888';
    case 'cloudy':
    case 'rain':
    case 'storm':
      return '#C5D2DE';
    default:
      return chrome;
  }
}
