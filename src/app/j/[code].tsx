import { useLocalSearchParams } from 'expo-router';

import { TravelOpenJoinLanding } from '@/features/travel/open-join-landing';

export default function TravelOpenJoinScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <TravelOpenJoinLanding code={typeof code === 'string' ? code : undefined} />;
}
