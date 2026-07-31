import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  Screen,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { shareTodoCollaboratorInvite } from '@/features/todos/share';
import { useTheme } from '@/hooks/use-theme';
import {
  createTodoCollaboratorLink,
  publishTodoList,
} from '@/services/todos/collaboration';
import { useTodos } from '@/store/todos';

export function TodoCollaboratorsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthSession();
  const lists = useTodos((state) => state.lists);
  const ownedLists = useMemo(
    () => lists.filter((list) => list.role === 'owner'),
    [lists],
  );
  const [selectedIds, setSelectedIds] = useState(
    () => new Set<string>(ownedLists.map((list) => list.id)),
  );
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string>();
  const allSelected =
    ownedLists.length > 0 && ownedLists.every((list) => selectedIds.has(list.id));
  const selectedLists = ownedLists.filter((list) => selectedIds.has(list.id));

  const toggle = (listId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  };

  const requireSignIn = () => {
    router.push({
      pathname: '/account',
      params: { returnTo: '/todo-collaborators' },
    } as never);
  };

  const sendInvite = async () => {
    if (!user) {
      requireSignIn();
      return;
    }
    if (!selectedLists.length || working) return;
    setWorking(true);
    setError(undefined);
    try {
      for (const list of selectedLists) {
        if (list.mode === 'private') await publishTodoList(list.id);
      }
      const code = await createTodoCollaboratorLink(
        selectedLists.map((list) => list.id),
      );
      await shareTodoCollaboratorInvite(
        selectedLists.map((list) => list.name),
        code,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The invitation could not be created.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.heading}>
        <AppText variant="overline" color="accent">Checklist access</AppText>
        <AppText variant="display">Add Collaborators</AppText>
        <AppText variant="body" color="secondary">
          Choose exactly which checklists this link can open. Anyone who joins can collaborate live.
        </AppText>
      </View>

      <Card variant="sunken" style={styles.notice}>
        <Symbol name="invite" size={24} color={theme.accentPrimary} />
        <View style={styles.noticeCopy}>
          <AppText variant="subheading">Send by text</AppText>
          <AppText variant="body" color="secondary">
            The share sheet lets you choose Messages. The link opens onTrack, or shows download options when the app is not installed.
          </AppText>
        </View>
      </Card>

      <View style={styles.sectionHeading}>
        <AppText variant="heading">Give access to</AppText>
        <Button
          variant="ghost"
          onPress={() =>
            setSelectedIds(
              allSelected
                ? new Set<string>()
                : new Set<string>(ownedLists.map((list) => list.id)),
            )
          }>
          {allSelected ? 'Clear All' : 'Select All'}
        </Button>
      </View>

      <View style={styles.list}>
        {ownedLists.map((list) => {
          const selected = selectedIds.has(list.id);
          return (
            <Pressable
              key={list.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Share ${list.name}`}
              onPress={() => toggle(list.id)}
              style={({ pressed }) => [
                styles.listRow,
                {
                  backgroundColor: theme.backgroundElevated,
                  borderColor: selected ? theme.accentPrimary : theme.separator,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: selected ? theme.accentPrimary : 'transparent',
                    borderColor: selected ? theme.accentPrimary : theme.textTertiary,
                  },
                ]}>
                {selected ? <Symbol name="check" size={15} color={theme.textOnAccent} /> : null}
              </View>
              <View style={styles.listCopy}>
                <AppText variant="subheading">{list.name}</AppText>
                <AppText variant="caption" color="secondary">
                  {list.mode === 'shared' ? 'Already collaborative' : 'Will become collaborative'}
                </AppText>
              </View>
              <Symbol name="tasks" size={20} color={theme.textTertiary} />
            </Pressable>
          );
        })}
      </View>

      {error ? <ErrorMessage message={error} /> : null}

      <Button
        size="lg"
        icon="send"
        disabled={!selectedLists.length || working}
        onPress={() => void sendInvite()}>
        {working
          ? 'Preparing invite…'
          : `Send invite for ${selectedLists.length || 0} ${
              selectedLists.length === 1 ? 'checklist' : 'checklists'
            }`}
      </Button>

      <Button
        variant="ghost"
        icon="invite"
        onPress={() => router.push('/todo-invites' as never)}>
        View invitations sent to me
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    gap: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  heading: { gap: spacing.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  noticeCopy: { flex: 1, gap: spacing.xs },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  list: { gap: spacing.sm },
  listRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.sm,
  },
  listCopy: { flex: 1, gap: 2 },
});
