import { Stack, useLocalSearchParams } from 'expo-router';

import {
  AIRPORT_LOOKUP_NOTICE,
  FlightSearchScreen,
} from '@/features/travel/flights/flight-search-screen';
import { travelPageBg } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function FlightsScreen() {
  const { id, previewError } = useLocalSearchParams<{
    id: string;
    previewError?: string;
  }>();
  const theme = useTheme();
  const initialNotice =
    __DEV__ && (previewError === '1' || previewError === 'airports')
      ? AIRPORT_LOOKUP_NOTICE
      : undefined;

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
      <FlightSearchScreen planId={id} initialNotice={initialNotice} />
    </>
  );
}
