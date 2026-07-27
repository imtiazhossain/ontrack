import { useLocalSearchParams } from 'expo-router';

import { TravelInviteLanding } from '@/features/travel/invite-landing';

export default function ShortTravelInviteScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  return <TravelInviteLanding invite={code ? `s.${code}` : undefined} />;
}
