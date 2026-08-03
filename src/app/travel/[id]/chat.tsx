import { Stack, useLocalSearchParams } from 'expo-router';

import { TravelChatScreen } from '@/features/travel/travel-chat-screen';
import { travelPageBg } from '@/features/travel/travel-surface';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

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
      <TravelChatScreen planId={id} />
    </>
  );
}
