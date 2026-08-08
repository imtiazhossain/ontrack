import type { ImageSource } from 'expo-image';

import { fetchPlaceCoverUris } from '@/features/travel/destination-cover';
import {
  DESTINATION_COVER_POOL_MAX,
  peekUnsplashCoverColor,
} from '@/features/travel/destination-cover-lookup';
import {
  travelWeatherMood,
  type TravelTimeOfDay,
} from '@/features/travel/travel-atmosphere-model';
import {
  TRAVEL_HOME_CURATED_ATMOSPHERE,
  curatedAtmosphereKey,
  filterCuratedAtmosphere,
} from '@/features/travel/travel-home-atmosphere-catalog';
import type { TravelAtmosphereHeaderInk } from '@/features/travel/travel-home-atmosphere-ink';
import {
  atmosphereDestinationKey,
  mergeAtmospherePlaces,
  pickAtmosphereDestination,
  pickRotatingIndex,
  travelHomeAtmosphereSearchQueries,
  type TravelHomeAtmosphereQueryInput,
} from '@/features/travel/travel-home-atmosphere-queries';

export type TravelHomeAtmosphereImage = {
  key: string;
  source: ImageSource;
  origin: 'remote' | 'curated';
  /** Place caption for the plate when known (curated label or trip destination). */
  label?: string;
  /** Recent-history key for the trip place that drove this plate (if any). */
  destinationKey?: string;
  /** Dominant / average plate color (`#RRGGBB`) when known. */
  averageColor?: string;
  /** Curated plates may pin preferred header ink. */
  curatedHeaderTone?: TravelAtmosphereHeaderInk;
};

export type ResolveTravelHomeAtmosphereOptions = TravelHomeAtmosphereQueryInput & {
  recentKeys?: readonly string[];
  /** Session salt so remounts rotate even when the pool is cached. */
  salt?: number;
  /** Injected for tests — defaults to live cover lookup. */
  fetchPool?: (queries: string[]) => Promise<string[]>;
};

function remoteKey(uri: string): string {
  return `remote:${uri.trim()}`;
}

function resolveAtmospherePlace(
  options: ResolveTravelHomeAtmosphereOptions,
): string | undefined {
  const places = mergeAtmospherePlaces(options.destinations, options.homeLabel);
  const fromList = pickAtmosphereDestination(
    places,
    options.recentKeys ?? [],
    options.salt ?? 0,
  );
  if (fromList) return fromList;
  const single = options.destination?.replace(/\s+/g, ' ').trim();
  return single && single.length >= 2 ? single : undefined;
}

export function pickCuratedTravelHomeAtmosphere(
  timeOfDay: TravelTimeOfDay,
  weatherCode: number | undefined,
  recentKeys: readonly string[] = [],
  salt = 0,
): TravelHomeAtmosphereImage {
  const mood = travelWeatherMood(weatherCode);
  const pool = filterCuratedAtmosphere(
    TRAVEL_HOME_CURATED_ATMOSPHERE,
    timeOfDay,
    mood,
  );
  const keys = pool.map(curatedAtmosphereKey);
  const index = pickRotatingIndex(pool.length, recentKeys, keys, salt);
  const item = pool[index] ?? TRAVEL_HOME_CURATED_ATMOSPHERE[0]!;
  return {
    key: curatedAtmosphereKey(item),
    source: item.source,
    origin: 'curated',
    label: item.label,
    averageColor: item.averageColor,
    curatedHeaderTone: item.headerTone,
  };
}

/**
 * Live remote atmosphere for Travel home.
 * Rotates across every trip destination and the profile home location;
 * falls back to curated plates when the network pool is empty.
 */
export async function resolveTravelHomeAtmosphereImage(
  options: ResolveTravelHomeAtmosphereOptions,
): Promise<TravelHomeAtmosphereImage> {
  const recentKeys = options.recentKeys ?? [];
  const salt = options.salt ?? Date.now();
  const place = resolveAtmospherePlace(options);
  const mode = place ? 'trip' : options.mode;
  const queries = travelHomeAtmosphereSearchQueries({
    ...options,
    mode,
    destination: place,
    // Home is already in the place pool when selected; avoid double-flavor
    // wanderlust queries for a specific place plate.
    homeLabel: place ? undefined : options.homeLabel,
  });
  // Larger pool so iconic draws (aurora, peaks, lagoons) can rotate in —
  // not just the first 3 weather/street hits.
  const fetchPool =
    options.fetchPool ??
    ((nextQueries: string[]) =>
      fetchPlaceCoverUris(nextQueries, DESTINATION_COVER_POOL_MAX));

  const destinationKey = place ? atmosphereDestinationKey(place) : undefined;

  try {
    const pool = await fetchPool(queries);
    if (pool.length > 0) {
      const keys = pool.map(remoteKey);
      const index = pickRotatingIndex(pool.length, recentKeys, keys, salt + 11);
      const uri = pool[index]!;
      return {
        key: remoteKey(uri),
        source: { uri },
        origin: 'remote',
        label: place,
        destinationKey,
        averageColor: peekUnsplashCoverColor(uri),
      };
    }
  } catch {
    // Curated fallback below.
  }

  const curated = pickCuratedTravelHomeAtmosphere(
    options.timeOfDay,
    options.weatherCode,
    recentKeys,
    salt,
  );
  // Still credit the chosen place so rotation advances even on fallback.
  return destinationKey
    ? { ...curated, destinationKey, label: curated.label ?? place }
    : curated;
}
