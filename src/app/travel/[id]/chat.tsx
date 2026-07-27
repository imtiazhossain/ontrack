import { useLocalSearchParams } from 'expo-router';

import { TravelChatScreen } from '@/features/travel/travel-chat-screen';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TravelChatScreen planId={id} />;
}
