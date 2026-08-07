/**
 * Destination → ground silhouette family for the itinerary sky plate.
 * Leaf module — keep SVG art out of chrome-color / accent imports.
 */

import {
  ALPINE_DESTINATION_RE,
  COASTAL_DESTINATION_RE,
  DESERT_DESTINATION_RE,
  METRO_DESTINATION_RE,
  NORDIC_DESTINATION_RE,
  NORDIC_LATITUDE_ABS,
  normalizeDestinationLabel,
  TROPICAL_GROUND_DESTINATION_RE,
  TROPICAL_LATITUDE_ABS,
} from '@/features/travel/travel-sky-destination-climate';

export type TravelSkyGroundKind =
  | 'nordic'
  | 'tropical'
  | 'desert'
  | 'metro'
  | 'alpine'
  | 'coastal'
  | 'pastoral';

/**
 * Pick a ground silhouette family from the trip destination label.
 * Unknown places get a quiet pastoral ridge (trees + soft hills).
 */
export function resolveTravelSkyGroundKind(
  destination: string,
  latitude?: number,
): TravelSkyGroundKind {
  const d = normalizeDestinationLabel(destination);
  if (!d) {
    if (latitude != null && Math.abs(latitude) <= TROPICAL_LATITUDE_ABS) {
      return 'tropical';
    }
    return 'pastoral';
  }
  if (NORDIC_DESTINATION_RE.test(d)) return 'nordic';
  if (DESERT_DESTINATION_RE.test(d)) return 'desert';
  if (TROPICAL_GROUND_DESTINATION_RE.test(d)) return 'tropical';
  if (ALPINE_DESTINATION_RE.test(d)) return 'alpine';
  if (METRO_DESTINATION_RE.test(d)) return 'metro';
  if (COASTAL_DESTINATION_RE.test(d)) return 'coastal';
  if (latitude != null && Math.abs(latitude) <= TROPICAL_LATITUDE_ABS) {
    return 'tropical';
  }
  if (latitude != null && Math.abs(latitude) >= NORDIC_LATITUDE_ABS) {
    return 'nordic';
  }
  return 'pastoral';
}
