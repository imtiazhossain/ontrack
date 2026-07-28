import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTodos } from '@/store/todos';
import { useUI } from '@/store/ui';
import { todayKey } from '@/utils/date';

export default function TabsLayout() {
  const theme = useTheme();
  const hasOnboarded = usePreferences((s) => s.hasOnboarded);
  const openTaskCount = useTodos(
    (state) => state.tasks.filter((task) => !task.completed).length,
  );
  const setSelectedDate = useUI((state) => state.setSelectedDate);

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
      <NativeTabs.Trigger
        name="index"
        listeners={{ tabPress: () => setSelectedDate(todayKey()) }}>
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} md="light_mode" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="to-do">
        <NativeTabs.Trigger.Label>Checklists</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'checklist', selected: 'checkmark.circle.fill' }}
          md="checklist"
        />
        {openTaskCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {openTaskCount > 99 ? '99+' : String(openTaskCount)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
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
