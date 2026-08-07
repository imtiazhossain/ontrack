import {
  travelTimeOfDay,
  travelWeatherMood,
  type TravelTimeOfDay,
  type TravelWeatherMood,
} from '@/features/travel/travel-atmosphere-model';
import {
  destinationSkyAccents,
  NO_SKY_ACCENTS,
  type DestinationSkyAccents,
} from '@/features/travel/travel-sky-accents';
import { destinationShowsAurora } from '@/features/travel/travel-sky-aurora-destinations';

/** Visual family for the itinerary header sky plate. */
export type HeaderSkyLook =
  | 'night-clear'
  | 'night-cloudy'
  | 'night-rain'
  | 'night-storm'
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'storm'
  | 'sunset'
  | 'sunrise';

/** How much cloud mass the itinerary header should paint. */
export type HeaderSkyCloudCover = 'none' | 'light' | 'partly' | 'dense';

export type HeaderSkyCondition = {
  look: HeaderSkyLook;
  timeOfDay: TravelTimeOfDay;
  weatherMood: TravelWeatherMood;
  /** Soft / drifting cloud shelf for the live sky plate. */
  cloudCover: HeaderSkyCloudCover;
  /** Show animated rain streaks. */
  rain: boolean;
  /** Occasional lightning flashes (storm). */
  lightning: boolean;
  /** Dim / veil stars at night. */
  cloudyNight: boolean;
  /** Destination-flavored additive accents (tropical / desert / fog). */
  accents: DestinationSkyAccents;
};

/**
 * Clear-night plate top (Portugal-style). Underlay for status-bar chrome when
 * the live sky overlay is painting aurora / weather above it.
 */
export const HEADER_SKY_NIGHT_CHROME = '#0C1423';

/**
 * Aurora destinations (Iceland, …) — greenish-teal top wash picked from the
 * live header veil so status chrome matches before/under the sky overlay.
 */
export const HEADER_SKY_AURORA_CHROME = '#1E3A42';

/**
 * Solid status-bar underlay that tracks the header sky family.
 * Live stars/aurora/clouds continue via `useSafeAreaChromeOverlay` in the hero;
 * this color fills any gap and SystemUI behind the plate.
 */
export function headerSkyChromeColor(options: {
  themeDark: boolean;
  look: HeaderSkyLook;
  destination?: string;
}): string {
  if (options.themeDark || options.look.startsWith('night')) {
    if (destinationShowsAurora(options.destination ?? '')) {
      return HEADER_SKY_AURORA_CHROME;
    }
    return HEADER_SKY_NIGHT_CHROME;
  }
  switch (options.look) {
    case 'sunrise':
      return '#E8B896';
    case 'sunset':
      return '#D89878';
    case 'cloudy':
    case 'rain':
    case 'storm':
      return '#B4C4D4';
    default:
      return '#DCE8F1';
  }
}

/** Page-wash top stop matching the live itinerary sky underlay. */
export function resolveHeaderSkyWashTop(options: {
  themeDark: boolean;
  timeOfDay?: TravelTimeOfDay;
  weatherCode?: number;
  timezone?: string;
  destination?: string;
  latitude?: number;
}): string {
  const condition = resolveHeaderSkyCondition(options);
  return headerSkyChromeColor({
    themeDark: options.themeDark,
    look: condition.look,
    destination: options.destination,
  });
}

/**
 * WMO-ish cloud mass for the header plate.
 * 0 clear → light decorative shelf; 1–2 mainly/partly cloudy → sun + clouds;
 * 3 overcast (+ fog/precip) → dense pack.
 */
