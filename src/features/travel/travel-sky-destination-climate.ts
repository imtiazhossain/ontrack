/**
 * Shared destination climate keyword banks for sky accents + ground kind.
 * Desert is one list (both consumers desert-win). Tropical ground stays
 * narrower than accents so metro hubs like Singapore keep a city skyline.
 */

/** Tropical belt half-width (degrees) — used when the label is unknown. */
export const TROPICAL_LATITUDE_ABS = 23.5;

/** High-latitude band for nordic ground when the label is unknown. */
export const NORDIC_LATITUDE_ABS = 55;

export const DESERT_DESTINATION_RE =
  /sahara|dubai|abu dhabi|doha|riyadh|jeddah|phoenix|scottsdale|tucson|las vegas|palm springs|death valley|joshua tree|mojave|outback|alice springs|atacama|namib|marrakech|marrakesh|cairo|luxor|petra|wadi rum|desert/;

/** Accents: warm tint / frigatebirds — includes tropical metro hubs. */
export const TROPICAL_ACCENT_DESTINATION_RE =
  /hawaii|maui|oahu|kauai|honolulu|bali|phuket|krabi|maldives|fiji|tahiti|bora bora|caribbean|cancun|tulum|cozumel|jamaica|bahamas|barbados|puerto rico|costa rica|rio de janeiro|singapore|bangkok|manila|cebu|zanzibar|seychelles|mauritius|key west|antigua|tropic/;

/** Ground silhouettes: beach/island family only (metro wins for city hubs). */
export const TROPICAL_GROUND_DESTINATION_RE =
  /hawaii|maui|oahu|honolulu|bali|phuket|maldives|fiji|tahiti|caribbean|cancun|tulum|jamaica|bahamas|costa rica|key west|antigua|barbados|zanzibar|seychelles/;

export const FOG_DESTINATION_RE =
  /san francisco|london|lima|chongqing|karl the fog/;

export const NORDIC_DESTINATION_RE =
  /iceland|reykjav|akureyri|norway|oslo|bergen|troms|stockholm|gothenburg|copenhagen|helsinki|lapland|faroe|reykjanes/;

export const ALPINE_DESTINATION_RE =
  /alps|zermatt|chamonix|innsbruck|aspen|banff|whistler|interlaken|st\.?\s*moritz|queenstown|patagonia|rocky mountain/;

export const COASTAL_DESTINATION_RE =
  /santorini|amalfi|nice|cannes|malta|dubrovnik|split|barcelona|lisbon|porto|cape town|sydney|melbourne|vancouver|seattle|miami|san diego|brighton|cornwall/;

export const METRO_DESTINATION_RE =
  /new york|nyc|manhattan|brooklyn|tokyo|osaka|london|paris|berlin|chicago|toronto|singapore|hong kong|seoul|shanghai|beijing|los angeles|la\b|san francisco|boston|washington|dc\b|madrid|rome|milan|dubai|abu dhabi/;

export function normalizeDestinationLabel(destination: string): string {
  return destination.trim().toLowerCase();
}
