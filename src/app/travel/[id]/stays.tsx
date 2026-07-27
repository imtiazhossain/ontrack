import { useLocalSearchParams } from 'expo-router';

import { StayProviderScreen } from '@/features/travel/stays/stay-provider-screen';

export default function StaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StayProviderScreen planId={id} />;
}
