import { useEffect, useRef, useState } from 'react';

import type { AppIconName } from '@/design-system';
import {
  getDestinationCurrentWeather,
  weatherIconForCode,
  type DestinationCurrentWeather,
  type TemperatureUnit,
} from '@/features/travel/weather';
import { usePreferences } from '@/store/preferences';
import type { DateDisplayFormat } from '@/utils/date';
import { getCurrentPlaceLabel } from '@/utils/device-location';

function unitForDateFormat(format: DateDisplayFormat): TemperatureUnit {
  return format === 'mdy' ? 'fahrenheit' : 'celsius';
}

export function unitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function useHomeWeather() {
  const homeLocation = usePreferences((state) => state.homeLocation);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const setHomeLocation = usePreferences((state) => state.setHomeLocation);
  const temperatureUnit = unitForDateFormat(dateDisplayFormat);
  const trimmed = homeLocation.trim();
  const hasLocation = trimmed.length > 0;
  const deviceLookupStarted = useRef(false);

  const [weather, setWeather] = useState<DestinationCurrentWeather>();
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState<string>();

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
      setWeather(undefined);
      setLoading(false);
      setError(undefined);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    void getDestinationCurrentWeather(trimmed, temperatureUnit, controller.signal)
      .then((next) => {
        setWeather(next);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setWeather(undefined);
        setLoading(false);
        setError(
          reason instanceof Error ? reason.message : 'Weather is temporarily unavailable.',
        );
      });

    return () => controller.abort();
  }, [hasLocation, temperatureUnit, trimmed]);

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
  };
}
