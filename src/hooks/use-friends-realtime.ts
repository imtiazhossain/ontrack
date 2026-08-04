import { useEffect } from 'react';
import { AppState } from 'react-native';

import { subscribeToFriendChanges } from '@/services/friends';
import { useFriends } from '@/store/friends';

/** Keeps a signed-in user's friend cache current when another user responds. */
export function useFriendsRealtime(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      void useFriends.getState().refresh().catch(() => undefined);
    };
    const channel = subscribeToFriendChanges(userId, refresh);
    const appState = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    return () => {
      appState.remove();
      void channel?.unsubscribe();
    };
  }, [userId]);
}
