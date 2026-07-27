import { useLocalSearchParams } from 'expo-router';

import { FlightSearchScreen } from '@/features/travel/flights/flight-search-screen';

export default function FlightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FlightSearchScreen planId={id} />;
}
