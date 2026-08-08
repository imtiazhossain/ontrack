import type {
  DestinationCurrentWeather,
  TemperatureUnit,
  TravelWeather,
  TravelWeatherDay,
} from '@/features/travel/weather';
import { addDays, todayKey } from '@/utils/date';

/** Open-Meteo daily forecast length used by travel weather provider. */
export const HOME_WEATHER_FORECAST_DAYS = 16;
/**
 * How far back Today can show daily weather.
 * Keep in sync with `OPEN_METEO_PAST_DAYS_MAX` in the weather provider (0–92).
 * Value import from the weather barrel would pull RN UI into this util — don’t.
 */
export const HOME_WEATHER_PAST_DAYS = 92;

export type HomeWeatherSnapshot = {
  /** Live temp when `isLive`, otherwise the daily high. */
  temperature: number;
  temperatureLow?: number;
  temperatureHigh?: number;
  temperatureUnit: TemperatureUnit;
  condition: string;
  weatherCode: number;
  locationLabel: string;
  timezone?: string;
  /** True when `temperature` is the live reading (today). */
  isLive: boolean;
};

export function unitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

function hasTemperatureRange(
  weather: HomeWeatherSnapshot,
): weather is HomeWeatherSnapshot & { temperatureHigh: number; temperatureLow: number } {
  return (
    typeof weather.temperatureHigh === 'number' &&
    typeof weather.temperatureLow === 'number'
  );
}

/** Primary chrome line: live temp + condition, or daily H/L + condition. */
export function formatHomeWeatherPrimaryLabel(weather: HomeWeatherSnapshot): string {
  const unit = unitSymbol(weather.temperatureUnit);
  if (weather.isLive) {
    return `${weather.temperature}${unit} · ${weather.condition}`;
  }
  if (hasTemperatureRange(weather)) {
    return `H ${weather.temperatureHigh}${unit} · L ${weather.temperatureLow}${unit} · ${weather.condition}`;
  }
  return `${weather.temperature}${unit} · ${weather.condition}`;
}

/**
 * Secondary chrome line for live days with a forecast range.
 * Uses bare ° so it stays lighter under the primary unit.
 */
export function formatHomeWeatherRangeLabel(weather: HomeWeatherSnapshot): string | undefined {
  if (!weather.isLive || !hasTemperatureRange(weather)) return undefined;
  return `H ${weather.temperatureHigh}° · L ${weather.temperatureLow}°`;
}

/** Accessibility / assert string covering primary + optional range. */
export function formatHomeWeatherTemperatureLabel(weather: HomeWeatherSnapshot): string {
  const primary = formatHomeWeatherPrimaryLabel(weather);
  const range = formatHomeWeatherRangeLabel(weather);
  return range ? `${primary} · ${range}` : primary;
}

export function homeWeatherForecastThrough(today = todayKey()): string {
  return addDays(today, HOME_WEATHER_FORECAST_DAYS - 1);
}

export function homeWeatherHistoryFrom(today = todayKey()): string {
  return addDays(today, -HOME_WEATHER_PAST_DAYS);
}

/** True while the selected day is inside the Open-Meteo past→forecast window. */
export function isHomeWeatherDateInWindow(date: string, today = todayKey()): boolean {
  return date >= homeWeatherHistoryFrom(today) && date <= homeWeatherForecastThrough(today);
}

function snapshotFromDay(
  day: TravelWeatherDay,
  temperatureUnit: TemperatureUnit,
  locationLabel: string,
  timezone?: string,
): HomeWeatherSnapshot {
  return {
    temperature: day.temperatureMax,
    temperatureHigh: day.temperatureMax,
    temperatureLow: day.temperatureMin,
    temperatureUnit,
    condition: day.condition,
    weatherCode: day.weatherCode,
    locationLabel,
    timezone,
    isLive: false,
  };
}

function snapshotFromCurrent(
  current: DestinationCurrentWeather,
  day?: TravelWeatherDay,
): HomeWeatherSnapshot {
  return {
    temperature: current.temperature,
    temperatureHigh: day?.temperatureMax,
    temperatureLow: day?.temperatureMin,
    temperatureUnit: current.temperatureUnit,
    condition: current.condition,
    weatherCode: current.weatherCode,
    locationLabel: current.locationLabel,
    timezone: current.timezone,
    isLive: true,
  };
}

/**
 * Resolve chrome weather for a Today date key.
 * Outside the Open-Meteo past/forecast window → undefined.
 * Today prefers live conditions (+ daily H/L when the forecast day exists).
 */
export function resolveHomeWeatherForDate({
  date,
  current,
  forecast,
  today = todayKey(),
}: {
  date: string;
  current?: DestinationCurrentWeather;
  forecast?: TravelWeather;
  today?: string;
}): HomeWeatherSnapshot | undefined {
  if (!isHomeWeatherDateInWindow(date, today)) return undefined;

  const locationLabel =
    current?.locationLabel ?? forecast?.locationLabel ?? '';
  const timezone = current?.timezone ?? forecast?.timezone;
  const unit =
    current?.temperatureUnit ?? forecast?.temperatureUnit ?? 'fahrenheit';
  const day = forecast?.days.find((entry) => entry.date === date);

  if (date === today) {
    if (current) return snapshotFromCurrent(current, day);
    return day ? snapshotFromDay(day, unit, locationLabel, timezone) : undefined;
  }

  return day ? snapshotFromDay(day, unit, locationLabel, timezone) : undefined;
}
