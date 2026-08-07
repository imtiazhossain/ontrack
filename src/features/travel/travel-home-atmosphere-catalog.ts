import type { ImageSource } from 'expo-image';

import type {
  TravelTimeOfDay,
  TravelWeatherMood,
} from '@/features/travel/travel-atmosphere-model';
import type { TravelAtmosphereHeaderInk } from '@/features/travel/travel-home-atmosphere-ink';

export type TravelHomeCuratedAtmosphere = {
  id: string;
  source: ImageSource;
  timeOfDay: readonly TravelTimeOfDay[];
  weatherMood: readonly TravelWeatherMood[];
  /** Human place label for the plate when known — omit for generic scenes. */
  label?: string;
  /** Preferred header ink over this plate (`light` = white text). */
  headerTone?: TravelAtmosphereHeaderInk;
  /** Representative average color for luminance-based header ink. */
  averageColor?: string;
};

/**
 * Offline / miss fallback pool for the Travel home header wash.
 * Bundled scenic plates only — remote live photos are resolved separately.
 */
export const TRAVEL_HOME_CURATED_ATMOSPHERE: readonly TravelHomeCuratedAtmosphere[] = [
  {
    id: 'mountains-day',
    source: require('../../../assets/images/travel/header-atmosphere-v2.png'),
    timeOfDay: ['dawn', 'day', 'dusk'],
    weatherMood: ['clear', 'cloudy', 'fog', 'mixed'],
    headerTone: 'dark',
    averageColor: '#C9D6E5',
  },
  {
    id: 'aurora-night',
    source: require('../../../assets/images/travel/header-atmosphere-iceland-aurora.png'),
    timeOfDay: ['dusk', 'night'],
    weatherMood: ['clear', 'cloudy', 'snow', 'mixed', 'storm'],
    label: 'Iceland',
    headerTone: 'light',
    averageColor: '#021734',
  },
  {
    id: 'iceland-coast',
    source: require('../../../assets/images/travel/fixtures/iceland-hero.jpg'),
    timeOfDay: ['dawn', 'day', 'dusk', 'night'],
    weatherMood: ['clear', 'cloudy', 'fog', 'rain', 'snow', 'storm', 'mixed'],
    label: 'Reykjavík, Iceland',
    headerTone: 'dark',
    averageColor: '#B7C4D4',
  },
  {
    id: 'antigua-volcano',
    source: require('../../../assets/images/travel/fixtures/antigua-hero.jpg'),
    timeOfDay: ['dawn', 'day', 'dusk'],
    weatherMood: ['clear', 'cloudy', 'mixed', 'rain', 'storm'],
    label: 'Antigua, Guatemala',
    headerTone: 'dark',
    averageColor: '#8FA9C4',
  },
  {
    id: 'third-wander',
    source: require('../../../assets/images/travel/fixtures/third-hero.jpg'),
    timeOfDay: ['dawn', 'day', 'dusk', 'night'],
    weatherMood: ['clear', 'cloudy', 'fog', 'rain', 'snow', 'mixed'],
    headerTone: 'dark',
    averageColor: '#A8B7C8',
  },
] as const;

export function filterCuratedAtmosphere(
  catalog: readonly TravelHomeCuratedAtmosphere[],
  timeOfDay: TravelTimeOfDay,
  weatherMood: TravelWeatherMood,
): TravelHomeCuratedAtmosphere[] {
  const matched = catalog.filter(
    (item) =>
      item.timeOfDay.includes(timeOfDay) && item.weatherMood.includes(weatherMood),
  );
  return matched.length > 0 ? [...matched] : [...catalog];
}

export function curatedAtmosphereKey(item: TravelHomeCuratedAtmosphere): string {
  return `curated:${item.id}`;
}
