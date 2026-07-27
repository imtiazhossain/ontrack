import { useLocalSearchParams } from 'expo-router';

import { TravelPlanDetail } from '@/features/travel/travel-plan-detail';

export default function TravelPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TravelPlanDetail planId={id} />;
}
