/**
 * Destination-flavored sky accents for the itinerary header plate.
 * Night is already destination-true (lat/long star projection, aurora gate);
 * these flags add day/night character for recognizable climates. Unknown
 * destinations fall back to the plain weather look (all false).
 */
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

const DESERT_RE =
  /sahara|dubai|abu dhabi|doha|riyadh|jeddah|phoenix|scottsdale|tucson|las vegas|palm springs|death valley|joshua tree|mojave|outback|alice springs|atacama|namib|marrakech|marrakesh|cairo|luxor|petra|wadi rum|desert/;

const FOG_RE =
  /san francisco|london|lima|chongqing|karl the fog/;

const TROPICAL_RE =
  /hawaii|maui|oahu|kauai|honolulu|bali|phuket|krabi|maldives|fiji|tahiti|bora bora|caribbean|cancun|tulum|cozumel|jamaica|bahamas|barbados|puerto rico|costa rica|rio de janeiro|singapore|bangkok|manila|cebu|zanzibar|seychelles|mauritius|key west|tropic/;

export function destinationSkyAccents(
  destination: string,
  latitude?: number,
): DestinationSkyAccents {
  const d = destination.trim().toLowerCase();
  const desert = d.length > 0 && DESERT_RE.test(d);
  const fog = d.length > 0 && FOG_RE.test(d);
  const tropical =
    !desert &&
    ((d.length > 0 && TROPICAL_RE.test(d)) ||
      (latitude != null && Math.abs(latitude) <= 23.5));
  return { tropical, desert, fog };
}
