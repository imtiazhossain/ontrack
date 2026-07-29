import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import SwipeableItem, {
  OpenDirection,
  type SwipeableItemImperativeRef,
} from 'react-native-swipeable-item';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Screen, Symbol } from '@/components/primitives';
import { fontFamilies, layout, radii, spacing, typography } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { todoListIcon } from '@/features/todos/list-icon';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteSharedTodoList,
  leaveTodoList,
} from '@/services/todos/collaboration';
import { useTodos, type TodoList } from '@/store/todos';
import { haptics } from '@/utils/haptics';

export function TodoListsOverview() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthSession();
  const lists = useTodos((state) => state.lists);
  const tasks = useTodos((state) => state.tasks);
  const members = useTodos((state) => state.members);
  const invites = useTodos((state) => state.invites);
  const createList = useTodos((state) => state.createList);
  const deletePrivateList = useTodos((state) => state.deleteList);
  const reorderLists = useTodos((state) => state.reorderLists);
  const openSwipeableRef = useRef<SwipeableItemImperativeRef | null>(null);
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
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingBottom: insets.bottom + layout.tabBarInset + spacing.lg,
      },
    ],
    [insets.bottom],
  );
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

  const removeList = useCallback(
    (list: TodoList, swipeable: SwipeableItemImperativeRef) => {
      const leaving = list.mode === 'shared' && list.role === 'member';
      Alert.alert(
        leaving ? `Leave “${list.name}”?` : `Delete “${list.name}”?`,
        leaving
          ? 'This checklist will be removed from your account. The owner and other collaborators will keep it.'
          : 'The checklist and every item in it will be permanently deleted.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => void swipeable.close(),
          },
          {
            text: leaving ? 'Leave' : 'Delete',
            style: 'destructive',
            onPress: () => {
              void swipeable.close();
              const action =
                list.mode === 'private'
                  ? Promise.resolve(deletePrivateList(list.id))
                  : leaving
                    ? leaveTodoList(list.id)
                    : deleteSharedTodoList(list.id);
              void action
                .then(() => haptics.warning())
                .catch((caught: unknown) => {
                  Alert.alert(
                    leaving ? 'Could not leave checklist' : 'Could not delete checklist',
                    caught instanceof Error ? caught.message : 'Please try again.',
                  );
                });
            },
          },
        ],
      );
    },
    [deletePrivateList],
  );

  const renderList = useCallback(
    ({
      item,
      isActive,
      drag,
      getIndex,
    }: RenderItemParams<TodoList>) => {
      const count = counts.get(item.id) ?? { open: 0, total: 0 };
      const index = getIndex() ?? lists.findIndex((list) => list.id === item.id);
      return (
        <View style={styles.listItem}>
          <TodoListCard
            isActive={isActive}
            list={item}
            collaboratorNames={collaboratorsByList.get(item.id)}
            open={count.open}
            total={count.total}
            onDragStart={drag}
            onMoveDown={() => moveList(item.id, 1)}
            onMoveUp={() => moveList(item.id, -1)}
            onRemove={(swipeable) => removeList(item, swipeable)}
            onSwipeOpen={(swipeable) => {
              if (
                openSwipeableRef.current &&
                openSwipeableRef.current !== swipeable
              ) {
                void openSwipeableRef.current.close();
              }
              openSwipeableRef.current = swipeable;
            }}
            canMoveDown={index < lists.length - 1}
            canMoveUp={index > 0}
            onPress={() => router.push(`/todos/${item.id}` as never)}
          />
        </View>
      );
    },
    [collaboratorsByList, counts, lists, moveList, removeList, router],
  );

  return (
    <Screen
      scroll={false}
      bottomInset={false}
      contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <DraggableFlatList
          activationDistance={8}
          autoscrollSpeed={180}
          autoscrollThreshold={80}
          containerStyle={styles.dragList}
          contentContainerStyle={listContentStyle}
          contentInsetAdjustmentBehavior="never"
          data={lists}
          dragItemOverflow={false}
          onDragBegin={() => {
            void openSwipeableRef.current?.close();
            openSwipeableRef.current = null;
            haptics.heavy();
          }}
          onDragEnd={({ data, from, to }) => {
            if (from < 0 || to < 0) return;
            haptics.select();
            reorderLists(data.map((list) => list.id));
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
                      ? `Add collaborators, ${invites.length} invitations waiting`
                      : 'Add collaborators'
                  }
                  onPress={() => router.push('/todo-collaborators' as never)}
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
  onDragStart,
  onMoveDown,
  onMoveUp,
  onRemove,
  onSwipeOpen,
  canMoveDown,
  canMoveUp,
  isActive,
}: {
  list: TodoList;
  collaboratorNames?: string;
  open: number;
  total: number;
  onPress: () => void;
  onDragStart: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: (swipeable: SwipeableItemImperativeRef) => void;
  onSwipeOpen: (swipeable: SwipeableItemImperativeRef) => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
}) {
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableItemImperativeRef | null>(null);
  const swipeGestureRef = useRef(false);
  const wasOpenAtPressInRef = useRef(false);
  const longPressGestureRef = useRef(false);
  const horizontalTouchRef = useRef(false);
  const touchOriginRef = useRef<{ x: number; y: number } | undefined>(undefined);
  const icon = todoListIcon(list.name, list.mode);
  const isCollaborativeIcon = icon === 'people';
  const leaving = list.mode === 'shared' && list.role === 'member';
  return (
    <View style={[styles.swipeable, { backgroundColor: theme.danger }]}>
      <SwipeableItem
        ref={swipeableRef}
        item={list}
        activationThreshold={12}
        overSwipe={0}
        snapPointsLeft={[92]}
        swipeEnabled={!isActive}
        onChange={({ openDirection }) => {
          const opened = openDirection !== OpenDirection.NONE;
          swipeGestureRef.current = opened;
          if (opened && swipeableRef.current) {
            onSwipeOpen(swipeableRef.current);
            haptics.select();
          }
        }}
        renderUnderlayLeft={() => (
          <ListRemoveAction
            label={leaving ? 'Leave' : 'Delete'}
            listName={list.name}
            onRemove={() => {
              if (swipeableRef.current) onRemove(swipeableRef.current);
            }}
          />
        )}>
        <Pressable
          accessibilityActions={[
            ...(canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
            ...(canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
            {
              name: leaving ? 'leave' : 'delete',
              label: `${leaving ? 'Leave' : 'Delete'} ${list.name}`,
            },
          ]}
          accessibilityHint="Tap to open. Long press and drag to reorder. Swipe left for actions."
          accessibilityRole="button"
          accessibilityLabel={`${list.name}, ${open} open of ${total}${
            collaboratorNames ? `, shared with ${collaboratorNames}` : ''
          }`}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
            if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
            if (
              (event.nativeEvent.actionName === 'delete' ||
                event.nativeEvent.actionName === 'leave') &&
              swipeableRef.current
            ) {
              onRemove(swipeableRef.current);
            }
          }}
          delayLongPress={400}
          onLongPress={() => {
            if (horizontalTouchRef.current) return;
            longPressGestureRef.current = true;
            swipeGestureRef.current = false;
            if (swipeableRef.current) {
              void swipeableRef.current.close();
            }
            onDragStart();
          }}
          onPressIn={() => {
            wasOpenAtPressInRef.current = swipeGestureRef.current;
            longPressGestureRef.current = false;
            horizontalTouchRef.current = false;
          }}
          onPress={() => {
            const shouldClose =
              wasOpenAtPressInRef.current ||
              swipeGestureRef.current ||
              horizontalTouchRef.current;
            wasOpenAtPressInRef.current = false;
            if (shouldClose) {
              void swipeableRef.current?.close();
              return;
            }
            if (longPressGestureRef.current) {
              longPressGestureRef.current = false;
              return;
            }
            onPress();
          }}
          onTouchStart={(event) => {
            touchOriginRef.current = {
              x: event.nativeEvent.pageX,
              y: event.nativeEvent.pageY,
            };
            horizontalTouchRef.current = false;
          }}
          onTouchMove={(event) => {
            const origin = touchOriginRef.current;
            if (!origin) return;
            const deltaX = Math.abs(event.nativeEvent.pageX - origin.x);
            const deltaY = Math.abs(event.nativeEvent.pageY - origin.y);
            if (deltaX > 10 && deltaX > deltaY) {
              horizontalTouchRef.current = true;
            }
          }}
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
      </SwipeableItem>
    </View>
  );
}

function ListRemoveAction({
  label,
  listName,
  onRemove,
}: {
  label: 'Delete' | 'Leave';
  listName: string;
  onRemove: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.removeAction}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${listName}`}
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeButton,
          pressed && styles.removePressed,
        ]}>
        <Symbol
          name={label === 'Delete' ? 'delete' : 'minus-circle'}
          size={19}
          color={theme.textOnAccent}
        />
        <AppText variant="caption" color="onAccent">{label}</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: Platform.select({ web: 76, default: spacing.lg }),
    paddingBottom: 0,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    flex: 1,
    alignSelf: 'center',
  },
  dragList: { flex: 1 },
  listContent: { paddingTop: 0 },
  listItem: { paddingBottom: spacing.md },
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
  swipeable: {
    height: 88,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
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
  removeAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 92,
    height: 88,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  removeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  removePressed: { opacity: 0.72 },
  pressed: { opacity: 0.62 },
});
