/**
 * Destination → ground silhouette family for the itinerary sky plate.
 * Leaf module — keep SVG art out of chrome-color / accent imports.
 */

export type TravelSkyGroundKind =
  | 'nordic'
  | 'tropical'
  | 'desert'
  | 'metro'
  | 'alpine'
  | 'coastal'
  | 'pastoral';

const NORDIC_RE =
  /iceland|reykjav|akureyri|norway|oslo|bergen|troms|stockholm|gothenburg|copenhagen|helsinki|lapland|faroe|reykjanes/;

const ALPINE_RE =
  /alps|zermatt|chamonix|innsbruck|aspen|banff|whistler|interlaken|st\.?\s*moritz|queenstown|patagonia|rocky mountain/;

const COASTAL_RE =
  /santorini|amalfi|nice|cannes|malta|dubrovnik|split|barcelona|lisbon|porto|cape town|sydney|melbourne|vancouver|seattle|miami|san diego|brighton|cornwall/;

const METRO_RE =
  /new york|nyc|manhattan|brooklyn|tokyo|osaka|london|paris|berlin|chicago|toronto|singapore|hong kong|seoul|shanghai|beijing|los angeles|la\b|san francisco|boston|washington|dc\b|madrid|rome|milan|dubai|abu dhabi/;

const DESERT_RE =
  /sahara|dubai|abu dhabi|doha|riyadh|phoenix|scottsdale|las vegas|marrakech|marrakesh|cairo|petra|wadi rum|atacama|namib|outback|alice springs|death valley|mojave|desert/;

const TROPICAL_RE =
  /hawaii|maui|oahu|honolulu|bali|phuket|maldives|fiji|tahiti|caribbean|cancun|tulum|jamaica|bahamas|costa rica|key west|antigua|barbados|zanzibar|seychelles/;

/**
 * Pick a ground silhouette family from the trip destination label.
 * Unknown places get a quiet pastoral ridge (trees + soft hills).
 */
export function resolveTravelSkyGroundKind(
  destination: string,
  latitude?: number,
): TravelSkyGroundKind {
  const d = destination.trim().toLowerCase();
  if (!d) {
    if (latitude != null && Math.abs(latitude) <= 23.5) return 'tropical';
    return 'pastoral';
  }
  if (NORDIC_RE.test(d)) return 'nordic';
  if (DESERT_RE.test(d)) return 'desert';
  if (TROPICAL_RE.test(d)) return 'tropical';
  if (ALPINE_RE.test(d)) return 'alpine';
  if (METRO_RE.test(d)) return 'metro';
  if (COASTAL_RE.test(d)) return 'coastal';
  if (latitude != null && Math.abs(latitude) <= 23.5) return 'tropical';
  if (latitude != null && Math.abs(latitude) >= 55) return 'nordic';
  return 'pastoral';
}
