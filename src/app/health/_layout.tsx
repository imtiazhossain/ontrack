import { Stack } from 'expo-router';

import { motion } from '@/design-system';

export default function HealthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        animationDuration: motion.page,
      }}
    />
  );
}
