import { Stack } from 'expo-router';

import { motion } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function TodayTabLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: process.env.EXPO_OS === 'android' ? 'fade_from_bottom' : 'default',
        animationDuration: motion.page,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    />
  );
}
