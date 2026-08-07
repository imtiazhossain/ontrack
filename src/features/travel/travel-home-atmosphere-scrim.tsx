import { StyleSheet, View } from 'react-native';

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
 */
export function TravelHomeAtmosphereScrim({
  headerInk,
  averageColor,
}: TravelHomeAtmosphereScrimProps) {
  const colors = travelHomeAtmosphereHeaderScrimColors(headerInk, averageColor);
  if (!colors) return null;

  const [top, mid, low, bottom] = colors;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fill,
        {
          // Hold opacity through title + tagline, then soft-fade into the photo.
          experimental_backgroundImage: `linear-gradient(to bottom, ${top} 0%, ${mid} 42%, ${low} 72%, ${bottom} 100%)`,
        },
      ]}
    />
  );
}

/**
 * Chrome overlay height: status-bar inset + header copy band, so the veil
 * covers clock/island through the tagline and soft-fades before Your Trips.
 */
export function travelHomeAtmosphereScrimHeight(topInset: number): number {
  // Title + tagline/location (up to 2 lines) + air under the caption.
  return topInset + 194;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
