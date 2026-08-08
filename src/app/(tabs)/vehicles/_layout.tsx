import { Stack } from 'expo-router';

import { motion } from '@/design-system';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: 'index',
};

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
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        animationDuration: motion.page,
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/settings" />
      <Stack.Screen name="new" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
