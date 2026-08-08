import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    AppText,
    Card,
    IconButton,
    ProgressRing,
    Symbol,
    useSafeAreaChrome,
} from '@/components/primitives';
import {
    hexWithAlpha,
    layout,
    radii,
    spacing,
    timeOfDayGradient,
    timeOfDaySafeAreaBackground,
} from '@/design-system';
import { HomeLocationSheet } from '@/features/daily-tracking/home-location-sheet';
import {
    formatHomeWeatherPrimaryLabel,
    formatHomeWeatherRangeLabel,
    formatHomeWeatherTemperatureLabel,
} from '@/features/daily-tracking/resolve-home-weather-day';
import { useHomeWeather } from '@/features/daily-tracking/use-home-weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { addDays, formatDateLong, formatWeekday, isToday } from '@/utils/date';

interface DayHeaderProps {
  date: string;
  completion: number;
  /** e.g. "Now · Deep work" or "Next · Lunch" */
  nowLine?: string;
  summaryLine?: string;
  onChangeDate: (date: string) => void;
  topInset: number;
}

export function DayHeader({
  date,
  completion,
  nowLine,
  summaryLine,
  onChangeDate,
  topInset,
}: DayHeaderProps) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const hour = isToday(date) ? new Date().getHours() : 12;
  const gradient = timeOfDayGradient(theme, hour);
  useSafeAreaChrome(timeOfDaySafeAreaBackground(theme, hour));
  const viewingToday = isToday(date);
  const { weather, icon, showWeather } = useHomeWeather(date);
  const [locationOpen, setLocationOpen] = useState(false);
  const openWeather = () => setLocationOpen(true);
  const primaryLabel = weather ? formatHomeWeatherPrimaryLabel(weather) : '';
  const rangeLabel = weather ? formatHomeWeatherRangeLabel(weather) : undefined;
  const weatherAccessibilityLabel = weather
    ? `${formatHomeWeatherTemperatureLabel(weather)} in ${weather.locationLabel}. Edit home location.`
    : 'Edit home location for weather';
  return (
    <View style={[styles.container, { paddingTop: topInset + spacing.md }]}>
      {/*
        Soft multi-stop dissolve into ScreenAtmosphere — avoid a mid-header
        muddy band from a hard opaque→transparent seam.
      */}
      <LinearGradient
        colors={[
          gradient[0],
          hexWithAlpha(gradient[0], 0.78),
          hexWithAlpha(gradient[0], 0.42),
          hexWithAlpha(gradient[0], 0.14),
          'transparent',
        ]}
        locations={[0, 0.24, 0.5, 0.76, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Previous day"
          testID={AgentUiIds.today.prevDay}
          onPress={() => onChangeDate(addDays(date, -1))}
        />
        <View style={styles.titleBlock}>
          <AppText variant="overline" color="tertiary" align="center">
            {viewingToday ? 'Today' : formatWeekday(date)}
          </AppText>
          <AppText variant="title" align="center">
            {formatDateLong(date)}
          </AppText>
        </View>
        <IconButton
          icon="chevron-right"
          accessibilityLabel="Next day"
          testID={AgentUiIds.today.nextDay}
          onPress={() => onChangeDate(addDays(date, 1))}
        />
      </View>

      {showWeather && weather ? (
        <Card
          airy
          padded={false}
          testID={AgentUiIds.today.weather}
          accessibilityLabel={weatherAccessibilityLabel}
          onPress={openWeather}
          style={[
            styles.weatherCard,
            {
              minHeight: Math.max(48, s(48)),
              paddingHorizontal: rs.xl,
              paddingVertical: rs.md,
              gap: rs.sm,
              borderRadius: radii.lg,
            },
          ]}>
          <View style={[styles.weatherStack, { gap: rs.xs }]}>
            <View style={styles.weatherPrimaryRow}>
              <Symbol
                name={icon ?? 'weather'}
                size="md"
                color={theme.accentPrimary}
              />
              <AppText
                variant="callout"
                color="accent"
                align="center"
                fit
                numberOfLines={1}
                style={styles.weatherPrimaryText}>
                {/* Same ` · ` break + spacing as temp · condition in the label. */}
                {` · ${primaryLabel}`}
              </AppText>
            </View>
            {rangeLabel ? (
              <AppText
                variant="caption"
                color="secondary"
                align="center"
                fit
                numberOfLines={1}>
                {rangeLabel}
              </AppText>
            ) : null}
            <AppText
              variant="caption"
              color="tertiary"
              align="center"
              fit
              numberOfLines={1}>
              {weather.locationLabel}
            </AppText>
          </View>
          <View
            style={[styles.weatherChevron, { right: rs.md }]}
            pointerEvents="none">
            <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
          </View>
        </Card>
      ) : null}

      {completion > 0 || nowLine || summaryLine ? (
        <View style={styles.progressRow}>
          {completion > 0 ? (
            <AgentTestId testID={AgentUiIds.today.progress}>
              <ProgressRing
                progress={completion}
                size={92}
                label={`${Math.round(completion * 100)}%`}
                sublabel="complete"
              />
            </AgentTestId>
          ) : null}
          {nowLine || summaryLine ? (
            <View style={styles.progressText}>
              {nowLine ? (
                <AppText variant="callout" color="accent" numberOfLines={1}>
                  {nowLine}
                </AppText>
              ) : null}
              {summaryLine ? (
                <AppText variant="callout" color="secondary" numberOfLines={3}>
                  {summaryLine}
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <HomeLocationSheet
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  weatherCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherStack: {
    width: '100%',
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: spacing.lg,
  },
  weatherPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    minWidth: 0,
  },
  weatherPrimaryText: {
    flexShrink: 1,
    minWidth: 0,
  },
  weatherChevron: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  progressText: {
    flex: 1,
    gap: spacing.xs,
  },
});
