import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { formatDateKey } from '@/utils/date';

import { getTravelWeather } from './provider';
import { googleWeatherUrl } from './google-weather';
import type { TemperatureUnit, TravelWeather } from './types';

interface TravelWeatherCardProps {
  destination: string;
  startDate: string;
  endDate: string;
  dateDisplayFormat: DateDisplayFormat;
  compact?: boolean;
}

function unitForDateFormat(format: DateDisplayFormat): TemperatureUnit {
  return format === 'mdy' ? 'fahrenheit' : 'celsius';
}

function unitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function TravelWeatherCard({
  destination,
  startDate,
  endDate,
  dateDisplayFormat,
  compact = false,
}: TravelWeatherCardProps) {
  const theme = useTheme();
  const temperatureUnit = unitForDateFormat(dateDisplayFormat);
  const [requestVersion, setRequestVersion] = useState(0);
  const requestKey = [
    destination,
    startDate,
    endDate,
    temperatureUnit,
    requestVersion,
  ].join('|');
  const [result, setResult] = useState<{
    key: string;
    weather?: TravelWeather;
    error?: string;
  }>({ key: '' });
  const weather = result.key === requestKey ? result.weather : undefined;
  const error = result.key === requestKey ? result.error : undefined;

  useEffect(() => {
    const controller = new AbortController();
    void getTravelWeather(destination, startDate, endDate, temperatureUnit, controller.signal)
      .then((nextWeather) => setResult({ key: requestKey, weather: nextWeather }))
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error: reason instanceof Error ? reason.message : 'Weather is temporarily unavailable.',
        });
      });
    return () => controller.abort();
  }, [destination, endDate, requestKey, startDate, temperatureUnit]);

  const shownDays = useMemo(
    () => weather?.days.slice(0, compact ? 3 : weather.days.length) ?? [],
    [compact, weather],
  );
  const hiddenDayCount = Math.max(0, (weather?.days.length ?? 0) - shownDays.length);

  return (
    <View
      accessibilityLabel={`Destination weather for ${destination}`}
      style={[styles.card, { backgroundColor: theme.accentFaint }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Symbol name="cloud.sun.fill" size="md" color={theme.accentPrimary} />
          <View style={styles.flex}>
            <AppText variant="overline" color="tertiary" style={travelOverlineStyle}>
              Destination Weather
            </AppText>
            <AppText variant="callout" color="accent">
              {weather?.locationLabel ?? destination}
            </AppText>
          </View>
        </View>
        {!weather && !error ? <ActivityIndicator color={theme.accentPrimary} /> : null}
      </View>

      {weather?.availability === 'too-early' ? (
        <AppText variant="caption" color="secondary">
          Exact daily forecasts will be available {formatDateKey(weather.availableOn!, dateDisplayFormat)}.
        </AppText>
      ) : null}
      {weather?.availability === 'past' ? (
        <AppText variant="caption" color="secondary">
          Forecasts are available for upcoming travel dates.
        </AppText>
      ) : null}

      {shownDays.length > 0 ? (
        <View style={styles.days}>
          {shownDays.map((day) => (
            <View key={day.date} style={[styles.day, { backgroundColor: theme.backgroundElevated }]}>
              <AppText variant="caption" color="secondary">
                {formatDateKey(day.date, dateDisplayFormat)}
              </AppText>
              <AppText style={styles.weatherSymbol}>{day.symbol}</AppText>
              <AppText variant="callout">
                {day.temperatureMax}{unitSymbol(temperatureUnit)}
              </AppText>
              <AppText variant="caption" color="secondary">
                {day.temperatureMin}° · {day.precipitationProbability}% rain
              </AppText>
            </View>
          ))}
          {hiddenDayCount > 0 ? (
            <View style={[styles.moreDays, { borderColor: theme.separator }]}>
              <AppText variant="caption" color="accent">+{hiddenDayCount} days</AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {weather?.availability === 'partial' && weather.availableThrough ? (
        <AppText variant="caption" color="secondary">
          Forecast currently available through {formatDateKey(weather.availableThrough, dateDisplayFormat)}.
        </AppText>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <ErrorMessage message={error} variant="caption" style={styles.flex} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry destination weather"
            onPress={() => setRequestVersion((version) => version + 1)}
            style={({ pressed }) => [styles.retry, pressed ? styles.pressed : undefined]}>
            <AppText variant="caption" color="accent">Retry</AppText>
          </Pressable>
        </View>
      ) : null}

      <Button
        variant="ghost"
        icon="open-external"
        style={styles.googleButton}
        onPress={() =>
          void WebBrowser.openBrowserAsync(
            googleWeatherUrl(destination, startDate, endDate),
          )
        }
        accessibilityLabel={`View Google weather for ${destination} during this trip`}>
        View on Google Weather
      </Button>
      <AppText variant="caption" color="tertiary">Weather by Open-Meteo</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: {
    minWidth: 108,
    flexGrow: 1,
    flexBasis: '28%',
    borderRadius: radii.sm,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  moreDays: {
    minWidth: 72,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  weatherSymbol: { fontSize: 22, lineHeight: 28 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  retry: { minHeight: 36, justifyContent: 'center', paddingHorizontal: spacing.sm },
  googleButton: { alignSelf: 'flex-start' },
  pressed: { opacity: 0.6 },
  flex: { flex: 1 },
});
