/**
 * Destination-flavored sky accents for the itinerary header plate.
 * Night is already destination-true (lat/long star projection, aurora gate);
 * these flags add day/night character for recognizable climates. Unknown
 * destinations fall back to the plain weather look (all false).
 */

import {
  DESERT_DESTINATION_RE,
  FOG_DESTINATION_RE,
  normalizeDestinationLabel,
  TROPICAL_ACCENT_DESTINATION_RE,
  TROPICAL_LATITUDE_ABS,
} from '@/features/travel/travel-sky-destination-climate';

export type DestinationSkyAccents = {
  /** Warm tint + long-winged frigatebird silhouettes. */
  tropical: boolean;
  /** Cloudless sun, heat shimmer, denser dark-sky star field. */
  desert: boolean;
  /** Low drifting fog wisps on overcast looks. */
  fog: boolean;
};

export const NO_SKY_ACCENTS: DestinationSkyAccents = {
  tropical: false,
  desert: false,
  fog: false,
};

export function destinationSkyAccents(
  destination: string,
  latitude?: number,
): DestinationSkyAccents {
  const d = normalizeDestinationLabel(destination);
  const desert = d.length > 0 && DESERT_DESTINATION_RE.test(d);
  const fog = d.length > 0 && FOG_DESTINATION_RE.test(d);
  const tropical =
    !desert &&
    ((d.length > 0 && TROPICAL_ACCENT_DESTINATION_RE.test(d)) ||
      (latitude != null && Math.abs(latitude) <= TROPICAL_LATITUDE_ABS));
  return { tropical, desert, fog };
}
