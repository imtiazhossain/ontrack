import { Stack, useLocalSearchParams } from 'expo-router';

import { TravelChatScreen } from '@/features/travel/travel-chat-screen';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          contentStyle: { ...travelStyle, paddingTop: 0 },
        }}
      />
      <TravelChatScreen planId={id} />
    </>
  );
}
