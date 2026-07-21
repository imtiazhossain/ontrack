import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { useHydrated } from '@/hooks/use-hydrated';
import { useTheme } from '@/hooks/use-theme';
import { useSchedule } from '@/store/schedule';
import { configurePlantNotifications } from '@/services/plants/notifications';
import { reconcilePlantSchedules } from '@/services/plants/schedule';

export default function RootLayout() {
  const theme = useTheme();
  const hydrated = useHydrated();
  const seedIfNeeded = useSchedule((s) => s.seedIfNeeded);
  const router = useRouter();

  useEffect(() => {
    if (hydrated) seedIfNeeded();
  }, [hydrated, seedIfNeeded]);

  useEffect(() => {
    if (!hydrated) return;
    void configurePlantNotifications().catch(() => undefined).then(reconcilePlantSchedules);
    if (Platform.OS === 'web') return;
    const redirect = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/plants/')) router.push(url as never);
    };
    void Notifications.getLastNotificationResponseAsync().then(redirect);
    const subscription = Notifications.addNotificationResponseReceivedListener(redirect);
    return () => subscription.remove();
  }, [hydrated, router]);

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
          <Stack.Screen name="plants/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="plants/[id]" />
          <Stack.Screen name="plants/[id]/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="plants/[id]/check-in" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
