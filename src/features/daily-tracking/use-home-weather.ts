import { useEffect, useMemo, useRef, useState } from 'react';

import type { AppIconName } from '@/design-system';
import {
  getDestinationCurrentWeather,
  getTravelWeather,
  weatherIconForCode,
  type DestinationCurrentWeather,
  type TemperatureUnit,
  type TravelWeather,
} from '@/features/travel/weather';
import { usePreferences } from '@/store/preferences';
import type { DateDisplayFormat } from '@/utils/date';
import { addDays, todayKey } from '@/utils/date';
import { getCurrentPlaceLabel } from '@/utils/device-location';

import {
  HOME_WEATHER_FORECAST_DAYS,
  HOME_WEATHER_PAST_DAYS,
  formatHomeWeatherTemperatureLabel,
  homeWeatherHistoryFrom,
  isHomeWeatherDateInWindow,
  resolveHomeWeatherForDate,
  unitSymbol,
  type HomeWeatherSnapshot,
} from './resolve-home-weather-day';

function unitForDateFormat(format: DateDisplayFormat): TemperatureUnit {
  return format === 'mdy' ? 'fahrenheit' : 'celsius';
}

export { formatHomeWeatherTemperatureLabel, unitSymbol };
export type { HomeWeatherSnapshot };

export function useHomeWeather(date?: string) {
  const homeLocation = usePreferences((state) => state.homeLocation);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const setHomeLocation = usePreferences((state) => state.setHomeLocation);
  const temperatureUnit = unitForDateFormat(dateDisplayFormat);
  const trimmed = homeLocation.trim();
  const hasLocation = trimmed.length > 0;
  const deviceLookupStarted = useRef(false);

  const [current, setCurrent] = useState<DestinationCurrentWeather>();
  const [forecast, setForecast] = useState<TravelWeather>();
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [currentError, setCurrentError] = useState<string>();
  const [forecastError, setForecastError] = useState<string>();

  // When no home location is saved, try the device GPS once and persist the place label.
  useEffect(() => {
    if (hasLocation) {
      deviceLookupStarted.current = false;
      setDetectingLocation(false);
      return;
    }
    if (deviceLookupStarted.current) return;
    deviceLookupStarted.current = true;
    let cancelled = false;
    setDetectingLocation(true);
    void getCurrentPlaceLabel().then((result) => {
      if (cancelled) return;
      setDetectingLocation(false);
      if (result.status !== 'suggested') return;
      if (usePreferences.getState().homeLocation.trim()) return;
      setHomeLocation(result.label);
    });
    return () => {
      cancelled = true;
    };
  }, [hasLocation, setHomeLocation]);

  useEffect(() => {
    if (!hasLocation) {
      setCurrent(undefined);
      setForecast(undefined);
      setLoading(false);
      setCurrentError(undefined);
      setForecastError(undefined);
      return;
    }

    const controller = new AbortController();
    let currentSettled = false;
    let forecastSettled = false;
    let nextCurrent: DestinationCurrentWeather | undefined;
    let nextForecast: TravelWeather | undefined;
    let nextCurrentError: string | undefined;
    let nextForecastError: string | undefined;

    const publish = () => {
      if (controller.signal.aborted) return;
      if (!currentSettled || !forecastSettled) return;
      setCurrent(nextCurrent);
      setForecast(nextForecast);
      setCurrentError(nextCurrentError);
      setForecastError(nextForecastError);
      setLoading(false);
    };

    setLoading(true);
    setCurrentError(undefined);
    setForecastError(undefined);

    const today = todayKey();
    const forecastStart = homeWeatherHistoryFrom(today);
    const forecastEnd = addDays(today, HOME_WEATHER_FORECAST_DAYS - 1);

    void getDestinationCurrentWeather(trimmed, temperatureUnit, controller.signal)
      .then((value) => {
        nextCurrent = value;
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        nextCurrentError =
          reason instanceof Error ? reason.message : 'Weather is temporarily unavailable.';
      })
      .finally(() => {
        currentSettled = true;
        publish();
      });

    void getTravelWeather(
      trimmed,
      forecastStart,
      forecastEnd,
      temperatureUnit,
      controller.signal,
      { pastDays: HOME_WEATHER_PAST_DAYS },
    )
      .then((value) => {
        nextForecast = value;
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        nextForecastError =
          reason instanceof Error ? reason.message : 'Weather is temporarily unavailable.';
      })
      .finally(() => {
        forecastSettled = true;
        publish();
      });

    return () => controller.abort();
  }, [hasLocation, temperatureUnit, trimmed]);

  const weather: HomeWeatherSnapshot | undefined = useMemo(() => {
    if (!date) {
      if (!current) return undefined;
      const todayDay = forecast?.days.find((day) => day.date === todayKey());
      return {
        temperature: current.temperature,
        temperatureHigh: todayDay?.temperatureMax,
        temperatureLow: todayDay?.temperatureMin,
        temperatureUnit: current.temperatureUnit,
        condition: current.condition,
        weatherCode: current.weatherCode,
        locationLabel: current.locationLabel,
        timezone: current.timezone,
        isLive: true,
      };
    }
    return resolveHomeWeatherForDate({ date, current, forecast });
  }, [current, date, forecast]);

  const inForecastWindow = !date || isHomeWeatherDateInWindow(date);
  const viewingToday = !date || date === todayKey();
  const error = !inForecastWindow
    ? undefined
    : viewingToday
      ? currentError ?? (!weather ? forecastError : undefined)
      : forecastError ?? (!weather ? currentError : undefined);

  const icon: AppIconName | undefined = weather
    ? weatherIconForCode(weather.weatherCode)
    : undefined;

  return {
    hasLocation,
    homeLocation: trimmed,
    weather,
    icon,
    loading: loading || detectingLocation,
    detectingLocation,
    error,
    /** Only show the banner when we have real weather for this day — never empty/error chrome. */
    showWeather: Boolean(weather),
  };
}
