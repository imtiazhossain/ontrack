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

export type HeaderSkyCondition = {
  look: HeaderSkyLook;
  timeOfDay: TravelTimeOfDay;
  weatherMood: TravelWeatherMood;
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
 * Solid status-bar wash that matches the header sky plate.
 * Stack fills often cover app-shell chrome art below the inset — keep a
 * matching static color behind the clock, and paint dynamic sky in-header.
 */
export function headerSkyChromeColor(options: {
  themeDark: boolean;
  look: HeaderSkyLook;
}): string {
  if (options.themeDark || options.look.startsWith('night')) {
    return '#0A1424';
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

function isOvercastFamily(mood: TravelWeatherMood): boolean {
  return (
    mood === 'cloudy' ||
    mood === 'fog' ||
    mood === 'rain' ||
    mood === 'snow' ||
    mood === 'storm'
  );
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
  const rain = weatherMood === 'rain' || weatherMood === 'storm';
  const lightning = weatherMood === 'storm';
  const overcast = isOvercastFamily(weatherMood);
  const accents = options.destination
    ? destinationSkyAccents(options.destination, options.latitude)
    : NO_SKY_ACCENTS;

  if (options.themeDark || timeOfDay === 'night') {
    let look: HeaderSkyLook = 'night-clear';
    if (weatherMood === 'storm') look = 'night-storm';
    else if (weatherMood === 'rain') look = 'night-rain';
    else if (overcast) look = 'night-cloudy';
    return {
      look,
      timeOfDay: options.themeDark ? 'night' : timeOfDay,
      weatherMood,
      rain,
      lightning,
      cloudyNight: overcast,
      accents,
    };
  }

  if (timeOfDay === 'dusk') {
    return {
      look: rain ? (lightning ? 'storm' : 'rain') : 'sunset',
      timeOfDay,
      weatherMood,
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
      rain: true,
      lightning: false,
      cloudyNight: false,
      accents,
    };
  }
  if (overcast) {
    return {
      look: 'cloudy',
      timeOfDay,
      weatherMood,
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
    rain: false,
    lightning: false,
    cloudyNight: false,
    accents,
  };
}
