import { Stack, useRouter } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { getSharedPayloads } from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import {
    AppPromptHost,
    AppSafeArea,
    HeaderBackButton,
    LoadingBlock,
    RouteErrorBoundary,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { AuthSessionProvider, useAuthSession } from '@/features/auth/auth-provider';
import { withoutGuestDirtyTracking } from '@/features/auth/guest-dirty-tracking';
import { useHydrated } from '@/hooks/use-hydrated';
import { useMealPhotoMigration } from '@/hooks/use-meal-photo-migration';
import { useTheme } from '@/hooks/use-theme';
import { useTodoCollaboration } from '@/hooks/use-todo-collaboration';
import { getNotificationsModule } from '@/services/notifications/runtime';
import { configurePlantNotifications } from '@/services/plants/notifications';
import { reconcilePlantSchedules } from '@/services/plants/schedule';
import { useAuthAccess } from '@/store/auth-access';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { deferUntilIdle } from '@/utils/defer-until-idle';

/** Expo Router catches render failures so the app never sticks on a blank white view. */
export { RouteErrorBoundary as ErrorBoundary };

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const theme = useTheme();
  const hydrated = useHydrated();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider value={theme.name === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
          <AppSafeArea>
            <AuthSessionProvider hydrated={hydrated}>
              <RootNavigator hydrated={hydrated} />
              <AppPromptHost />
            </AuthSessionProvider>
          </AppSafeArea>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ hydrated }: { hydrated: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { phase, isGuest } = useAuthSession();
  const seedIfNeeded = useSchedule((state) => state.seedIfNeeded);
  const aiEnabled = usePreferences((state) => state.aiEnabled);
  const hasOnboarded = usePreferences((state) => state.hasOnboarded);
  const appAccess = isGuest || phase === 'authenticated';
  const welcomeAccess = phase === 'welcome' || phase === 'authenticating' || phase === 'error';
  useTodoCollaboration(hydrated && phase === 'authenticated');

  useEffect(() => {
    if (phase !== 'authenticated') return;
    const returnTo = useAuthAccess.getState().takeAuthReturnTo();
    if (returnTo) router.replace(returnTo as never);
  }, [phase, router]);

  useEffect(() => {
    if (hydrated && appAccess) withoutGuestDirtyTracking(seedIfNeeded);
  }, [appAccess, hydrated, seedIfNeeded]);

  useMealPhotoMigration(hydrated && appAccess && aiEnabled);

  useEffect(() => {
    if (!hydrated || !appAccess || !hasOnboarded || Platform.OS === 'web') return;
    try {
      if (getSharedPayloads().length > 0) router.replace('/share-import' as never);
    } catch {
      // Older native builds do not include incoming sharing.
    }
  }, [appAccess, hasOnboarded, hydrated, router]);

  useEffect(() => {
    if (!hydrated || !appAccess) return;
    let active = true;
    let subscription: { remove: () => void } | undefined;
    const redirect = (
      response: import('expo-notifications').NotificationResponse | null,
    ) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/plants/')) {
        router.push(url as never);
        return;
      }
      // Prefer tripId (capability tokens are no longer sent in push payloads).
      const tripId = response?.notification.request.content.data?.tripId;
      const legacyChatCode = response?.notification.request.content.data?.chatCode;
      if (url === '/travel-chat') {
        const plan = useTravel.getState().plans.find((item) =>
          (typeof tripId === 'string' && item.id === tripId) ||
          (typeof legacyChatCode === 'string' &&
            (item.chatAccessCode === legacyChatCode ||
              item.participants.some((person) => person.inviteCode === legacyChatCode))),
        );
        if (plan) router.push(`/travel/${plan.id}/chat` as never);
      }
    };
    const cancelIdle = deferUntilIdle(() => {
      if (!active) return;
      void configurePlantNotifications().catch(() => undefined).then(reconcilePlantSchedules);
      if (Platform.OS === 'web') return;
      void getNotificationsModule().then((notifications) => {
        if (!notifications || !active) return;
        void notifications.getLastNotificationResponseAsync().then(redirect);
        subscription = notifications.addNotificationResponseReceivedListener(redirect);
      });
    });
    return () => {
      active = false;
      cancelIdle();
      subscription?.remove();
    };
  }, [appAccess, hydrated, router]);

  useEffect(() => {
    if (!hydrated || phase === 'loading') return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated, phase]);

  if (!hydrated || phase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundPrimary, justifyContent: 'center' }}>
        <LoadingBlock label="Loading onTrack…" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.backgroundPrimary },
        ...(process.env.EXPO_OS === 'ios'
          ? {
              unstable_headerLeftItems: () => [
                {
                  type: 'custom' as const,
                  element: <HeaderBackButton />,
                  hidesSharedBackground: true,
                },
              ],
            }
          : { headerLeft: () => <HeaderBackButton /> }),
        contentStyle: {
          backgroundColor: theme.backgroundPrimary,
          paddingTop: spacing.md,
        },
      }}>
      <Stack.Protected guard={welcomeAccess}>
        <Stack.Screen
          name="welcome"
          options={{
            animation: 'fade',
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'resolving-data'}>
        <Stack.Screen
          name="auth/data-choice"
          options={{
            animation: 'fade',
            headerShown: false,
            gestureEnabled: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={appAccess}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            animation: 'fade',
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen
          name="vision-board/[id]"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen
          name="vision-board/all"
          options={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen
          name="vision-board/category-editor"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="vision-board/item-editor"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="agents" />
        <Stack.Screen name="todos/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="todos/[id]/settings" />
        <Stack.Screen name="todos/[id]/recipe-import" />
        <Stack.Screen name="todo-collaborators" />
        <Stack.Screen name="todo-invites" />
        <Stack.Screen name="invite/travel" />
        <Stack.Screen name="travel/[id]" />
        <Stack.Screen name="travel/[id]/flights" />
        <Stack.Screen name="travel/[id]/stays" />
        <Stack.Screen name="travel/[id]/chat" />
        <Stack.Screen name="nutrition-profile" />
        <Stack.Screen name="activity-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="detail/food/[id]" />
        <Stack.Screen name="detail/gym/[id]" />
        <Stack.Screen
          name="detail/gym-active/[id]"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen
          name="games/balloon-pop"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
            contentStyle: { backgroundColor: theme.backgroundPrimary },
          }}
        />
        <Stack.Screen name="detail/work/[id]" />
        <Stack.Screen name="detail/movie/[id]" />
        <Stack.Screen name="detail/sleep/[id]" />
        <Stack.Screen name="detail/generic/[id]" />
        <Stack.Screen name="plants/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plants/[id]" />
        <Stack.Screen name="plants/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plants/[id]/check-in" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={appAccess && hasOnboarded}>
        <Stack.Screen
          name="share-import"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="share-event"
          options={{ gestureEnabled: false }}
        />
      </Stack.Protected>
      <Stack.Screen
        name="auth/callback"
        options={{
          animation: 'fade',
          headerShown: false,
          contentStyle: { backgroundColor: theme.backgroundPrimary },
        }}
      />
      <Stack.Screen name="i/[code]" />
      <Stack.Screen name="l/[code]" />
      <Stack.Screen name="c/[code]" />
    </Stack>
  );
}
