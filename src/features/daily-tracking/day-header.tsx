import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, IconButton, ProgressRing, Symbol } from '@/components/primitives';
import { layout, spacing, timeOfDayGradient } from '@/design-system';
import { HomeLocationSheet } from '@/features/daily-tracking/home-location-sheet';
import {
  unitSymbol,
  useHomeWeather,
} from '@/features/daily-tracking/use-home-weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDateLong, formatWeekday, isToday } from '@/utils/date';
import { haptics } from '@/utils/haptics';

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
  const gradient = timeOfDayGradient(theme, isToday(date) ? new Date().getHours() : 12);
  const viewingToday = isToday(date);
  const { hasLocation, weather, icon, loading, detectingLocation, error } = useHomeWeather();
  const [locationOpen, setLocationOpen] = useState(false);

  return (
    <LinearGradient colors={gradient} style={[styles.container, { paddingTop: topInset + spacing.md }]}>
      <View style={styles.topRow}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel="Previous day"
          onPress={() => onChangeDate(addDays(date, -1))}
          background="transparent"
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
          onPress={() => onChangeDate(addDays(date, 1))}
          background="transparent"
        />
      </View>

      {viewingToday ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            weather
              ? `${weather.condition}, ${weather.temperature}${unitSymbol(weather.temperatureUnit)} in ${weather.locationLabel}. Edit home location.`
              : hasLocation
                ? 'Edit home location for weather'
                : 'Set location for weather'
          }
          onPress={() => {
            haptics.tap();
            setLocationOpen(true);
          }}
          style={({ pressed }) => [
            styles.weatherRow,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
              opacity: pressed ? 0.85 : 1,
              minHeight: Math.max(44, s(44)),
              paddingHorizontal: rs.md,
              paddingVertical: rs.sm,
              gap: rs.sm,
            },
          ]}>
          <Symbol
            name={icon ?? (hasLocation ? 'weather' : 'location')}
            size="md"
            color={theme.accentPrimary}
          />
          <View style={styles.weatherCopy}>
            {weather ? (
              <>
                <AppText variant="callout" color="accent" fit numberOfLines={1}>
                  {`${weather.temperature}${unitSymbol(weather.temperatureUnit)} · ${weather.condition}`}
                </AppText>
                <AppText variant="caption" color="secondary" fit numberOfLines={1}>
                  {weather.locationLabel}
                </AppText>
              </>
            ) : loading || detectingLocation ? (
              <AppText variant="callout" color="secondary" fit numberOfLines={1}>
                {detectingLocation ? 'Finding your location…' : 'Checking weather…'}
              </AppText>
            ) : error && hasLocation ? (
              <AppText variant="callout" color="secondary" fit numberOfLines={1}>
                Weather unavailable · tap to edit location
              </AppText>
            ) : (
              <AppText variant="callout" color="secondary" fit numberOfLines={1}>
                Set location for weather
              </AppText>
            )}
          </View>
          <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
        </Pressable>
      ) : null}

      <View style={styles.progressRow}>
        <ProgressRing
          progress={completion}
          size={92}
          label={`${Math.round(completion * 100)}%`}
          sublabel="complete"
        />
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
      </View>

      <HomeLocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  weatherCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
