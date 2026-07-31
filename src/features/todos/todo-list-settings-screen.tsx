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
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { shareTodoInvite } from '@/features/todos/share';
import { useTheme } from '@/hooks/use-theme';
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
  type PendingTodoEmailInvite,
} from '@/services/todos/collaboration';
import { deletePersistedRecipeImage } from '@/services/recipes';
import { useTodos } from '@/store/todos';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

export function TodoListSettingsScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthSession();
  const list = useTodos((state) => state.lists.find((item) => item.id === listId));
  const allMembers = useTodos((state) => state.members);
  const members = useMemo(
    () => allMembers.filter((member) => member.listId === listId),
    [allMembers, listId],
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

  const refreshPending = () =>
    loadTodoListPendingInvites(listId).then(setPendingInvites);

  useEffect(() => {
    if (!user || list?.mode !== 'shared' || list.role !== 'owner') return;
    void refreshPending().catch(() => undefined);
  }, [list?.mode, list?.role, listId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!list) {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="tasks" size={40} color={theme.textTertiary} />
        <AppText variant="heading">List unavailable</AppText>
        <Button onPress={() => router.replace('/(tabs)/to-do' as never)}>
          Back to lists
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

  const removeList = () => {
    confirmDestructiveAction({
      title: 'Delete this list?',
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
    <Screen contentStyle={styles.container}>
      <View style={styles.heading}>
        <AppText variant="overline" color="accent">
          {list.mode === 'shared' ? 'Collaborative list' : 'Private list'}
        </AppText>
        <AppText variant="display">{list.name}</AppText>
      </View>

      {owner ? (
        <Card style={styles.card}>
          <AppText variant="heading">List details</AppText>
          <Input
            label="List name"
            value={name}
            onChangeText={setName}
            maxLength={80}
          />
          <Button
            disabled={!name.trim() || name.trim() === list.name}
            onPress={() => renameList(list.id, name)}>
            Save name
          </Button>
          <AppText variant="overline" color="tertiary">
            List type
          </AppText>
          <View style={styles.kindChoices}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: list.kind === 'checklist' }}
              disabled={list.kind === 'grocery' && recipeCount > 0}
              onPress={() => setListKind(list.id, 'checklist')}
              style={[
                styles.kindChoice,
                {
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
              <AppText variant="caption">Checklist</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: list.kind === 'grocery' }}
              onPress={() => setListKind(list.id, 'grocery')}
              style={[
                styles.kindChoice,
                {
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
              <AppText variant="caption">Grocery</AppText>
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
        <Card variant="sunken" style={styles.card}>
          <AppText variant="heading">Shared with you</AppText>
          <AppText variant="body" color="secondary">
            {list.ownerName ?? 'The owner'} manages items, assignments, and membership.
          </AppText>
        </Card>
      )}

      {owner ? (
        <>
          <SectionHeader title="Sharing" />
          {list.mode === 'private' ? (
            <Card style={styles.card}>
              <AppText variant="subheading">Work together live</AppText>
              <AppText variant="body" color="secondary">
                Sharing moves this list to its protected collaborative space. You remain the owner.
              </AppText>
              <Button
                icon="people"
                disabled={Boolean(working)}
                onPress={beginSharing}>
                {working === 'publish' ? 'Preparing…' : 'Share this list'}
              </Button>
            </Card>
          ) : (
            <>
              <Card style={styles.card}>
                <AppText variant="subheading">Secure join link</AppText>
                <AppText variant="body" color="secondary">
                  Any signed-in onTrack user with the link can join until you revoke it.
                </AppText>
                <Button disabled={Boolean(working)} onPress={shareLink} icon="send">
                  {working === 'link' ? 'Preparing…' : 'Share join link'}
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

              <Card style={styles.card}>
                <AppText variant="subheading">Invite an account</AppText>
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
                      appPrompt.alert('Invitation ready', 'It now appears in their onTrack invitation inbox.');
                    })
                  }>
                  {working === 'email' ? 'Inviting…' : 'Send in-app invite'}
                </Button>
                {pendingInvites.length > 0 ? (
                  <View style={styles.pendingInvites}>
                    <AppText variant="overline" color="secondary">Pending</AppText>
                    {pendingInvites.map((invite) => (
                      <View key={invite.id} style={styles.pendingRow}>
                        <AppText variant="caption" color="secondary" style={styles.memberCopy}>
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
                          <AppText variant="caption" color="danger">Revoke</AppText>
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
          <Card variant="sunken" style={styles.memberList}>
            {members.map((member) => (
              <View key={member.userId} style={styles.memberRow}>
                <View
                  style={[styles.avatar, { backgroundColor: theme.accentFaint }]}>
                  <AppText variant="callout" color="accent">
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </AppText>
                </View>
                <View style={styles.memberCopy}>
                  <AppText variant="subheading">{member.displayName}</AppText>
                  <AppText variant="caption" color="secondary">
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                  </AppText>
                </View>
                {owner && member.role === 'member' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${member.displayName}`}
                    disabled={Boolean(working)}
                    onPress={() =>
                      appPrompt.alert(
                        'Remove member?',
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
                    <AppText variant="caption" color="danger">Remove</AppText>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {error ? <ErrorMessage message={error} selectable /> : null}

      <SectionHeader title="List access" />
      {owner ? (
        <Button
          variant="danger"
          disabled={Boolean(working)}
          onPress={removeList}>
          Delete list
        </Button>
      ) : (
        <Button
          variant="danger"
          disabled={Boolean(working)}
          onPress={() =>
            confirmDestructiveAction({
              title: 'Leave this list?',
              message: 'It will disappear from your account.',
              actionLabel: 'Leave',
              onConfirm: () =>
                void run('leave', async () => {
                  await leaveTodoList(list.id);
                  router.replace('/(tabs)/to-do' as never);
                }),
            })
          }>
          Leave list
        </Button>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heading: { gap: spacing.xs },
  card: { gap: spacing.md },
  kindChoices: { flexDirection: 'row', gap: spacing.sm },
  kindChoice: {
    minHeight: 44,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
  },
  memberList: { gap: spacing.sm },
  memberRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  memberCopy: { flex: 1, gap: spacing.xxs },
  pendingInvites: { gap: spacing.sm, paddingTop: spacing.sm },
  pendingRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});
