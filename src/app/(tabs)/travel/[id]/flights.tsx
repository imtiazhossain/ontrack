import { Stack, useLocalSearchParams } from 'expo-router';

import {
  FlightSearchScreen,
  GOOGLE_FLIGHTS_NOTICE,
} from '@/features/travel/flights/flight-search-screen';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function FlightsScreen() {
  const { id, previewError } = useLocalSearchParams<{
    id: string;
    previewError?: string;
  }>();
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const initialNotice =
    __DEV__ && (previewError === '1' || previewError === 'google')
      ? GOOGLE_FLIGHTS_NOTICE
      : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { ...travelStyle, paddingTop: 0 },
        }}
      />
      <FlightSearchScreen planId={id} initialNotice={initialNotice} />
    </>
  );
}
