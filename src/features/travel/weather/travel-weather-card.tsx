import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, ErrorMessage, LoadingSpinner, Symbol } from '@/components/primitives';
import type { Theme } from '@/design-system';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import {
  travelCardBorder,
  travelCardFill,
  travelCardShadow,
  travelPanelTint,
  TRAVEL_EDITORIAL_ACCENT,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { formatDateKey } from '@/utils/date';

import { getTravelWeather } from './provider';
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
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const light = theme.name === 'light';
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
  const iconSize = Math.max(44, s(48));
  const accent = light ? TRAVEL_EDITORIAL_ACCENT : chrome.ctaFrom;
  const locationLabel = weather?.locationLabel ?? destination;

  return (
    <View
      accessibilityLabel={`Destination Weather for ${destination}`}
      style={[
        styles.card,
        {
          backgroundColor: light ? '#F7F1E8' : travelPanelTint(theme),
          borderColor: travelCardBorder(theme),
          borderRadius: Math.max(20, s(22)),
          padding: Math.max(16, rs.md + 2),
          gap: Math.max(14, rs.md),
          boxShadow: travelCardShadow(theme),
        },
      ]}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconBadge,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: iconSize / 2,
              backgroundColor: light ? '#EFE6D8' : chrome.icons.clock.bg,
            },
          ]}>
          <Symbol name="weather" size="md" color={accent} />
        </View>
        <View style={styles.flex}>
          <AppText
            variant="callout"
            fit
            numberOfLines={1}
            style={[
              styles.cardTitle,
              {
                color: accent,
                fontSize: s(17),
                lineHeight: s(22),
              },
            ]}>
            Destination Weather
          </AppText>
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{
              color: chrome.subtitle,
              fontSize: s(14),
              lineHeight: s(18),
            }}>
            {locationLabel}
          </AppText>
        </View>
        {!weather && !error ? <LoadingSpinner color={accent} /> : null}
      </View>

      {weather?.availability === 'too-early' ? (
        <TypicalWeatherBlock
          startDate={startDate}
          temperatureUnit={temperatureUnit}
          availableOn={weather.availableOn!}
          dateDisplayFormat={dateDisplayFormat}
          theme={theme}
          accent={accent}
        />
      ) : null}
      {weather?.availability === 'past' ? (
        <AppText variant="caption" color="secondary">
          Forecasts are available for upcoming travel dates.
        </AppText>
      ) : null}

      {shownDays.length > 0 ? (
        <View style={[styles.days, { gap: rs.sm }]}>
          {shownDays.map((day) => (
            <View
              key={day.date}
              style={[
                styles.day,
                {
                  backgroundColor: travelCardFill(theme),
                  borderRadius: radii.sm,
                  padding: rs.sm,
                  gap: rs.xxs,
                },
              ]}>
              <AppText variant="caption" color="secondary">
                {formatDateKey(day.date, dateDisplayFormat)}
              </AppText>
              <AppText style={{ fontSize: s(22), lineHeight: s(28) }}>{day.symbol}</AppText>
              <AppText variant="callout">
                {day.temperatureMax}
                {unitSymbol(temperatureUnit)}
              </AppText>
              <AppText variant="caption" color="secondary">
                {day.temperatureMin}° · {day.precipitationProbability}% rain
              </AppText>
            </View>
          ))}
          {hiddenDayCount > 0 ? (
            <View
              style={[
                styles.moreDays,
                {
                  borderColor: theme.separator,
                  minWidth: Math.max(72, s(72)),
                  minHeight: Math.max(40, s(40)),
                  paddingHorizontal: rs.sm,
                },
              ]}>
              <AppText variant="caption" color="accent" fit>
                +{hiddenDayCount} days
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {weather?.availability === 'partial' && weather.availableThrough ? (
        <AppText variant="caption" color="secondary">
          Forecast currently available through{' '}
          {formatDateKey(weather.availableThrough, dateDisplayFormat)}.
        </AppText>
      ) : null}

      {error ? (
        <View style={[styles.errorRow, { gap: rs.sm }]}>
          <ErrorMessage message={error} variant="caption" style={styles.flex} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry destination weather"
            onPress={() => setRequestVersion((version) => version + 1)}
            style={({ pressed }) => [
              {
                minHeight: Math.max(36, s(36)),
                justifyContent: 'center',
                paddingHorizontal: rs.sm,
              },
              pressed ? styles.pressed : undefined,
            ]}>
            <AppText variant="caption" color="accent">
              Retry
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function TypicalWeatherBlock({
  startDate,
  temperatureUnit,
  availableOn,
  dateDisplayFormat,
  theme,
  accent,
}: {
  startDate: string;
  temperatureUnit: TemperatureUnit;
  availableOn: string;
  dateDisplayFormat: DateDisplayFormat;
  theme: Theme;
  accent: string;
}) {
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const light = theme.name === 'light';

  let monthName = 'the month';
  try {
    monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      new Date(`${startDate}T12:00:00`),
    );
  } catch {
    /* keep fallback */
  }

  const isF = temperatureUnit === 'fahrenheit';
  const stats = [
    { label: 'Avg High', value: isF ? '54°F' : '12°C' },
    { label: 'Avg Low', value: isF ? '43°F' : '6°C' },
    { label: 'Rainfall', value: '15 days' },
  ] as const;
  const ruleColor = light ? 'rgba(160, 120, 80, 0.28)' : chrome.fieldBorder;
  const diamondColor = light ? '#C4A06A' : chrome.ctaFrom;

  return (
    <View style={{ gap: Math.max(12, rs.sm + 2) }}>
      <AppText
        variant="caption"
        style={{
          color: chrome.subtitle,
          fontSize: s(13),
          lineHeight: s(18),
        }}>
        Exact daily forecasts will be available {formatDateKey(availableOn, dateDisplayFormat)}.
      </AppText>
      <View
        style={[
          styles.typicalWeatherBox,
          {
            backgroundColor: travelCardFill(theme),
            borderColor: travelCardBorder(theme),
            borderRadius: Math.max(16, s(18)),
            padding: Math.max(16, rs.md),
            gap: Math.max(14, rs.md),
            boxShadow: light ? '0 2px 10px rgba(51, 39, 28, 0.06)' : undefined,
          },
        ]}>
        <View style={[styles.typicalWeatherHeader, { gap: rs.sm }]}>
          <Symbol name="calendar" size="sm" color={accent} />
          <AppText
            variant="callout"
            fit
            numberOfLines={1}
            style={[
              styles.typicalTitle,
              {
                color: accent,
                fontSize: s(16),
                lineHeight: s(21),
              },
            ]}>
            Typical {monthName} Weather
          </AppText>
        </View>

        <View style={styles.typicalWeatherRow}>
          {stats.map((stat, index) => (
            <View key={stat.label} style={styles.typicalWeatherStatWrap}>
              {index > 0 ? (
                <View style={[styles.statDivider, { backgroundColor: ruleColor }]} />
              ) : null}
              <View style={[styles.typicalWeatherStat, { gap: Math.max(4, s(4)) }]}>
                <AppText
                  variant="caption"
                  fit
                  numberOfLines={1}
                  style={{
                    color: chrome.subtitle,
                    fontSize: s(12),
                    lineHeight: s(16),
                  }}>
                  {stat.label}
                </AppText>
                <AppText
                  fit
                  numberOfLines={1}
                  style={[
                    styles.typicalWeatherValue,
                    {
                      color: chrome.title,
                      fontSize: s(22),
                      lineHeight: s(26),
                    },
                  ]}>
                  {stat.value}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.diamondRule}>
          <View style={[styles.ruleLine, { backgroundColor: ruleColor }]} />
          <View style={[styles.diamond, { backgroundColor: diamondColor }]} />
          <View style={[styles.ruleLine, { backgroundColor: ruleColor }]} />
        </View>

        <AppText
          variant="caption"
          style={{
            color: chrome.subtitle,
            fontFamily: fontFamilies.serif,
            fontSize: s(14),
            lineHeight: s(20),
            textAlign: 'center',
          }}>
          Weather transitions quickly. Rain and wind are common, so dressing in waterproof and
          windproof layers is highly recommended.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  days: { flexDirection: 'row', flexWrap: 'wrap' },
  day: {
    minWidth: 108,
    flexGrow: 1,
    flexBasis: '28%',
  },
  moreDays: {
    borderWidth: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.6 },
  flex: { flex: 1, minWidth: 0, flexShrink: 1 },
  typicalWeatherBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  typicalWeatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  typicalTitle: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  typicalWeatherRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  typicalWeatherStatWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
  typicalWeatherStat: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  typicalWeatherValue: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
  },
  diamondRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  diamond: {
    width: 7,
    height: 7,
    transform: [{ rotate: '45deg' }],
  },
});
