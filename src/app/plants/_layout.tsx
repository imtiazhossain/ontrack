import { Stack } from 'expo-router';

import { motion } from '@/design-system';
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
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        animationDuration: motion.page,
        contentStyle: { backgroundColor: theme.backgroundPrimary },
      }}
    />
  );
}
