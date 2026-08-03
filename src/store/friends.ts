import { create } from 'zustand';

import { useAvatarCache } from '@/features/account/avatar-cache';
import {
  cancelFriendRequest,
  ensureFriendProfile,
  listFriendRequests,
  listFriends,
  removeFriend,
  respondFriendRequest,
  sendFriendRequest,
  type FriendProfile,
  type FriendRequestItem,
} from '@/services/friends';
import { usePreferences } from '@/store/preferences';

interface FriendsState {
  friends: FriendProfile[];
  incoming: FriendRequestItem[];
  outgoing: FriendRequestItem[];
  loading: boolean;
  error?: string;
  lastLoadedAt?: string;
  hydrate: (opts?: { displayName?: string; email?: string }) => Promise<void>;
  refresh: () => Promise<void>;
  sendRequest: (email: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  remove: (friendUserId: string) => Promise<void>;
  clear: () => void;
}

function cacheFriendAvatars(friends: FriendProfile[]) {
  useAvatarCache.getState().upsertMany(
    friends.map((friend) => ({ userId: friend.userId, avatar: friend.avatar })),
  );
}

async function loadLists() {
  const [friends, requests] = await Promise.all([
    listFriends(),
    listFriendRequests(),
  ]);
  cacheFriendAvatars(friends);
  return {
    friends,
    incoming: requests.filter((item) => item.direction === 'incoming'),
    outgoing: requests.filter((item) => item.direction === 'outgoing'),
  };
}

export const useFriends = create<FriendsState>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  loading: false,
  hydrate: async (opts) => {
    set({ loading: true, error: undefined });
    try {
      const prefsName = usePreferences.getState().name.trim();
      const safePrefsName =
        prefsName && !/^you$/i.test(prefsName) ? prefsName : undefined;
      const profile = await ensureFriendProfile({
        displayName: opts?.displayName || safePrefsName || undefined,
        email: opts?.email,
      });
      const currentName = usePreferences.getState().name.trim();
      if (
        profile.displayName &&
        (!currentName || /^you$/i.test(currentName)) &&
        !/^you$/i.test(profile.displayName)
      ) {
        usePreferences.getState().setName(profile.displayName);
      }
      if (profile.avatar) {
        const local = usePreferences.getState().avatar;
        usePreferences.getState().setAvatar({
          ...profile.avatar,
          // Keep a locally saved tint when the cloud row is still empty (race after save).
          ...(profile.avatar.color || local.color
            ? { color: profile.avatar.color ?? local.color }
            : {}),
          ...(local.kind === 'photo' && local.localPhotoUri
            ? { localPhotoUri: local.localPhotoUri }
            : {}),
        });
        useAvatarCache.getState().upsert(profile.userId, profile.avatar);
      }
      const lists = await loadLists();
      set({
        ...lists,
        loading: false,
        lastLoadedAt: new Date().toISOString(),
      });
    } catch (caught) {
      set({
        loading: false,
        error:
          caught instanceof Error
            ? caught.message
            : 'Friends could not be loaded.',
      });
    }
  },
  refresh: async () => {
    set({ loading: true, error: undefined });
    try {
      const lists = await loadLists();
      set({
        ...lists,
        loading: false,
        lastLoadedAt: new Date().toISOString(),
      });
    } catch (caught) {
      set({
        loading: false,
        error:
          caught instanceof Error
            ? caught.message
            : 'Friends could not be loaded.',
      });
    }
  },
  sendRequest: async (email) => {
    await sendFriendRequest(email);
    await get().refresh();
  },
  acceptRequest: async (requestId) => {
    await respondFriendRequest(requestId, true);
    await get().refresh();
  },
  declineRequest: async (requestId) => {
    await respondFriendRequest(requestId, false);
    await get().refresh();
  },
  cancelRequest: async (requestId) => {
    await cancelFriendRequest(requestId);
    await get().refresh();
  },
  remove: async (friendUserId) => {
    await removeFriend(friendUserId);
    await get().refresh();
  },
  clear: () => {
    useAvatarCache.getState().clear();
    set({
      friends: [],
      incoming: [],
      outgoing: [],
      loading: false,
      error: undefined,
      lastLoadedAt: undefined,
    });
  },
}));
