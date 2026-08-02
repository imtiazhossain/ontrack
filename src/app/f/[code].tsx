import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  AppText,
  Button,
  ErrorMessage,
  LoadingBlock,
  Screen,
} from '@/components/primitives';
import { useAuthSession } from '@/features/auth/auth-provider';
import { useResponsive } from '@/hooks/use-responsive';
import {
  acceptFriendInviteLink,
  resolveFriendInviteLink,
  type FriendInvitePreview,
} from '@/services/friends';
import { useFriends } from '@/store/friends';

export default function FriendInviteRoute() {
  const router = useRouter();
  const { spacing } = useResponsive();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user, isGuest } = useAuthSession();
  const refresh = useFriends((state) => state.refresh);
  const [preview, setPreview] = useState<FriendInvitePreview>();
  const [error, setError] = useState<string>();
  const [working, setWorking] = useState(false);
  const inviteCode = typeof code === 'string' ? decodeURIComponent(code).trim().toLowerCase() : '';

  useEffect(() => {
    if (!inviteCode || !user || isGuest) return;
    let active = true;
    void resolveFriendInviteLink(inviteCode)
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : 'This friend invite is unavailable.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [inviteCode, isGuest, user]);

  if (!user || isGuest) {
    return (
      <Screen>
        <AppText variant="title" style={{ marginBottom: spacing.md }}>
          Friend Invite
        </AppText>
        <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
          Sign in to accept this friend invite.
        </AppText>
        <Button
          onPress={() =>
            router.push({
              pathname: '/account',
              params: { returnTo: `/f/${inviteCode}` },
            } as never)
          }>
          Sign In
        </Button>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AppText variant="title" style={{ marginBottom: spacing.md }}>
          Friend Invite
        </AppText>
        <ErrorMessage message={error} />
        <Button
          style={{ marginTop: spacing.lg }}
          onPress={() => router.replace('/(tabs)/social' as never)}>
          Open Social
        </Button>
      </Screen>
    );
  }

  if (!preview) {
    return (
      <Screen>
        <LoadingBlock label="Opening invite…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title" style={{ marginBottom: spacing.sm }}>
        Add Friend
      </AppText>
      <AppText variant="body" color="secondary" style={{ marginBottom: spacing.lg }}>
        {preview.displayName} invited you to connect on onTrack.
      </AppText>
      <Button
        disabled={working}
        onPress={() => {
          setWorking(true);
          void acceptFriendInviteLink(inviteCode)
            .then(async () => {
              await refresh();
              router.replace('/(tabs)/social' as never);
            })
            .catch((caught: unknown) => {
              setError(
                caught instanceof Error
                  ? caught.message
                  : 'This friend invite could not be accepted.',
              );
            })
            .finally(() => setWorking(false));
        }}>
        {working ? 'Adding…' : `Add ${preview.displayName}`}
      </Button>
      <Button
        variant="ghost"
        style={{ marginTop: spacing.sm }}
        onPress={() => router.replace('/(tabs)/social' as never)}>
        Not Now
      </Button>
    </Screen>
  );
}
