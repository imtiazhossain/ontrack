import { Stack } from 'expo-router';

import { useSafeAreaChrome } from '@/components/primitives';
import { motion } from '@/design-system';
import { travelSafeAreaBackground } from '@/features/travel/travel-surface';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function TravelLayout() {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelStack />
    </FeatureThemeProvider>
  );
}

function TravelStack() {
  const theme = useTheme();
  useSafeAreaChrome(travelSafeAreaBackground(theme));
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        animationDuration: motion.page,
        // Fully transparent — do NOT spread travelPageStyle here.
        // Its experimental_backgroundImage gradient is opaque and covered the
        // AppSafeArea atmosphere photo (only the status-bar sliver remained).
        // Screens that need the wash set style/contentStyle locally
        // (or inherit via TravelPlanDetailBody pageWash below the sky band).
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