export function resolveHeaderSkyCloudCover(
  weatherMood: TravelWeatherMood,
  weatherCode?: number,
): HeaderSkyCloudCover {
  if (
    weatherMood === 'rain' ||
    weatherMood === 'storm' ||
    weatherMood === 'snow' ||
    weatherMood === 'fog'
  ) {
    return 'dense';
  }
  if (weatherMood === 'cloudy') {
    // Open-Meteo / WMO: 1 mainly clear, 2 partly cloudy, 3 overcast.
    if (weatherCode === 1 || weatherCode === 2) return 'partly';
    return 'dense';
  }
  if (weatherMood === 'mixed') return 'partly';
  return 'light';
}

/** Full gray overcast plate (hides the sun) — not partly sunny. */
function isDenseOvercastLook(
  weatherMood: TravelWeatherMood,
  cloudCover: HeaderSkyCloudCover,
): boolean {
  if (weatherMood === 'fog' || weatherMood === 'snow') return true;
  return cloudCover === 'dense' && weatherMood === 'cloudy';
}

/**
 * Map app theme + atmosphere time/weather into a header sky look.
 * Theme dark forces night art; light theme uses dawn/day/dusk variants.
 */
export function resolveHeaderSkyCondition(options: {
  themeDark: boolean;
  timeOfDay?: TravelTimeOfDay;
  weatherCode?: number;
  /** Fallback clock when timeOfDay omitted. */
  now?: Date;
  timezone?: string;
  /** Destination label + latitude drive climate accents. */
  destination?: string;
  latitude?: number;
}): HeaderSkyCondition {
  const timeOfDay =
    options.timeOfDay ??
    travelTimeOfDay(options.now ?? new Date(), options.timezone);
  const weatherMood = travelWeatherMood(options.weatherCode);
  const cloudCover = resolveHeaderSkyCloudCover(weatherMood, options.weatherCode);
  const rain = weatherMood === 'rain' || weatherMood === 'storm';
  const lightning = weatherMood === 'storm';
  const veiledNight = cloudCover === 'partly' || cloudCover === 'dense';
  const accents = options.destination
    ? destinationSkyAccents(options.destination, options.latitude)
    : NO_SKY_ACCENTS;

  if (options.themeDark || timeOfDay === 'night') {
    let look: HeaderSkyLook = 'night-clear';
    if (weatherMood === 'storm') look = 'night-storm';
    else if (weatherMood === 'rain') look = 'night-rain';
    else if (veiledNight) look = 'night-cloudy';
    return {
      look,
      timeOfDay: options.themeDark ? 'night' : timeOfDay,
      weatherMood,
      cloudCover,
      rain,
      lightning,
      cloudyNight: veiledNight,
      accents,
    };
  }

  if (timeOfDay === 'dusk') {
    return {
      look: rain ? (lightning ? 'storm' : 'rain') : 'sunset',
      timeOfDay,
      weatherMood,
      cloudCover,
      rain,
      lightning,
      cloudyNight: false,
      accents,
    };
  }
  if (timeOfDay === 'dawn') {
    return {
      look: rain ? (lightning ? 'storm' : 'rain') : 'sunrise',
      timeOfDay,
      weatherMood,
      cloudCover,
      rain,
      lightning,
      cloudyNight: false,
      accents,
    };
  }

  // Daylight
  if (lightning) {
    return {
      look: 'storm',
      timeOfDay,
      weatherMood,
      cloudCover,
      rain: true,
      lightning: true,
      cloudyNight: false,
      accents,
    };
  }
  if (weatherMood === 'rain') {
    return {
      look: 'rain',
      timeOfDay,
      weatherMood,
      cloudCover,
      rain: true,
      lightning: false,
      cloudyNight: false,
      accents,
    };
  }
  if (isDenseOvercastLook(weatherMood, cloudCover)) {
    return {
      look: 'cloudy',
      timeOfDay,
      weatherMood,
      cloudCover,
      rain: false,
      lightning: false,
      cloudyNight: false,
      accents,
    };
  }
  return {
    look: 'sunny',
    timeOfDay,
    weatherMood,
    cloudCover,
    rain: false,
    lightning: false,
    cloudyNight: false,
    accents,
  };
}
