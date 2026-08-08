import {
  DESTINATION_ICONIC_DRAW_SUFFIXES,
  resolveIconicCoverQueries,
} from '@/features/travel/destination-cover-icons';
import {
  travelWeatherMood,
  type TravelTimeOfDay,
  type TravelWeatherMood,
} from '@/features/travel/travel-atmosphere-model';

export type TravelHomeAtmosphereMode = 'home' | 'trip';

export type TravelHomeAtmosphereQueryInput = {
  mode: TravelHomeAtmosphereMode;
  timeOfDay: TravelTimeOfDay;
  weatherCode?: number;
  /**
   * Trip destination when mode is `trip`.
   * Prefer `destinations` when multiple trips should rotate into the pool.
   */
  destination?: string;
  /** All trip place labels — atmosphere rotates across every location. */
  destinations?: readonly string[];
  /**
   * Profile home location — joins the same rotation pool as trip destinations
   * (and seeds place-aware queries when it is the only place).
   */
  homeLabel?: string;
};

/** Trip destinations + profile home, deduped, for atmosphere rotation. */
export function mergeAtmospherePlaces(
  destinations: readonly (string | undefined)[] = [],
  homeLabel?: string,
): string[] {
  return normalizeTripAtmosphereDestinations([...destinations, homeLabel]);
}

/** Stable recent-history key for a trip place so locations rotate fairly. */
export function atmosphereDestinationKey(destination: string): string {
  return `dest:${destination.replace(/\s+/g, ' ').trim().toLowerCase()}`;
}

/** Unique trip place labels (destination, else title), order preserved. */
export function normalizeTripAtmosphereDestinations(
  labels: readonly (string | undefined)[],
): string[] {
  return uniqueQueries(
    labels.map((label) => label?.replace(/\s+/g, ' ').trim() ?? ''),
  );
}

/**
 * Pick which trip location drives this open.
 * Prefers destinations not recently shown so every trip place gets airtime.
 */
export function pickAtmosphereDestination(
  destinations: readonly string[],
  recentKeys: readonly string[] = [],
  salt = 0,
): string | undefined {
  const pool = normalizeTripAtmosphereDestinations(destinations);
  if (pool.length === 0) return undefined;
  const keys = pool.map(atmosphereDestinationKey);
  const index = pickRotatingIndex(pool.length, recentKeys, keys, salt);
  return pool[index];
}

const TIME_SCENES: Record<TravelTimeOfDay, string[]> = {
  dawn: ['sunrise', 'golden hour', 'dawn sky'],
  day: ['daylight', 'blue sky', 'midday light'],
  dusk: ['sunset', 'golden hour', 'dusk'],
  night: ['night', 'starry sky', 'city lights night'],
};

const WEATHER_SCENES: Record<TravelWeatherMood, string[]> = {
  clear: ['clear sky', 'sunny landscape'],
  cloudy: ['cloudy sky', 'overcast landscape'],
  fog: ['foggy landscape', 'mist mountains'],
  rain: ['rainy street', 'wet pavement travel'],
  snow: ['snowy mountains', 'winter landscape'],
  storm: ['dramatic storm sky', 'thunderclouds'],
  mixed: ['travel landscape'],
};

const WANDERLUST_BASE = [
  'travel landscape mountains',
  'scenic coastline travel',
  'aerial city travel',
  'desert dunes travel',
  'tropical beach travel',
  'alpine lake travel',
] as const;

function uniqueQueries(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const next = value.replace(/\s+/g, ' ').trim();
    if (next.length < 2) continue;
    if (out.some((existing) => existing.toLowerCase() === next.toLowerCase())) {
      continue;
    }
    out.push(next);
  }
  return out;
}

/** Ordered remote search queries for the Travel home atmosphere band. */
export function travelHomeAtmosphereSearchQueries(
  input: TravelHomeAtmosphereQueryInput,
): string[] {
  const mood = travelWeatherMood(input.weatherCode);
  const timeWords = TIME_SCENES[input.timeOfDay];
  const weatherWords = WEATHER_SCENES[mood];
  const destination = input.destination?.replace(/\s+/g, ' ').trim();
  const home = input.homeLabel?.trim();

  if (input.mode === 'trip' && destination) {
    const iconic = resolveIconicCoverQueries(destination);
    // Night / dusk → boost aurora-style draws when the pack includes them.
    const nightBoost =
      input.timeOfDay === 'night' || input.timeOfDay === 'dusk'
        ? iconic.filter((query) =>
            /aurora|northern\s+lights|night/i.test(query),
          )
        : [];
    const drawSuffixes = DESTINATION_ICONIC_DRAW_SUFFIXES.map(
      (suffix) => `${destination} ${suffix}`,
    );
    return uniqueQueries([
      ...nightBoost,
      ...iconic,
      ...drawSuffixes,
      // Weather/time flavor stays lower so street-weather stock does not win.
      `${destination} ${timeWords[0]} landscape`,
      `${destination} ${weatherWords[0]}`,
      destination,
    ]);
  }

  const homeIconic =
    home && home.length >= 2 ? resolveIconicCoverQueries(home) : [];
  const homeFlavor =
    home && home.length >= 2
      ? [
          ...homeIconic,
          ...DESTINATION_ICONIC_DRAW_SUFFIXES.map(
            (suffix) => `${home} ${suffix}`,
          ),
          `${home} ${timeWords[0]} skyline`,
        ]
      : [];

  return uniqueQueries([
    ...homeFlavor,
    `${WANDERLUST_BASE[0]} ${timeWords[0]} ${weatherWords[0]}`,
    `${WANDERLUST_BASE[1]} ${timeWords[0]}`,
    `${WANDERLUST_BASE[2]} ${weatherWords[0]}`,
    `${WANDERLUST_BASE[3]} ${timeWords[1] ?? timeWords[0]}`,
    `${WANDERLUST_BASE[4]} ${timeWords[0]}`,
    `${WANDERLUST_BASE[5]} ${weatherWords[0]}`,
    `wanderlust ${timeWords[0]} travel photography`,
  ]);
}

/** Pick an index that prefers unseen keys, then wraps. */
export function pickRotatingIndex(
  length: number,
  recentKeys: readonly string[],
  candidateKeys: readonly string[],
  salt = 0,
): number {
  if (length <= 0) return 0;
  const recent = new Set(recentKeys.map((key) => key.toLowerCase()));
  const freshIndexes: number[] = [];
  for (let index = 0; index < length; index += 1) {
    const key = candidateKeys[index]?.toLowerCase();
    if (!key || !recent.has(key)) freshIndexes.push(index);
  }
  const pool = freshIndexes.length > 0 ? freshIndexes : [...Array(length).keys()];
  return pool[Math.abs(salt) % pool.length] ?? 0;
}

/** Keep the newest keys first, capped. */
export function rememberRecentKeys(
  previous: readonly string[],
  nextKey: string,
  limit = 8,
): string[] {
  const normalized = nextKey.trim();
  if (!normalized) return [...previous];
  const lower = normalized.toLowerCase();
  const rest = previous.filter((key) => key.toLowerCase() !== lower);
  return [normalized, ...rest].slice(0, Math.max(1, limit));
}
