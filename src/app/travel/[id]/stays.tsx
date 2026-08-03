import { Stack, useLocalSearchParams } from 'expo-router';

import { StayProviderScreen } from '@/features/travel/stays/stay-provider-screen';
import { travelPageBg } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function StaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: {
            backgroundColor: travelPageBg(theme),
            paddingTop: 0,
          },
        }}
      />
      <StayProviderScreen planId={id} />
    </>
  );
}
