import { Stack } from 'expo-router';

import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';

export default function PlantsLayout() {
  return (
    <FeatureThemeProvider feature="plants">
      <PlantsStack />
    </FeatureThemeProvider>
  );
}

function PlantsStack() {
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
