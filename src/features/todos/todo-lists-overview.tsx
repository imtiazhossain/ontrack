import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DragList, { type DragListRenderItemInfo } from 'react-native-draglist';

import { AppText, Screen, Symbol } from '@/components/primitives';
import { fontFamilies, layout, radii, spacing, typography } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { todoListIcon } from '@/features/todos/list-icon';
import { useTheme } from '@/hooks/use-theme';
import { useTodos, type TodoList } from '@/store/todos';
import { haptics } from '@/utils/haptics';

export function TodoListsOverview() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthSession();
  const lists = useTodos((state) => state.lists);
  const tasks = useTodos((state) => state.tasks);
  const members = useTodos((state) => state.members);
  const invites = useTodos((state) => state.invites);
  const createList = useTodos((state) => state.createList);
  const reorderLists = useTodos((state) => state.reorderLists);
  const [draft, setDraft] = useState('');
  const counts = useMemo(() => {
    const next = new Map<string, { open: number; total: number }>();
    for (const task of tasks) {
      const count = next.get(task.listId) ?? { open: 0, total: 0 };
      count.total += 1;
      if (!task.completed) count.open += 1;
      next.set(task.listId, count);
    }
    return next;
  }, [tasks]);
  const totalOpen = tasks.filter((task) => !task.completed).length;
  const collaboratorsByList = useMemo(() => {
    const names = new Map<string, string[]>();
    for (const member of members) {
      if (member.userId === user?.id) continue;
      const listNames = names.get(member.listId) ?? [];
      if (!listNames.includes(member.displayName)) listNames.push(member.displayName);
      names.set(member.listId, listNames);
    }
    return new Map(
      [...names].map(([listId, listNames]) => {
        const visible = listNames.slice(0, 2);
        const remaining = listNames.length - visible.length;
        return [
          listId,
          remaining > 0 ? `${visible.join(', ')} +${remaining}` : visible.join(', '),
        ];
      }),
    );
  }, [members, user?.id]);

  const add = () => {
    const list = createList(draft);
    if (!list) return;
    setDraft('');
    Keyboard.dismiss();
    haptics.success();
    router.push(`/todos/${list.id}` as never);
  };

  const moveList = useCallback((id: string, offset: number) => {
    const from = lists.findIndex((list) => list.id === id);
    const to = Math.max(0, Math.min(lists.length - 1, from + offset));
    if (from < 0 || from === to) return;
    const reordered = [...lists];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    reorderLists(reordered.map((list) => list.id));
    haptics.select();
  }, [lists, reorderLists]);

  const renderList = useCallback(
    ({
      item,
      isActive,
      onDragStart,
      onDragEnd,
      index,
    }: DragListRenderItemInfo<TodoList>) => {
      const count = counts.get(item.id) ?? { open: 0, total: 0 };
      return (
        <TodoListCard
          isActive={isActive}
          list={item}
          collaboratorNames={collaboratorsByList.get(item.id)}
          open={count.open}
          total={count.total}
          onDragEnd={onDragEnd}
          onDragStart={onDragStart}
          onMoveDown={() => moveList(item.id, 1)}
          onMoveUp={() => moveList(item.id, -1)}
          canMoveDown={index < lists.length - 1}
          canMoveUp={index > 0}
          onPress={() => router.push(`/todos/${item.id}` as never)}
        />
      );
    },
    [collaboratorsByList, counts, lists.length, moveList, router],
  );

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <DragList
          contentContainerStyle={styles.listContent}
          contentInsetAdjustmentBehavior="never"
          data={lists}
          onDragBegin={() => haptics.heavy()}
          onDragEnd={() => haptics.select()}
          onReordered={(from, to) => {
            const reordered = [...lists];
            const [moved] = reordered.splice(from, 1);
            reordered.splice(to, 0, moved);
            reorderLists(reordered.map((list) => list.id));
          }}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.heading}>
                <View style={styles.headingCopy}>
                  <AppText variant="overline" color="accent">Your checklists</AppText>
                  <AppText style={styles.title}>To Do</AppText>
                  <AppText variant="body" color="secondary">
                    {totalOpen
                      ? `${totalOpen} open ${totalOpen === 1 ? 'item' : 'items'} across ${lists.length} ${lists.length === 1 ? 'list' : 'lists'}.`
                      : 'Everything is handled. Make a list for what comes next.'}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    invites.length
                      ? `Invitation inbox, ${invites.length} pending`
                      : 'Invitation inbox'
                  }
                  onPress={() => router.push('/todo-invites' as never)}
                  style={({ pressed }) => [
                    styles.inviteButton,
                    { backgroundColor: theme.backgroundSunken },
                    pressed && styles.pressed,
                  ]}>
                  <Symbol
                    name="invite"
                    size={21}
                    color={invites.length ? theme.accentPrimary : theme.textSecondary}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  styles.composer,
                  {
                    backgroundColor: theme.backgroundSunken,
                    borderColor: draft.trim() ? theme.accentPrimary : theme.separator,
                  },
                ]}>
                <Symbol name="add" size={21} color={theme.accentPrimary} />
                <TextInput
                  accessibilityLabel="New list name"
                  maxLength={80}
                  onChangeText={setDraft}
                  onSubmitEditing={add}
                  placeholder="New list, e.g. Groceries"
                  placeholderTextColor={theme.textTertiary}
                  returnKeyType="done"
                  style={[styles.input, { color: theme.textPrimary }]}
                  value={draft}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create list"
                  disabled={!draft.trim()}
                  onPress={add}
                  style={({ pressed }) => [
                    styles.addButton,
                    {
                      backgroundColor: draft.trim()
                        ? theme.accentPrimary
                        : theme.separator,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <Symbol name="arrow-up" size={18} color={theme.textOnAccent} />
                </Pressable>
              </View>

            </View>
          }
          renderItem={renderList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
}

function TodoListCard({
  list,
  collaboratorNames,
  open,
  total,
  onPress,
  onDragEnd,
  onDragStart,
  onMoveDown,
  onMoveUp,
  canMoveDown,
  canMoveUp,
  isActive,
}: {
  list: TodoList;
  collaboratorNames?: string;
  open: number;
  total: number;
  onPress: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
}) {
  const theme = useTheme();
  const icon = todoListIcon(list.name, list.mode);
  const isCollaborativeIcon = icon === 'people';
  return (
    <Pressable
      accessibilityActions={[
        ...(canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
        ...(canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
      ]}
      accessibilityHint="Tap to open. Drag to reorder."
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${open} open of ${total}${
        collaboratorNames ? `, shared with ${collaboratorNames}` : ''
      }`}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
        if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
      }}
      onPress={onPress}
      onPressIn={onDragStart}
      onPressOut={onDragEnd}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: isActive ? theme.accentPrimary : theme.separator,
          opacity: pressed && !isActive ? 0.72 : 1,
        },
        isActive && styles.activeCard,
      ]}>
      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor:
              isCollaborativeIcon ? theme.accentFaint : theme.backgroundSunken,
          },
        ]}>
        <Symbol
          name={icon}
          size={22}
          color={isCollaborativeIcon ? theme.accentPrimary : theme.textSecondary}
        />
      </View>
      <View style={styles.cardCopy}>
        <AppText variant="subheading" numberOfLines={1}>{list.name}</AppText>
        {collaboratorNames ? (
          <View style={styles.collaborators}>
            <Symbol name="people" size={14} color={theme.textTertiary} />
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {collaboratorNames}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.count}>
        <AppText variant="heading" color={open ? 'accent' : 'success'}>{open}</AppText>
        <AppText variant="caption" color="tertiary">open</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: Platform.select({ web: 76, default: spacing.lg }),
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    flex: 1,
    alignSelf: 'center',
  },
  listContent: { gap: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.lg, paddingBottom: spacing.md },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: { flex: 1, gap: spacing.xs },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '600',
  },
  inviteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  composer: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  activeCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIcon: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  cardCopy: { flex: 1, gap: spacing.xs },
  collaborators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  count: { alignItems: 'center', minWidth: 44 },
  pressed: { opacity: 0.62 },
});
