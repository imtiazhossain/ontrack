import { Stack } from 'expo-router';

import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { useTravelPageStyle } from '@/features/travel/travel-surface';

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
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: travelStyle,
      }}
    />
  );
}
