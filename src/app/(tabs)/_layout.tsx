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
        freezeOnBlur: true,
        lazy: true,
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
        },
        tabBarBackground: () => null,
      }}>
      <Tabs.Screen
        name="index"
        listeners={{ tabPress: () => setSelectedDate(todayKey()) }}
      />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="to-do" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="plants" />
      <Tabs.Screen name="travel" />
      <Tabs.Screen name="vision-board" />
      <Tabs.Screen name="games" />
      <Tabs.Screen name="vehicles" />
      <Tabs.Screen name="health" />
    </Tabs>
  );
}
