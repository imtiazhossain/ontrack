import { Stack, useRouter } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
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
import { useRootStartupEffects } from '@/hooks/use-root-startup-effects';
import { useTheme } from '@/hooks/use-theme';
import { useTodoCollaboration } from '@/hooks/use-todo-collaboration';
import { useVehicleCollaboration } from '@/hooks/use-vehicle-collaboration';
import { useAuthAccess } from '@/store/auth-access';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { AgentUiRouteSync } from '@/utils/agent-ui';

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
  useVehicleCollaboration(hydrated && phase === 'authenticated');
  useRootStartupEffects({
    hydrated,
    appAccess,
    hasOnboarded,
    phase,
    router,
  });

  useEffect(() => {
    if (phase !== 'authenticated') return;
    const returnTo = useAuthAccess.getState().takeAuthReturnTo();
    if (returnTo) router.replace(returnTo as never);
  }, [phase, router]);

  useEffect(() => {
    if (hydrated && appAccess) withoutGuestDirtyTracking(seedIfNeeded);
  }, [appAccess, hydrated, seedIfNeeded]);

  useMealPhotoMigration(hydrated && appAccess && aiEnabled);

  if (!hydrated || phase === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundPrimary, justifyContent: 'center' }}>
        <LoadingBlock label="Loading onTrack…" />
      </View>
    );
  }

  return (
    <>
        <AgentUiRouteSync />
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
        <Stack.Screen
          name="travel/[id]/flights"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="travel/[id]/stays" />
        <Stack.Screen name="travel/[id]/chat" options={{ headerShown: false }} />
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
        <Stack.Screen name="vehicles/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="vehicles/[id]" />
        <Stack.Screen name="vehicles/[id]/settings" />
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
      <Stack.Screen name="j/[code]" />
      <Stack.Screen name="f/[code]" />
      <Stack.Screen name="l/[code]" />
      <Stack.Screen name="c/[code]" />
      <Stack.Screen name="v/[code]" />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Use' }} />
      <Stack.Screen
        name="agent/ui"
        options={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
          contentStyle: { backgroundColor: theme.backgroundPrimary },
        }}
      />
    </Stack>
    </>
  );
}
