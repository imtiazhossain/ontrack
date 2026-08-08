import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import {
  travelHomeAtmosphereHeaderScrimColors,
  type TravelAtmosphereHeaderInk,
} from '@/features/travel/travel-home-atmosphere-ink';

type TravelHomeAtmosphereScrimProps = {
  /** Plate-aware header ink (`light` = white over dark washes). */
  headerInk: TravelAtmosphereHeaderInk;
  /** Dominant plate color — scales veil strength. */
  averageColor?: string;
};

/**
 * Soft contrast veil for Travel home atmosphere copy.
 * Painted on app-shell chrome (window y=0) so it continues behind the
 * status bar / Dynamic Island — in-screen layers are clipped by SafeAreaView.
 *
 * Uses LinearGradient (not CSS backgroundImage) so the dark wash reliably
 * falls from the top — the paper join below is a separate bottom milk.
 */
export function TravelHomeAtmosphereScrim({
  headerInk,
  averageColor,
}: TravelHomeAtmosphereScrimProps) {
  const colors = travelHomeAtmosphereHeaderScrimColors(headerInk, averageColor);
  if (!colors) return null;

  const [top, mid, low, bottom] = colors;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[top, mid, low, bottom]}
      // Hold through title/tagline/location, then clear before Your Trips.
      locations={[0, 0.4, 0.72, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.fill}
    />
  );
}

/**
 * Chrome overlay height: status-bar inset + header copy band, so the veil
 * covers clock/island through the tagline and soft-fades before Your Trips.
 */
export function travelHomeAtmosphereScrimHeight(topInset: number): number {
  // Title + tagline/location + air under the caption toward Your Trips.
  return topInset + 268;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
