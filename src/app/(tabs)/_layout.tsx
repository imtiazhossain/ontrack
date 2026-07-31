import { Redirect, Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/navigation/floating-tab-bar';
import { usePreferences } from '@/store/preferences';
import { useUI } from '@/store/ui';
import { todayKey } from '@/utils/date';

export default function TabsLayout() {
  const hasOnboarded = usePreferences((s) => s.hasOnboarded);
  const setSelectedDate = useUI((state) => state.setSelectedDate);

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: () => setSelectedDate(todayKey()) }}
      />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="to-do" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="plants" />
      <Tabs.Screen name="travel" />
      <Tabs.Screen name="vision-board" />
    </Tabs>
  );
}
