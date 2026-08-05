import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  Card,
  ErrorMessage,
  Input,
  Screen,
  SectionHeader,
  Symbol,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import { useAuthSession } from '@/features/auth/auth-provider';
import { PeoplePicker } from '@/features/social/people-picker';
import { shareTodoInvite } from '@/features/todos/share';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { FriendProfile } from '@/services/friends';
import {
  createTodoEmailInvite,
  createTodoShareLink,
  deleteSharedTodoList,
  leaveTodoList,
  loadTodoListPendingInvites,
  publishTodoList,
  removeTodoMember,
  revokeTodoEmailInvite,
  revokeTodoShareLink,
  transferTodoListOwnership,
  type PendingTodoEmailInvite,
} from '@/services/todos/collaboration';
import { deletePersistedRecipeImage } from '@/services/recipes';
import { useFriends } from '@/store/friends';
import { useTodos, type TodoMember } from '@/store/todos';
import { AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

export function TodoListSettingsScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const { user } = useAuthSession();
  const list = useTodos((state) => state.lists.find((item) => item.id === listId));
  const allMembers = useTodos((state) => state.members);
  const members = useMemo(
    () => allMembers.filter((member) => member.listId === listId),
    [allMembers, listId],
  );
  const otherMembers = useMemo(
    () => members.filter((member) => member.role === 'member'),
    [members],
  );
  const renameList = useTodos((state) => state.renameList);
  const setListKind = useTodos((state) => state.setListKind);
  const recipeCount = useTodos(
    (state) =>
      state.recipes.filter((recipe) => recipe.listId === listId).length,
  );
  const deletePrivateList = useTodos((state) => state.deleteList);
  const [name, setName] = useState(list?.name ?? '');
  const [email, setEmail] = useState('');
  const [working, setWorking] = useState<string>();
  const [error, setError] = useState<string>();
  const [pendingInvites, setPendingInvites] = useState<PendingTodoEmailInvite[]>([]);
  const [pickingFriends, setPickingFriends] = useState(false);
  const hydrateFriends = useFriends((state) => state.hydrate);

  const refreshPending = () =>
    loadTodoListPendingInvites(listId).then(setPendingInvites);

  useEffect(() => {
    if (!user || list?.mode !== 'shared' || list.role !== 'owner') return;
    void refreshPending().catch(() => undefined);
    void hydrateFriends().catch(() => undefined);
  }, [list?.mode, list?.role, listId, user, hydrateFriends]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!list) {
    return (
      <Screen contentStyle={{ ...styles.center, gap: spacing.lg }}>
        <Symbol name="tasks" size={40} color={theme.textTertiary} />
        <AppText variant="heading">List Unavailable</AppText>
        <Button onPress={() => router.replace('/(tabs)/to-do' as never)}>
          Back to Lists
        </Button>
      </Screen>
    );
  }

  const owner = list.role === 'owner';
  const run = async (key: string, action: () => Promise<void>) => {
    setWorking(key);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setWorking(undefined);
    }
  };

  const inviteFriendsToList = (friends: FriendProfile[]) => {
    if (!friends.length) return;
    void run('friends', async () => {
      if (list.mode === 'private') await publishTodoList(list.id);
      for (const friend of friends) {
        await createTodoEmailInvite(list.id, friend.email);
      }
      await refreshPending();
      appPrompt.alert(
        'Invitations Ready',
        'Selected friends will see these in their onTrack invitation inbox.',
      );
    });
  };

  const requireSignIn = () => {
    router.push({
      pathname: '/account',
      params: { returnTo: `/todos/${list.id}/settings` },
    } as never);
  };

  const beginSharing = () => {
    if (!user) return requireSignIn();
    void run('publish', async () => {
      await publishTodoList(list.id);
      const code = await createTodoShareLink(list.id);
      await shareTodoInvite(list.name, code);
    });
  };

  const shareLink = () => {
    if (!user) return requireSignIn();
    void run('link', async () => {
      const code = list.shareCode ?? await createTodoShareLink(list.id);
      await shareTodoInvite(list.name, code);
    });
  };

  const leaveList = () => {
    confirmDestructiveAction({
      title: 'Leave This List?',
      message: 'It will disappear from your account.',
      actionLabel: 'Leave',
      onConfirm: () =>
        void run('leave', async () => {
          await leaveTodoList(list.id);
          router.replace('/(tabs)/to-do' as never);
        }),
    });
  };

  const transferOwnership = (member: TodoMember, leaveAfter: boolean) => {
    void run(`transfer-${member.userId}`, async () => {
      await transferTodoListOwnership(list.id, member.userId);
      if (leaveAfter) {
        await leaveTodoList(list.id);
        router.replace('/(tabs)/to-do' as never);
        return;
      }
      appPrompt.alert(
        'Ownership Transferred',
        `${member.displayName} is now the owner. You can leave whenever you’re ready.`,
      );
    });
  };

  const promptTransfer = (member: TodoMember) => {
    appPrompt.alert(
      'Transfer Ownership?',
      `${member.displayName} will become the owner and manage this list. You become a member, or you can leave now.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: () => transferOwnership(member, false),
        },
        {
          text: 'Transfer & Leave',
          style: 'destructive',
          onPress: () => transferOwnership(member, true),
        },
      ],
    );
  };

  const removeList = () => {
    confirmDestructiveAction({
      title: 'Delete This List?',
      message: 'The list and every item in it will be permanently deleted.',
      onConfirm: () => {
        void run('delete', async () => {
          if (list.mode === 'private') {
            useTodos
              .getState()
              .recipes.filter((recipe) => recipe.listId === list.id)
              .forEach((recipe) =>
                deletePersistedRecipeImage(recipe.sourceImageUri),
              );
          }
          if (list.mode === 'shared') await deleteSharedTodoList(list.id);
          else deletePrivateList(list.id);
          router.replace('/(tabs)/to-do' as never);
        });
      },
    });
  };

  return (
    <>
    <Screen
      contentStyle={{
        ...styles.container,
        gap: spacing.md,
        paddingBottom: spacing.xxxl,
      }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="overline" color="accent">
          {list.mode === 'shared' ? 'Collaborative List' : 'Private List'}
        </AppText>
        <AppText variant="display">{list.name}</AppText>
      </View>

      {owner ? (
        <Card style={{ gap: spacing.md }}>
          <AppText variant="heading">List Details</AppText>
          <Input
            label="List Name"
            testID={AgentUiIds.listSettings.name}
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
          <Button
            testID={AgentUiIds.listSettings.saveName}
            disabled={!name.trim() || name.trim() === list.name}
            onPress={() => renameList(list.id, name)}>
            Save name
          </Button>
          <AppText variant="overline" color="tertiary">
            List type
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: list.kind === 'checklist' }}
              disabled={list.kind === 'grocery' && recipeCount > 0}
              onPress={() => setListKind(list.id, 'checklist')}
              style={[
                styles.kindChoice,
                {
                  minHeight: Math.max(44, s(48)),
                  gap: spacing.sm,
                  borderColor:
                    list.kind === 'checklist'
                      ? theme.accentPrimary
                      : theme.separator,
                  backgroundColor:
                    list.kind === 'checklist'
                      ? theme.accentFaint
                      : theme.backgroundSunken,
                  opacity:
                    list.kind === 'grocery' && recipeCount > 0 ? 0.45 : 1,
                },
              ]}>
              <Symbol name="tasks" size={18} color={theme.textSecondary} />
              <AppText variant="caption" fit>
                Checklist
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: list.kind === 'grocery' }}
              onPress={() => setListKind(list.id, 'grocery')}
              style={[
                styles.kindChoice,
                {
                  minHeight: Math.max(44, s(48)),
                  gap: spacing.sm,
                  borderColor:
                    list.kind === 'grocery'
                      ? theme.accentPrimary
                      : theme.separator,
                  backgroundColor:
                    list.kind === 'grocery'
                      ? theme.accentFaint
                      : theme.backgroundSunken,
                },
              ]}>
              <Symbol name="groceries" size={18} color={theme.textSecondary} />
              <AppText variant="caption" fit>
                Grocery
              </AppText>
            </Pressable>
          </View>
          {list.kind === 'grocery' && recipeCount > 0 ? (
            <AppText variant="caption" color="secondary">
              Delete the {recipeCount === 1 ? 'recipe' : `${recipeCount} recipes`}{' '}
              before converting this list back to a checklist.
            </AppText>
          ) : null}
        </Card>
      ) : (
        <Card variant="sunken" style={{ gap: spacing.md }}>
          <AppText variant="heading">Shared with You</AppText>
          <AppText variant="body" color="secondary">
            {list.ownerName ?? 'The owner'} manages items, assignments, and membership.
          </AppText>
        </Card>
      )}

      {owner ? (
        <>
          <SectionHeader title="Sharing" />
          {list.mode === 'private' ? (
            <Card style={{ gap: spacing.md }}>
              <AppText variant="subheading">Work Together Live</AppText>
              <AppText variant="body" color="secondary">
                Sharing moves this list to its protected collaborative space. You remain the owner.
              </AppText>
              <Button
                icon="people"
                disabled={Boolean(working)}
                onPress={beginSharing}>
                {working === 'publish' ? 'Preparing…' : 'Share This List'}
              </Button>
            </Card>
          ) : (
            <>
              <Card style={{ gap: spacing.md }}>
                <AppText variant="subheading">Secure Join Link</AppText>
                <AppText variant="body" color="secondary">
                  Any signed-in onTrack user with the link can join until you revoke it.
                </AppText>
                <Button disabled={Boolean(working)} onPress={shareLink} icon="send">
                  {working === 'link' ? 'Preparing…' : 'Share Join Link'}
                </Button>
                {list.shareCode ? (
                  <Button
                    variant="ghost"
                    disabled={Boolean(working)}
                    onPress={() =>
                      void run('revoke', () => revokeTodoShareLink(list.id))
                    }>
                    Revoke link
                  </Button>
                ) : null}
              </Card>

              <Card style={{ gap: spacing.md }}>
                <AppText variant="subheading">Invite an Account</AppText>
                <Button
                  icon="people"
                  variant="secondary"
                  disabled={Boolean(working)}
                  onPress={() => setPickingFriends(true)}>
                  Invite from Friends
                </Button>
                <Input
                  label="onTrack account email"
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
                    void run('email', async () => {
                      await createTodoEmailInvite(list.id, email);
                      await refreshPending();
                      setEmail('');
                      appPrompt.alert('Invitation Ready', 'It now appears in their onTrack invitation inbox.');
                    })
                  }>
                  {working === 'email' ? 'Inviting…' : 'Send In-App Invite'}
                </Button>
                {pendingInvites.length > 0 ? (
                  <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
                    <AppText variant="overline" color="secondary" fit>
                      Pending
                    </AppText>
                    {pendingInvites.map((invite) => (
                      <View
                        key={invite.id}
                        style={[
                          styles.pendingRow,
                          { minHeight: Math.max(38, s(40)), gap: spacing.md },
                        ]}>
                        <AppText
                          variant="caption"
                          color="secondary"
                          style={styles.memberCopy}
                          fit>
                          {invite.email}
                        </AppText>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Revoke invitation for ${invite.email}`}
                          disabled={Boolean(working)}
                          onPress={() =>
                            void run(`invite-${invite.id}`, async () => {
                              await revokeTodoEmailInvite(invite.id);
                              await refreshPending();
                            })
                          }>
                          <AppText variant="caption" color="danger" fit>
                            Revoke
                          </AppText>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            </>
          )}
        </>
      ) : null}

      {list.mode === 'shared' ? (
        <>
          <SectionHeader title="Members" detail={`${members.length}`} />
          <Card variant="sunken" style={{ gap: spacing.sm }}>
            {members.map((member) => (
              <View
                key={member.userId}
                style={[
                  styles.memberRow,
                  { minHeight: Math.max(58, s(56)), gap: spacing.md },
                ]}>
                <ProfileAvatar
                  displayName={member.displayName}
                  userId={member.userId}
                  isSelf={member.userId === user?.id}
                  size={Math.max(42, s(42))}
                />
                <View style={styles.memberCopy}>
                  <AppText variant="subheading" fit>
                    {member.displayName}
                  </AppText>
                  <AppText variant="caption" color="secondary" fit>
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </AppText>
                </View>
                {owner && member.role === 'member' ? (
                  <View style={[styles.memberActions, { gap: spacing.sm }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Make ${member.displayName} the owner`}
                      disabled={Boolean(working)}
                      hitSlop={8}
                      onPress={() => promptTransfer(member)}>
                      <AppText variant="caption" color="accent" fit>
                        Make owner
                      </AppText>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${member.displayName}`}
                      disabled={Boolean(working)}
                      hitSlop={8}
                      onPress={() =>
                        appPrompt.alert(
                          'Remove Member?',
                          `${member.displayName} will lose access. Their assigned items become available to anyone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () =>
                                void run(`member-${member.userId}`, () =>
                                  removeTodoMember(list.id, member.userId),
                                ),
                            },
                          ],
                        )
                      }>
                      <AppText variant="caption" color="danger" fit>
                        Remove
                      </AppText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {error ? <ErrorMessage message={error} selectable /> : null}

      <SectionHeader title="List Access" />
      {owner ? (
        <>
          {list.mode === 'shared' && otherMembers.length > 0 ? (
            <AppText variant="caption" color="secondary">
              To leave without deleting, transfer ownership to another member first.
            </AppText>
          ) : null}
          <Button
            variant="danger"
            disabled={Boolean(working)}
            onPress={removeList}>
            Delete list
          </Button>
        </>
      ) : (
        <Button
          variant="danger"
          disabled={Boolean(working)}
          onPress={leaveList}>
          Leave list
        </Button>
      )}
    </Screen>
    <PeoplePicker
      visible={pickingFriends}
      title="Invite Friends"
      confirmLabel="Invite"
      excludeIds={pendingInvites.map((invite) => invite.email)}
      onClose={() => setPickingFriends(false)}
      onConfirm={inviteFriendsToList}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindChoice: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  memberCopy: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  memberActions: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
