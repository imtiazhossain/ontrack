import { Redirect, Tabs } from 'expo-router';

import { BottomNavBar } from '@/components/navigation/bottom-nav-bar';
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
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Keep switches snappy — freezing blurred tabs adds a visible hitch
        // when hopping between sections in the bottom nav rail.
        freezeOnBlur: false,
        lazy: true,
        animation: 'none',
        sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
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
