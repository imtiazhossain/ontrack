import { Stack, useLocalSearchParams } from 'expo-router';

import { StayProviderScreen } from '@/features/travel/stays/stay-provider-screen';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function StaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { ...travelStyle, paddingTop: 0 },
        }}
      />
      <StayProviderScreen planId={id} />
    </>
  );
}
