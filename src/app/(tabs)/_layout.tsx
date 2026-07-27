import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { usePreferences } from '@/store/preferences';

export default function TabsLayout() {
  const theme = useTheme();
  const hasOnboarded = usePreferences((s) => s.hasOnboarded);
  const enabledAddons = useAddons((s) => s.enabled);

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <NativeTabs
      backgroundColor={theme.backgroundPrimary}
      indicatorColor={theme.backgroundSunken}
      iconColor={theme.textTertiary}
      tintColor={theme.accentPrimary}
      labelStyle={{ selected: { color: theme.accentPrimary } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="light_mode" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      {enabledAddons.fitness ? (
        <NativeTabs.Trigger name="workouts">
          <NativeTabs.Trigger.Label>Workout</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'dumbbell', selected: 'dumbbell.fill' }} md="fitness_center" />
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.line.uptrend.xyaxis" md="monitoring" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more" role="more">
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
