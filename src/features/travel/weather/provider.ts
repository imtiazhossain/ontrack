import { fetch } from 'expo/fetch';

import type { AppIconName } from '@/design-system';
import { addDays, todayKey } from '@/utils/date';

import type {
  DestinationCurrentWeather,
  TemperatureUnit,
  TravelWeather,
  TravelWeatherDay,
} from './types';

const FORECAST_DAYS = 16;
const REQUEST_TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

interface GeocodingResult {
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  country?: unknown;
  admin1?: unknown;
}

interface GeocodingResponse {
  results?: unknown;
}

interface ForecastResponse {
  timezone?: unknown;
  daily?: {
    time?: unknown;
    weather_code?: unknown;
    temperature_2m_min?: unknown;
    temperature_2m_max?: unknown;
    precipitation_probability_max?: unknown;
  };
}

interface CurrentForecastResponse {
  timezone?: unknown;
  current?: {
    temperature_2m?: unknown;
    weather_code?: unknown;
  };
}

interface ForecastWindow {
  availability: TravelWeather['availability'];
  requestStart?: string;
  requestEnd?: string;
  availableOn?: string;
  availableThrough?: string;
}

interface CacheEntry {
  expiresAt: number;
  promise: Promise<TravelWeather>;
}

const cache = new Map<string, CacheEntry>();
const currentCache = new Map<string, { expiresAt: number; promise: Promise<DestinationCurrentWeather> }>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isFiniteNumber);
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
    return (await response.json()) as T;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Weather request timed out.');
    throw error instanceof Error ? error : new Error('Weather is temporarily unavailable.');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export function forecastWindow(
  startDate: string,
  endDate: string,
  today = todayKey(),
): ForecastWindow {
  const availableThrough = addDays(today, FORECAST_DAYS - 1);

  if (endDate < today) return { availability: 'past' };
  if (startDate > availableThrough) {
    return {
      availability: 'too-early',
      availableOn: addDays(startDate, -(FORECAST_DAYS - 1)),
    };
  }

  const requestStart = startDate < today ? today : startDate;
  const requestEnd = endDate > availableThrough ? availableThrough : endDate;
  return {
    availability: requestEnd < endDate ? 'partial' : 'forecast',
    requestStart,
    requestEnd,
    availableThrough: requestEnd < endDate ? requestEnd : undefined,
  };
}

export function describeWeatherCode(code: number): Pick<TravelWeatherDay, 'condition' | 'symbol'> {
  if (code === 0) return { condition: 'Clear', symbol: '☀️' };
  if (code === 1 || code === 2) return { condition: 'Partly cloudy', symbol: '🌤️' };
  if (code === 3) return { condition: 'Cloudy', symbol: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Foggy', symbol: '🌫️' };
  if (code >= 51 && code <= 67) return { condition: 'Rain', symbol: '🌧️' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', symbol: '🌨️' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', symbol: '🌦️' };
  if (code === 85 || code === 86) return { condition: 'Snow showers', symbol: '🌨️' };
  if (code >= 95) return { condition: 'Thunderstorms', symbol: '⛈️' };
  return { condition: 'Mixed weather', symbol: '🌥️' };
}

/** Monochrome SF Symbol mapping for Today chrome / tab bar. */
export function weatherIconForCode(code: number): AppIconName {
  if (code === 0) return 'weather-clear';
  if (code === 1 || code === 2) return 'weather-partly-cloudy';
  if (code === 3) return 'weather-cloudy';
  if (code === 45 || code === 48) return 'weather-fog';
  if (code >= 51 && code <= 67) return 'weather-rain';
  if (code >= 71 && code <= 77) return 'weather-snow';
  if (code >= 80 && code <= 82) return 'weather-showers';
  if (code === 85 || code === 86) return 'weather-snow';
  if (code >= 95) return 'weather-thunder';
  return 'weather-partly-cloudy';
}

function locationLabel(result: GeocodingResult, fallback: string): string {
  const parts = [result.name, result.admin1, result.country].filter(
    (value, index, values): value is string =>
      typeof value === 'string' && value.length > 0 && values.indexOf(value) === index,
  );
  return parts.join(', ') || fallback;
}

function normalizeDays(response: ForecastResponse): TravelWeatherDay[] {
  const daily = response.daily;
  const dates = daily?.time;
  const codes = daily?.weather_code;
  const minimums = daily?.temperature_2m_min;
  const maximums = daily?.temperature_2m_max;
  const precipitation = daily?.precipitation_probability_max;

  if (
    !isStringArray(dates) ||
    !isNumberArray(codes) ||
    !isNumberArray(minimums) ||
    !isNumberArray(maximums) ||
    !isNumberArray(precipitation)
  ) {
    throw new Error('Weather service returned incomplete forecast data.');
  }

  const length = Math.min(
    dates.length,
    codes.length,
    minimums.length,
    maximums.length,
    precipitation.length,
  );
  return dates.slice(0, length).map((date, index) => ({
    date,
    weatherCode: codes[index],
    ...describeWeatherCode(codes[index]),
    temperatureMin: Math.round(minimums[index]),
    temperatureMax: Math.round(maximums[index]),
    precipitationProbability: Math.round(precipitation[index]),
  }));
}

async function requestTravelWeather(
  destination: string,
  startDate: string,
  endDate: string,
  temperatureUnit: TemperatureUnit,
  signal?: AbortSignal,
): Promise<TravelWeather> {
  const window = forecastWindow(startDate, endDate);
  if (!window.requestStart || !window.requestEnd) {
    return {
      availability: window.availability,
      locationLabel: destination,
      temperatureUnit,
      days: [],
      availableOn: window.availableOn,
    };
  }

  const location = await geocodeDestination(destination, signal);

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(location.latitude));
  forecastUrl.searchParams.set('longitude', String(location.longitude));
  forecastUrl.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
  );
  forecastUrl.searchParams.set('temperature_unit', temperatureUnit);
  forecastUrl.searchParams.set('timezone', 'auto');
  forecastUrl.searchParams.set('start_date', window.requestStart);
  forecastUrl.searchParams.set('end_date', window.requestEnd);
  const forecast = await fetchJson<ForecastResponse>(forecastUrl.toString(), signal);
  const days = normalizeDays(forecast);
  if (days.length === 0) throw new Error('No forecast is available for these trip dates yet.');

  return {
    availability: window.availability,
    locationLabel: locationLabel(location, destination),
    timezone: typeof forecast.timezone === 'string' ? forecast.timezone : undefined,
    temperatureUnit,
    days,
    availableThrough: window.availableThrough,
  };
}

