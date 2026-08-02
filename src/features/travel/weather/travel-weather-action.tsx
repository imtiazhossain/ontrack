import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { googleWeatherUrl } from './google-weather';
import { getDestinationCurrentWeather } from './provider';
import type { DestinationCurrentWeather, TemperatureUnit } from './types';

function unitForDateFormat(format: DateDisplayFormat): TemperatureUnit {
  return format === 'mdy' ? 'fahrenheit' : 'celsius';
}

function unitSymbol(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

function formatCurrentSummary(weather: DestinationCurrentWeather): string {
  const alternateUnit: TemperatureUnit = weather.temperatureUnit === 'fahrenheit'
    ? 'celsius'
    : 'fahrenheit';
  const alternateTemperature = Math.round(
    weather.temperatureUnit === 'fahrenheit'
      ? (weather.temperature - 32) * (5 / 9)
      : (weather.temperature * 9) / 5 + 32,
  );

  return `${weather.temperature}${unitSymbol(weather.temperatureUnit)} · ${alternateTemperature}${unitSymbol(alternateUnit)}`;
}

/** Trip-card Weather action with live destination conditions above the label. */
export function TravelWeatherAction({
  destination,
  startDate,
  endDate,
  dateDisplayFormat,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  dateDisplayFormat: DateDisplayFormat;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const iconTone = chrome.icons.clock;
  const { s, spacing: rs, layout } = useResponsive();
  const iconBox = Math.max(28, s(30));
  const surface = theme.name === 'light' ? '#FFFEFC' : chrome.fieldBg;
  const temperatureUnit = unitForDateFormat(dateDisplayFormat);
  const [current, setCurrent] = useState<DestinationCurrentWeather>();

  useEffect(() => {
    const trimmed = destination.trim();
    if (!trimmed) {
      setCurrent(undefined);
      return;
    }
    const controller = new AbortController();
    setCurrent(undefined);
    void getDestinationCurrentWeather(trimmed, temperatureUnit, controller.signal)
      .then(setCurrent)
      .catch(() => {
        if (!controller.signal.aborted) setCurrent(undefined);
      });
    return () => controller.abort();
  }, [destination, temperatureUnit]);

  const summary = current ? formatCurrentSummary(current) : undefined;
  const accessibilityLabel = summary
    ? `Weather in ${destination}, currently ${summary}, ${current!.condition}. Open Google Weather.`
    : `View Google Weather for ${destination}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.tap();
        void WebBrowser.openBrowserAsync(
          googleWeatherUrl(destination, startDate, endDate),
        );
      }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: surface,
          borderColor: chrome.fieldBorder,
          borderRadius: radii.lg,
          minHeight: Math.max(layout.minTapTarget, s(48)),
          paddingHorizontal: rs.md,
          paddingVertical: rs.sm,
          gap: rs.sm,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <View
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: radii.sm,
          borderCurve: 'continuous',
          backgroundColor: iconTone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
        <Symbol name="weather" size="sm" color={iconTone.fg} />
      </View>
      <View style={styles.copy}>
        <AppText
          variant="callout"
          allowFontScaling={false}
          maxFontSizeMultiplier={1}
          numberOfLines={2}
          style={[
            styles.label,
            {
              color: chrome.label,
              fontSize: s(14),
              lineHeight: s(18),
            },
          ]}>
          {summary ? `Weather · ${summary}` : 'Weather'}
        </AppText>
      </View>
      <View style={styles.chevron}>
        <Symbol
          name="chevron-right"
          size={11}
          color={theme.name === 'light' ? '#9A876C' : chrome.subtitle}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexGrow: undefined,
    flexBasis: '47%',
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 1,
    justifyContent: 'center',
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  chevron: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
});
