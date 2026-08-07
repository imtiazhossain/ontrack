import { Stack } from 'expo-router';

import { useSafeAreaChrome } from '@/components/primitives';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import {
  travelSafeAreaBackground,
  useTravelPageStyle,
} from '@/features/travel/travel-surface';

export default function TravelLayout() {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelStack />
    </FeatureThemeProvider>
  );
}

function TravelStack() {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  useSafeAreaChrome(travelSafeAreaBackground(theme));
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Transparent by default so itinerary sky chrome / in-header art can
        // show; screens that need the travel wash set contentStyle locally
        // (or inherit via TravelPlanDetailBody pageWash below the sky band).
        contentStyle: { ...travelStyle, backgroundColor: 'transparent' },
      }}
    />
  );
}
