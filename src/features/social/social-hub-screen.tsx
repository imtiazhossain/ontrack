import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  LoadingBlock,
  Screen,
  SectionHeader,
} from '@/components/primitives';
import { useAuthSession } from '@/features/auth/auth-provider';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  createFriendInviteUrl,
  getMyFriendInvite,
  setFriendInviteSlug,
  shareFriendInvite,
  type MyFriendInvite,
} from '@/services/friends';
import { useFriends } from '@/store/friends';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

/** App-level friends hub: list, requests, and invite. */
export function SocialHubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing, s, typography } = useResponsive();
  const { user, isGuest } = useAuthSession();
  const friends = useFriends((state) => state.friends);
  const incoming = useFriends((state) => state.incoming);
  const outgoing = useFriends((state) => state.outgoing);
  const loading = useFriends((state) => state.loading);
  const error = useFriends((state) => state.error);
  const hydrate = useFriends((state) => state.hydrate);
  const sendRequest = useFriends((state) => state.sendRequest);
  const acceptRequest = useFriends((state) => state.acceptRequest);
  const declineRequest = useFriends((state) => state.declineRequest);
  const cancelRequest = useFriends((state) => state.cancelRequest);
  const remove = useFriends((state) => state.remove);

  const [email, setEmail] = useState('');
  const [working, setWorking] = useState<string>();
  const [localError, setLocalError] = useState<string>();
  const [invite, setInvite] = useState<MyFriendInvite>();
  const [slugDraft, setSlugDraft] = useState('');

  const signedIn = Boolean(user) && !isGuest;
  const shareBase =
    process.env.EXPO_PUBLIC_FRIEND_SHARE_BASE_URL ??
    process.env.EXPO_PUBLIC_TODO_SHARE_BASE_URL;
  const inviteUrl = invite
    ? createFriendInviteUrl(invite.sharePath, shareBase)
    : undefined;

  const loadInvite = useCallback(async () => {
    const next = await getMyFriendInvite();
    setInvite(next);
    setSlugDraft(next.slug ?? '');
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void hydrate({ email: user?.email ?? undefined });
    void loadInvite().catch(() => undefined);
  }, [hydrate, loadInvite, signedIn, user?.email]);

  const run = useCallback(async (key: string, action: () => Promise<void>) => {
    setWorking(key);
    setLocalError(undefined);
    try {
      await action();
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : 'Something went wrong.',
      );
    } finally {
      setWorking(undefined);
    }
  }, []);

  if (!signedIn) {
    return (
      <Screen refresh={false}>
        <AppText variant="title" style={{ marginBottom: spacing.sm }}>
          Social
        </AppText>
        <EmptyState
          icon="people"
          title="Sign in to add friends"
          message="Friends are available across trips, checklists, vehicles, and more once you sign in with Google or Apple."
          actionLabel="Sign In"
          onAction={() =>
            router.push({
              pathname: '/account',
              params: { returnTo: '/(tabs)/social' },
            } as never)
          }
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={loadInvite}>
      <View style={[styles.titleRow, { marginBottom: spacing.md }]}>
        <View style={styles.titleCopy}>
          <AppText variant="title" fit>
            Social
          </AppText>
          <AppText variant="callout" color="secondary" numberOfLines={2}>
            Add friends once, then invite them to trips, checklists, and more.
          </AppText>
        </View>
      </View>

      {(localError || error) && (
        <ErrorMessage message={localError ?? error ?? ''} />
      )}

      <Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <AppText variant="subheading" fit>
          Your Invite Link
        </AppText>
        <AppText variant="caption" color="secondary" numberOfLines={2}>
          Pick a short name so friends can open ontrack--links.expo.app/f/yourname
        </AppText>
        <View style={[styles.slugRow, { gap: spacing.sm }]}>
          <AppText
            variant="caption"
            color="tertiary"
            fit
            style={[styles.slugPrefix, { fontSize: typography.caption.fontSize }]}>
            /f/
          </AppText>
          <View style={styles.slugField}>
            <Input
              label="Custom link name"
              value={slugDraft}
              onChangeText={(value) =>
                setSlugDraft(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              placeholder="yourname"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
            />
          </View>
        </View>
        <Button
          variant="secondary"
          disabled={Boolean(working) || slugDraft === (invite?.slug ?? '')}
          onPress={() =>
            void run('slug', async () => {
              const saved = await setFriendInviteSlug(slugDraft || null);
              await loadInvite();
              appPrompt.alert(
                saved ? 'Link Updated' : 'Custom Link Cleared',
                saved
                  ? `Friends can use /f/${saved}`
                  : 'Sharing will use a private invite code until you set a name again.',
              );
            })
          }>
          {working === 'slug' ? 'Saving…' : 'Save Link Name'}
        </Button>
        {inviteUrl ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Copy invite link"
            onPress={() => {
              void Clipboard.setStringAsync(inviteUrl);
              appPrompt.alert('Copied', 'Invite link copied to the clipboard.');
            }}>
            <AppText variant="caption" color="accent" numberOfLines={2}>
              {inviteUrl}
            </AppText>
          </Pressable>
        ) : null}
        <Button
          icon="people"
          disabled={Boolean(working)}
          onPress={() =>
            void run('link', async () => {
              const next = await getMyFriendInvite();
              setInvite(next);
              setSlugDraft(next.slug ?? '');
              await shareFriendInvite(next.sharePath);
            })
          }>
          {working === 'link' ? 'Preparing…' : 'Share Invite Link'}
        </Button>
      </Card>

      <Card style={{ gap: spacing.md, marginBottom: spacing.lg }}>
        <AppText variant="subheading" fit>
          Add a Friend
        </AppText>
        <Input
          label="Account email"
          value={email}
          onChangeText={setEmail}
          placeholder="friend@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button
          icon="invite"
          disabled={!email.trim() || Boolean(working)}
          onPress={() =>
            void run('send', async () => {
              await sendRequest(email);
              setEmail('');
              appPrompt.alert(
                'Request Sent',
                'They will see it in Social when signed in with that email.',
              );
            })
          }>
          {working === 'send' ? 'Sending…' : 'Send Request'}
        </Button>
      </Card>

      {incoming.length > 0 ? (
        <>
          <SectionHeader title="Requests" detail={`${incoming.length}`} />
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {incoming.map((request) => (
              <Card
                key={request.id}
                style={{
                  gap: spacing.sm,
                  paddingVertical: spacing.md,
                }}>
                <View style={styles.rowCopy}>
                  <AppText variant="callout" fit>
                    {request.otherDisplayName}
                  </AppText>
                  <AppText variant="caption" color="secondary" fit>
                    {request.otherEmail || 'Wants to be friends'}
                  </AppText>
                </View>
                <View style={[styles.actions, { gap: spacing.sm }]}>
                  <Button
                    style={styles.actionBtn}
                    disabled={Boolean(working)}
                    onPress={() =>
                      void run(`accept-${request.id}`, () =>
                        acceptRequest(request.id),
                      )
                    }>
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    style={styles.actionBtn}
                    disabled={Boolean(working)}
                    onPress={() =>
                      void run(`decline-${request.id}`, () =>
                        declineRequest(request.id),
                      )
                    }>
                    Decline
                  </Button>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {outgoing.length > 0 ? (
        <>
          <SectionHeader title="Outgoing" detail={`${outgoing.length}`} />
          <View style={{ gap: spacing.sm, marginBottom: spacing.lg }}>
            {outgoing.map((request) => (
              <View
                key={request.id}
                style={[
                  styles.pendingRow,
                  {
                    minHeight: Math.max(44, s(48)),
                    borderColor: theme.separator,
                    backgroundColor: theme.backgroundSecondary,
                    paddingHorizontal: spacing.md,
                    gap: spacing.md,
                  },
                ]}>
                <View style={styles.rowCopy}>
                  <AppText variant="callout" fit>
                    {request.otherDisplayName}
                  </AppText>
                  <AppText variant="caption" color="secondary" fit>
                    {request.otherEmail}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel request to ${request.otherDisplayName}`}
                  disabled={Boolean(working)}
                  onPress={() =>
                    void run(`cancel-${request.id}`, () =>
                      cancelRequest(request.id),
                    )
                  }>
                  <AppText variant="caption" color="danger" fit>
                    Cancel
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionHeader title="Friends" detail={`${friends.length}`} />
      {loading && friends.length === 0 ? (
        <LoadingBlock label="Loading friends…" />
      ) : friends.length === 0 ? (
        <EmptyState
          icon="people"
          title="No friends yet"
          message="Send a request by email or share your invite link."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {friends.map((friend) => (
            <View
              key={friend.userId}
              style={[
                styles.pendingRow,
                {
                  minHeight: Math.max(52, s(56)),
                  borderColor: theme.separator,
                  backgroundColor: theme.backgroundSecondary,
                  paddingHorizontal: spacing.md,
                  gap: spacing.md,
                },
              ]}>
              <View style={styles.rowCopy}>
                <AppText variant="callout" fit>
                  {friend.displayName}
                </AppText>
                <AppText variant="caption" color="secondary" fit>
                  {friend.email}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${friend.displayName}`}
                disabled={Boolean(working)}
                onPress={() => {
                  void confirmDestructiveAction({
                    title: 'Remove Friend?',
                    message: `${friend.displayName} will be removed from your friends list. Shared trips and lists stay as they are.`,
                    actionLabel: 'Remove',
                    onConfirm: () =>
                      void run(`remove-${friend.userId}`, () =>
                        remove(friend.userId),
                      ),
                  });
                }}>
                <AppText variant="caption" color="danger" fit>
                  Remove
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  titleCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 4,
  },
  slugRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  slugPrefix: {
    flexShrink: 0,
    paddingBottom: 14,
  },
  slugField: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  rowCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
  },
});
