import { Stack, usePathname, useRouter } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { NavigationSessionSync } from '@/components/navigation/navigation-session-sync';
import {
    AppPromptHost,
    AppSafeArea,
    HeaderBackButton,
    LoadingBlock,
    RouteErrorBoundary,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { UsageAnalyticsTracker } from '@/features/analytics/usage-analytics-tracker';
import { AuthSessionProvider, useAuthSession } from '@/features/auth/auth-provider';
import { withoutGuestDirtyTracking } from '@/features/auth/guest-dirty-tracking';
import {
    TravelAtmosphereProvider,
    useTravelRouteAtmosphere,
} from '@/features/travel/travel-atmosphere';
import { selectTravelAtmospherePlan } from '@/features/travel/travel-atmosphere-model';
import { useApplyOtaUpdate } from '@/hooks/use-apply-ota-update';
import { useHydrated } from '@/hooks/use-hydrated';
import { useMealPhotoMigration } from '@/hooks/use-meal-photo-migration';
import { useRootStartupEffects } from '@/hooks/use-root-startup-effects';
import { useTheme } from '@/hooks/use-theme';
import { useTodoCollaboration } from '@/hooks/use-todo-collaboration';
import { useVehicleCollaboration } from '@/hooks/use-vehicle-collaboration';
import { useAuthAccess } from '@/store/auth-access';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { AgentUiFabRestoreHost, AgentUiOverlay, AgentUiRouteSync } from '@/utils/agent-ui';
import { todayKey } from '@/utils/date';
import { ThemeToggleFab, ThemeToggleFabHost } from '@/utils/dev-theme-toggle';

/** Expo Router catches render failures so the app never sticks on a blank white view. */
export { RouteErrorBoundary as ErrorBoundary };

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  useApplyOtaUpdate();
  const theme = useTheme();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const travelRoute = pathname === '/travel' || pathname.startsWith('/travel/');
  const plans = useTravel((state) => state.plans);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const atmospherePlan = selectTravelAtmospherePlan(plans, pathname, todayKey());
  const atmosphere = useTravelRouteAtmosphere(
    atmospherePlan?.destination,
    dateDisplayFormat,
    travelRoute && hydrated,
  );

  // Keep navigator chrome transparent so AppSafeArea washes (Travel atmosphere,
  // Today time-of-day) continue under the status bar without a hairline seam
  // from React Navigation's default rgb(242,242,242) screen fill.
  const navigationTheme = useMemo(() => {
    const base = theme.name === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: 'transparent',
      },
    };
  }, [theme.name]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
          <TravelAtmosphereProvider atmosphere={atmosphere}>
            <AppSafeArea>
              <AuthSessionProvider hydrated={hydrated}>
                <RootNavigator hydrated={hydrated} />
                <AppPromptHost />
              </AuthSessionProvider>
            </AppSafeArea>
          </TravelAtmosphereProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator({ hydrated }: { hydrated: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const { phase } = useAuthSession();
  const seedIfNeeded = useSchedule((state) => state.seedIfNeeded);
  const aiEnabled = usePreferences((state) => state.aiEnabled);
  const hasOnboarded = usePreferences((state) => state.hasOnboarded);
  // Guest upgrade (`authenticating`) must not keep the full app shell open —
  // only settled guest / authenticated phases get app routes.
  const appAccess = phase === 'authenticated' || phase === 'guest';
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
    <View style={{ flex: 1 }}>
        <AgentUiRouteSync />
        <NavigationSessionSync />
        <UsageAnalyticsTracker />
        <AgentUiFabRestoreHost>
        <ThemeToggleFabHost>
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
            // Transparent so Travel’s AppSafeArea chrome atmosphere can paint
            // continuously under the status bar without a seam at the inset.
            // Tab screens still fill with their own Screen backgrounds.
            contentStyle: { backgroundColor: 'transparent' },
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
        <Stack.Screen name="design-system" options={{ headerShown: false }} />
        <Stack.Screen name="api-usage" options={{ headerShown: false }} />
        <Stack.Screen name="integrations" options={{ headerShown: false }} />
        <Stack.Screen name="developer" options={{ headerShown: false }} />
        <Stack.Screen name="todos/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="todos/[id]/settings" />
        <Stack.Screen name="todos/[id]/recipe-import" />
        <Stack.Screen name="todo-collaborators" />
        <Stack.Screen name="todo-invites" />
        <Stack.Screen name="invite/travel" />
        <Stack.Screen
          name="travel"
          options={{
            headerShown: false,
            // Transparent like "(tabs)" so the itinerary header sky painted on
            // AppSafeArea chrome shows through below the status bar. Travel
            // screens still fill via the nested stack's travelStyle content.
            contentStyle: { backgroundColor: 'transparent', paddingTop: 0 },
          }}
        />
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
        <Stack.Screen name="health" options={{ headerShown: false }} />
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
        </ThemeToggleFabHost>
        </AgentUiFabRestoreHost>
        {/* After Stack inside flex:1 so absolute overlay covers the window. */}
        <AgentUiOverlay />
        <ThemeToggleFab />
    </View>
  );
}
