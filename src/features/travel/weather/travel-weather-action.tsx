import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { getDestinationCurrentWeather } from './provider';
import type { DestinationCurrentWeather, TemperatureUnit } from './types';

const ACTION_SHADOW_LIGHT =
  '0 3px 10px rgba(51, 39, 28, 0.09), 0 1px 2px rgba(51, 39, 28, 0.04)';
const ACTION_SHADOW_DARK = '0 3px 12px rgba(0, 0, 0, 0.35)';

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
  onPress,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  dateDisplayFormat: DateDisplayFormat;
  onPress: () => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const iconTone = chrome.icons.clock;
  const { s, spacing: rs, layout } = useResponsive();
  const iconBox = Math.max(30, s(32));
  const light = theme.name === 'light';
  const surface = light ? '#FFFFFF' : chrome.fieldBg;
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
    ? `Weather in ${destination}, currently ${summary}, ${current!.condition}. Open weather.`
    : `View weather for ${destination}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: surface,
          borderColor: light ? 'rgba(51,39,28,0.04)' : chrome.fieldBorder,
          borderRadius: Math.max(14, s(16)),
          minHeight: Math.max(layout.minTapTarget, s(50)),
          paddingHorizontal: Math.max(10, rs.sm + 2),
          paddingVertical: Math.max(10, rs.sm),
          gap: Math.max(8, rs.sm - 2),
          boxShadow: light ? ACTION_SHADOW_LIGHT : ACTION_SHADOW_DARK,
          opacity: pressed ? 0.78 : 1,
        },
      ]}>
      <View
        style={{
          width: iconBox,
          height: iconBox,
          borderRadius: Math.max(9, s(10)),
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
          size={12}
          color={light ? '#B09A82' : chrome.subtitle}
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
    borderCurve: 'continuous',
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
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
});