export function getTravelWeather(
  destination: string,
  startDate: string,
  endDate: string,
  temperatureUnit: TemperatureUnit,
  signal?: AbortSignal,
): Promise<TravelWeather> {
  const key = [destination.trim().toLocaleLowerCase(), startDate, endDate, temperatureUnit].join('|');
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = requestTravelWeather(
    destination.trim(),
    startDate,
    endDate,
    temperatureUnit,
    signal,
  ).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  return promise;
}

async function geocodeDestination(
  destination: string,
  signal?: AbortSignal,
): Promise<GeocodingResult> {
  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodingUrl.searchParams.set('name', destination);
  geocodingUrl.searchParams.set('count', '1');
  geocodingUrl.searchParams.set('language', 'en');
  geocodingUrl.searchParams.set('format', 'json');
  const geocoding = await fetchJson<GeocodingResponse>(geocodingUrl.toString(), signal);
  const results = Array.isArray(geocoding.results) ? geocoding.results : [];
  const location = results[0] as GeocodingResult | undefined;
  if (!location || !isFiniteNumber(location.latitude) || !isFiniteNumber(location.longitude)) {
    throw new Error(`Weather could not find “${destination}”. Try a city and country.`);
  }
  return location;
}

async function requestDestinationCurrentWeather(
  destination: string,
  temperatureUnit: TemperatureUnit,
  signal?: AbortSignal,
): Promise<DestinationCurrentWeather> {
  const location = await geocodeDestination(destination, signal);
  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
  forecastUrl.searchParams.set('latitude', String(location.latitude));
  forecastUrl.searchParams.set('longitude', String(location.longitude));
  forecastUrl.searchParams.set('current', 'temperature_2m,weather_code');
  forecastUrl.searchParams.set('temperature_unit', temperatureUnit);
  forecastUrl.searchParams.set('timezone', 'auto');
  const forecast = await fetchJson<CurrentForecastResponse>(forecastUrl.toString(), signal);
  const temperature = forecast.current?.temperature_2m;
  const weatherCode = forecast.current?.weather_code;
  if (!isFiniteNumber(temperature) || !isFiniteNumber(weatherCode)) {
    throw new Error('Weather service returned incomplete current conditions.');
  }
  return {
    locationLabel: locationLabel(location, destination),
    latitude: location.latitude as number,
    longitude: location.longitude as number,
    timezone: typeof forecast.timezone === 'string' ? forecast.timezone : undefined,
    temperature: Math.round(temperature),
    temperatureUnit,
    weatherCode,
    ...describeWeatherCode(weatherCode),
  };
}

/** Live temperature + condition for a destination (cached ~30 min). */
export function getDestinationCurrentWeather(
  destination: string,
  temperatureUnit: TemperatureUnit,
  signal?: AbortSignal,
): Promise<DestinationCurrentWeather> {
  const key = `current|${destination.trim().toLocaleLowerCase()}|${temperatureUnit}`;
  const cached = currentCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  const promise = requestDestinationCurrentWeather(
    destination.trim(),
    temperatureUnit,
    signal,
  ).catch((error) => {
    currentCache.delete(key);
    throw error;
  });
  currentCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, promise });
  return promise;
}

export function clearTravelWeatherCache(): void {
  cache.clear();
  currentCache.clear();
}
