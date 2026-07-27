import { useLocalSearchParams } from 'expo-router';

import { TravelInviteLanding } from '@/features/travel/invite-landing';

export default function TravelInviteScreen() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  return <TravelInviteLanding invite={invite} />;
}
