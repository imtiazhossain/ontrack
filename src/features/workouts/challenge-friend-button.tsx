import { useState } from 'react';

import { appPrompt, Button } from '@/components/primitives';
import { PeoplePicker } from '@/features/social/people-picker';
import type { FriendProfile } from '@/services/friends';
import { useFriends } from '@/store/friends';

/** Stub entry point for future workout challenges. */
export function ChallengeFriendButton({ style }: { style?: object }) {
  const [pickingFriends, setPickingFriends] = useState(false);
  const hydrateFriends = useFriends((state) => state.hydrate);

  const challengeFriends = (friends: FriendProfile[]) => {
    if (!friends.length) return;
    appPrompt.alert(
      'Coming Soon',
      `Workout challenges for ${friends
        .map((friend) => friend.displayName)
        .join(', ')} are on the way.`,
    );
  };

  return (
    <>
      <Button
        variant="secondary"
        icon="people"
        style={style}
        onPress={() => {
          void hydrateFriends().catch(() => undefined);
          setPickingFriends(true);
        }}>
        Challenge a Friend
      </Button>
      <PeoplePicker
        visible={pickingFriends}
        title="Challenge a Friend"
        confirmLabel="Challenge"
        multi={false}
        onClose={() => setPickingFriends(false)}
        onConfirm={challengeFriends}
      />
    </>
  );
}
