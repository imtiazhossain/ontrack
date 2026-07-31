import { Stack } from 'expo-router';

import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';

export default function VehiclesLayout() {
  return (
    <FeatureThemeProvider feature="vehicles">
      <VehiclesStack />
    </FeatureThemeProvider>
  );
}

function VehiclesStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.backgroundPrimary },
      }}
    />
  );
}
