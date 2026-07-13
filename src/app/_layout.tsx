import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { useHydrated } from '@/hooks/use-hydrated';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';

export default function RootLayout() {
  const theme = useTheme();
  const hydrated = useHydrated();
  const seedIfNeeded = useSchedule((s) => s.seedIfNeeded);

  useEffect(() => {
    if (hydrated) seedIfNeeded();
  }, [hydrated, seedIfNeeded]);

  if (!hydrated) {
    return <View style={{ flex: 1, backgroundColor: theme.backgroundPrimary }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.backgroundPrimary } }}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="day/[date]" />
          <Stack.Screen name="activity-form" options={{ presentation: 'modal' }} />
          <Stack.Screen name="detail/food/[id]" />
          <Stack.Screen name="detail/gym/[id]" />
          <Stack.Screen name="detail/gym-active/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
          <Stack.Screen name="detail/work/[id]" />
          <Stack.Screen name="detail/movie/[id]" />
          <Stack.Screen name="detail/sleep/[id]" />
          <Stack.Screen name="detail/generic/[id]" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
