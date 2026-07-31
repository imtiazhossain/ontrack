import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, appPrompt, DragHandle, Screen, Symbol } from '@/components/primitives';
import { fontFamilies, layout, radii, spacing, typography } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
  collaboratorInitial,
  todoListIcon,
} from '@/features/todos/list-icon';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteSharedTodoList,
  leaveTodoList,
} from '@/services/todos/collaboration';
import { deletePersistedRecipeImage } from '@/services/recipes';
import {
  useTodos,
  type TodoList,
  type TodoListKind,
} from '@/store/todos';
import { haptics } from '@/utils/haptics';

export function TodoListsOverview() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuthSession();
  const lists = useTodos((state) => state.lists);
  const tasks = useTodos((state) => state.tasks);
  const recipes = useTodos((state) => state.recipes);
  const members = useTodos((state) => state.members);
  const invites = useTodos((state) => state.invites);
  const createList = useTodos((state) => state.createList);
  const deletePrivateList = useTodos((state) => state.deleteList);
  const reorderLists = useTodos((state) => state.reorderLists);
  const renameList = useTodos((state) => state.renameList);
  const [draft, setDraft] = useState('');
  const [draftKind, setDraftKind] = useState<TodoListKind>('checklist');
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [editingListIds, setEditingListIds] =
    useState<ReadonlySet<string> | null>(null);
  const editMode =
    editingListIds !== null &&
    lists.some((list) => editingListIds.has(list.id));

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
    return names;
  }, [members, user?.id]);

  const add = () => {
    const list = createList(draft, draftKind);
    if (!list) return;
    setEditingListIds(null);
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

  const commitListName = useCallback(
    (id: string, value: string) => {
      const list = lists.find((item) => item.id === id);
      if (!list || list.role !== 'owner') return false;
      const nextName = value.trim().replace(/\s+/g, ' ');
      if (!nextName || nextName === list.name) return false;
      renameList(id, nextName);
      return true;
    },
    [lists, renameList],
  );

  const beginEditing = () => {
    Keyboard.dismiss();
    setNameDrafts(
      Object.fromEntries(
        lists
          .filter((list) => list.role === 'owner')
          .map((list) => [list.id, list.name]),
      ),
    );
    setEditingListIds(new Set(lists.map((list) => list.id)));
    haptics.select();
  };

  const finishEditing = () => {
    Keyboard.dismiss();
    let renamed = false;
    for (const list of lists) {
      renamed =
        commitListName(list.id, nameDrafts[list.id] ?? list.name) || renamed;
    }
    setNameDrafts({});
    setEditingListIds(null);
    if (renamed) haptics.success();
    else haptics.select();
  };

  const removeList = useCallback(
    (list: TodoList) => {
      const leaving = list.mode === 'shared' && list.role === 'member';
      const title = leaving
        ? `Leave “${list.name}”?`
        : `Delete “${list.name}”?`;
      const message = leaving
          ? 'This checklist will be removed from your account. The owner and other collaborators will keep it.'
          : 'The checklist and every item in it will be permanently deleted.';
      const remove = () => {
        if (list.mode === 'private') {
          recipes
            .filter((recipe) => recipe.listId === list.id)
            .forEach((recipe) =>
              deletePersistedRecipeImage(recipe.sourceImageUri),
            );
        }
        const action =
          list.mode === 'private'
            ? Promise.resolve(deletePrivateList(list.id))
            : leaving
              ? leaveTodoList(list.id)
              : deleteSharedTodoList(list.id);
        void action
          .then(() => haptics.warning())
          .catch((caught: unknown) => {
            appPrompt.alert(
              leaving ? 'Could not leave checklist' : 'Could not delete checklist',
              caught instanceof Error ? caught.message : 'Please try again.',
            );
          });
      };

      if (Platform.OS === 'web') {
        if (globalThis.confirm(`${title}\n\n${message}`)) remove();
        return;
      }

      appPrompt.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: leaving ? 'Leave' : 'Delete',
          style: 'destructive',
          onPress: remove,
        },
      ]);
    },
    [deletePrivateList, recipes],
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
            editMode={editMode}
            isActive={isActive}
            list={item}
            collaboratorNames={collaboratorsByList.get(item.id)}
            open={count.open}
            total={count.total}
            nameDraft={nameDrafts[item.id] ?? item.name}
            onDragStart={drag}
            onNameChange={(name) =>
              setNameDrafts((current) => ({ ...current, [item.id]: name }))
            }
            onNameSubmit={(name) => {
              if (commitListName(item.id, name)) haptics.success();
              Keyboard.dismiss();
            }}
            onMoveDown={() => moveList(item.id, 1)}
            onMoveUp={() => moveList(item.id, -1)}
            onRemove={() => removeList(item)}
            canMoveDown={index < lists.length - 1}
            canMoveUp={index > 0}
            onPress={() => router.push(`/todos/${item.id}` as never)}
          />
        </View>
      );
    },
    [
      collaboratorsByList,
      counts,
      editMode,
      lists,
      nameDrafts,
      commitListName,
      moveList,
      removeList,
      router,
    ],
  );

  return (
    <Screen
      scroll={false}
      bottomInset={false}
      contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <DraggableFlatList
          activationDistance={8}
          automaticallyAdjustKeyboardInsets
          autoscrollSpeed={180}
          autoscrollThreshold={80}
          containerStyle={styles.dragList}
          contentContainerStyle={listContentStyle}
          contentInsetAdjustmentBehavior="never"
          data={lists}
          dragItemOverflow={false}
          onDragBegin={() => {
            haptics.heavy();
          }}
          onDragEnd={({ data, from, to }) => {
            if (!editMode || from < 0 || to < 0) return;
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
                  <AppText style={styles.title}>Checklists</AppText>
                  <AppText variant="body" color="secondary">
                    {totalOpen
                      ? `${totalOpen} open ${totalOpen === 1 ? 'item' : 'items'} across ${lists.length} ${lists.length === 1 ? 'list' : 'lists'}.`
                      : 'Everything is handled. Make a list for what comes next.'}
                  </AppText>
                </View>
                <View style={styles.headingActions}>
                  {lists.length > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        editMode
                          ? 'Finish editing checklists'
                          : 'Edit checklists'
                      }
                      onPress={() => {
                        if (editMode) finishEditing();
                        else beginEditing();
                      }}
                      style={({ pressed }) => [
                        styles.editModeButton,
                        {
                          backgroundColor: editMode
                            ? theme.accentPrimary
                            : theme.backgroundSunken,
                          borderColor: editMode
                            ? theme.accentPrimary
                            : theme.separator,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}>
                      <AppText
                        variant="caption"
                        color={editMode ? 'onAccent' : 'accent'}>
                        {editMode ? 'Done' : 'Edit'}
                      </AppText>
                    </Pressable>
                  ) : null}
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
                      color={
                        invites.length
                          ? theme.accentPrimary
                          : theme.textSecondary
                      }
                    />
                  </Pressable>
                </View>
              </View>

              {!editMode ? (
                <View style={styles.newListBlock}>
                  <View
                    accessibilityRole="radiogroup"
                    style={styles.kindChoices}>
                    {([
                      ['checklist', 'Checklist', 'tasks'],
                      ['grocery', 'Grocery', 'groceries'],
                    ] as const).map(([kind, label, icon]) => {
                      const selected = draftKind === kind;
                      return (
                        <Pressable
                          key={kind}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          onPress={() => {
                            setDraftKind(kind);
                            haptics.select();
                          }}
                          style={[
                            styles.kindChoice,
                            {
                              backgroundColor: selected
                                ? theme.accentFaint
                                : theme.backgroundSunken,
                              borderColor: selected
                                ? theme.accentPrimary
                                : theme.separator,
                            },
                          ]}>
                          <Symbol
                            name={icon}
                            size={17}
                            color={
                              selected
                                ? theme.accentPrimary
                                : theme.textSecondary
                            }
                          />
                          <AppText
                            variant="caption"
                            color={selected ? 'accent' : 'secondary'}>
                            {label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View
                    style={[
                      styles.composer,
                      {
                        backgroundColor: theme.backgroundSunken,
                        borderColor: draft.trim()
                          ? theme.accentPrimary
                          : theme.separator,
                      },
                    ]}>
                    <Symbol name="add" size={21} color={theme.accentPrimary} />
                    <TextInput
                      accessibilityLabel="New list name"
                      maxLength={80}
                      onChangeText={setDraft}
                      onSubmitEditing={add}
                      placeholder={
                        draftKind === 'grocery'
                          ? 'New grocery list'
                          : 'New checklist'
                      }
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
                      <Symbol
                        name="arrow-up"
                        size={18}
                        color={theme.textOnAccent}
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}

            </View>
          }
          ListEmptyComponent={<EmptyChecklists />}
          renderItem={renderList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
}

function EmptyChecklists() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.separator,
        },
      ]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.emptyIllustration}>
        <View
          style={[
            styles.emptyPaperBack,
            styles.emptyPaperBackLeft,
            {
              backgroundColor: theme.accentFaint,
              borderColor: theme.separator,
            },
          ]}
        />
        <View
          style={[
            styles.emptyPaperBack,
            styles.emptyPaperBackRight,
            {
              backgroundColor: theme.backgroundSunken,
              borderColor: theme.separator,
            },
          ]}
        />
        <View
          style={[
            styles.emptyPaper,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
            },
          ]}>
          <View
            style={[
              styles.emptyPaperBadge,
              { backgroundColor: theme.accentFaint },
            ]}>
            <Symbol name="tasks" size={24} color={theme.accentPrimary} />
          </View>
          {[0.72, 0.9, 0.58].map((width, index) => (
            <View key={width} style={styles.emptyPaperRow}>
              <View
                style={[
                  styles.emptyPaperCheck,
                  {
                    borderColor:
                      index === 0 ? theme.accentPrimary : theme.separator,
                    backgroundColor:
                      index === 0 ? theme.accentFaint : 'transparent',
                  },
                ]}>
                {index === 0 ? (
                  <Symbol name="check" size={11} color={theme.accentPrimary} />
                ) : null}
              </View>
              <View
                style={[
                  styles.emptyPaperLine,
                  {
                    width: `${width * 100}%`,
                    backgroundColor:
                      index === 0 ? theme.accentSoft : theme.separator,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.emptyCopy}>
        <AppText variant="heading" align="center">
          A clear slate
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyMessage}>
          Give your first list a name above. Groceries, weekend plans, packing—
          whatever helps quiet your mind.
        </AppText>
      </View>

      <View
        style={[
          styles.emptyHint,
          {
            backgroundColor: theme.accentFaint,
          },
        ]}>
        <Symbol name="arrow-up" size={15} color={theme.accentPrimary} />
        <AppText variant="caption" color="accent">
          Start with the field above
        </AppText>
      </View>
    </View>
  );
}

function TodoListCard({
  editMode,
  list,
  nameDraft,
  collaboratorNames,
  open,
  total,
  onPress,
  onDragStart,
  onNameChange,
  onNameSubmit,
  onMoveDown,
  onMoveUp,
  onRemove,
  canMoveDown,
  canMoveUp,
  isActive,
}: {
  editMode: boolean;
  list: TodoList;
  nameDraft: string;
  collaboratorNames?: string[];
  open: number;
  total: number;
  onPress: () => void;
  onDragStart: () => void;
  onNameChange: (name: string) => void;
  onNameSubmit: (name: string) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  canMoveDown: boolean;
  canMoveUp: boolean;
  isActive: boolean;
}) {
  const theme = useTheme();
  const nameInputRef = useRef<TextInput>(null);
  const icon = todoListIcon(list.name, list.kind);
  const collaboratorLabel = collaboratorNames?.join(', ');
  const leaving = list.mode === 'shared' && list.role === 'member';
  const canRename = editMode && list.role === 'owner';
  const cardContents = (
    <>
      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor: theme.backgroundSunken,
          },
        ]}>
        <Symbol name={icon} size={22} color={theme.textSecondary} />
      </View>
      <View style={styles.cardCopy}>
        {canRename ? (
          <View style={styles.nameEditor}>
            <TextInput
              ref={nameInputRef}
              accessibilityLabel="Checklist name"
              maxLength={80}
              onChangeText={onNameChange}
              onSubmitEditing={() => onNameSubmit(nameDraft)}
              placeholder="Checklist name"
              placeholderTextColor={theme.textTertiary}
              returnKeyType="done"
              selectTextOnFocus
              selectionColor={theme.accentPrimary}
              style={[styles.nameInput, { color: theme.textPrimary }]}
              value={nameDraft}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${list.name} name`}
              onPress={() => nameInputRef.current?.focus()}
              style={({ pressed }) => [
                styles.nameEditButton,
                pressed && styles.pressed,
              ]}>
              <Symbol name="edit" size={16} color={theme.accentPrimary} />
            </Pressable>
          </View>
        ) : (
          <>
            <AppText variant="subheading" numberOfLines={1}>
              {list.name}
            </AppText>
            {list.kind === 'grocery' ? (
              <AppText variant="caption" color="accent">
                Grocery
              </AppText>
            ) : null}
          </>
        )}
        {collaboratorNames ? (
          <View style={styles.collaborators}>
            <View style={styles.collaboratorAvatars}>
              {collaboratorNames.slice(0, 2).map((name, index) => (
                <View
                  key={`${name}-${index}`}
                  style={[
                    styles.collaboratorAvatar,
                    {
                      backgroundColor: theme.accentFaint,
                      borderColor: theme.backgroundElevated,
                    },
                    index > 0 && styles.collaboratorAvatarOverlap,
                  ]}>
                  <AppText
                    style={[
                      styles.collaboratorInitial,
                      { color: theme.accentPrimary },
                    ]}>
                    {collaboratorInitial(name)}
                  </AppText>
                </View>
              ))}
            </View>
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              {collaboratorNames.length > 2
                ? `${collaboratorNames.slice(0, 2).join(', ')} +${collaboratorNames.length - 2}`
                : collaboratorLabel}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.count}>
        <AppText variant="heading" color={open ? 'accent' : 'success'}>
          {open}
        </AppText>
        <AppText variant="caption" color="tertiary">
          open
        </AppText>
      </View>
    </>
  );

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: isActive ? theme.accentPrimary : theme.separator,
        },
        isActive && styles.activeCard,
      ]}>
      {editMode ? (
        <View style={styles.cardMain}>{cardContents}</View>
      ) : (
        <Pressable
          accessibilityHint="Tap to open."
          accessibilityRole="button"
          accessibilityLabel={`${list.name}, ${open} open of ${total}${
            collaboratorLabel ? `, shared with ${collaboratorLabel}` : ''
          }`}
          onPress={onPress}
          style={({ pressed }) => [
            styles.cardMain,
            { opacity: pressed && !isActive ? 0.72 : 1 },
          ]}>
          {cardContents}
        </Pressable>
      )}
      {editMode ? (
        <View style={styles.cardEditActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${leaving ? 'Leave' : 'Delete'} ${list.name}`}
            accessibilityHint={`${leaving ? 'Leaves' : 'Deletes'} after confirmation`}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.cardActionButton,
              { backgroundColor: `${theme.danger}18` },
              pressed && styles.pressed,
            ]}>
            <Symbol
              name={leaving ? 'minus-circle' : 'delete'}
              size={18}
              color={theme.danger}
            />
          </Pressable>
          <Pressable
            accessibilityActions={[
              ...(canMoveUp ? [{ name: 'moveUp', label: 'Move up' }] : []),
              ...(canMoveDown ? [{ name: 'moveDown', label: 'Move down' }] : []),
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Drag to reorder ${list.name}`}
            accessibilityHint="Long press and drag, or use the move actions"
            delayLongPress={180}
            disabled={isActive}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'moveUp') onMoveUp();
              if (event.nativeEvent.actionName === 'moveDown') onMoveDown();
            }}
            onLongPress={onDragStart}
            style={({ pressed }) => [
              styles.cardActionButton,
              (pressed || isActive) && styles.pressed,
            ]}>
            <DragHandle
              size={20}
              color={
                theme.name === 'dark'
                  ? theme.textOnAccent
                  : theme.textSecondary
              }
            />
          </Pressable>
        </View>
      ) : null}
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
  headingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 35,
    lineHeight: 42,
    fontWeight: '400',
    letterSpacing: -0.7,
  },
  inviteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  editModeButton: {
    minWidth: 58,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
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
  newListBlock: { gap: spacing.sm },
  kindChoices: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kindChoice: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
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
  emptyState: {
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  emptyIllustration: {
    width: 176,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPaperBack: {
    position: 'absolute',
    width: 122,
    height: 116,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  emptyPaperBackLeft: {
    transform: [{ rotate: '-8deg' }, { translateX: -12 }],
  },
  emptyPaperBackRight: {
    transform: [{ rotate: '8deg' }, { translateX: 12 }],
  },
  emptyPaper: {
    width: 132,
    minHeight: 126,
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    boxShadow: '0 10px 24px rgba(27, 24, 21, 0.10)',
  },
  emptyPaperBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: radii.pill,
  },
  emptyPaperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyPaperCheck: {
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.pill,
  },
  emptyPaperLine: {
    maxWidth: 70,
    height: 5,
    borderRadius: radii.pill,
    opacity: 0.7,
  },
  emptyCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyMessage: {
    maxWidth: 360,
  },
  emptyHint: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  card: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  cardMain: {
    minHeight: 86,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
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
  nameEditor: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  nameInput: {
    ...typography.subheading,
    flex: 1,
    minWidth: 0,
    minHeight: layout.minTapTarget,
    paddingVertical: 0,
  },
  nameEditButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  collaborators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  collaboratorAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collaboratorAvatar: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.pill,
  },
  collaboratorAvatarOverlap: { marginLeft: -5 },
  collaboratorInitial: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  count: { alignItems: 'center', minWidth: 44 },
  cardEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  cardActionButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.62 },
});
