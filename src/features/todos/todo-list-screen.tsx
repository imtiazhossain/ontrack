import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';

import {
  AppText,
  appPrompt,
  DragHandle,
  ErrorMessage,
  ProgressRing,
  Screen,
  Symbol,
} from '@/components/primitives';
import {
  fontFamilies,
  layout,
  radii,
  spacing,
  typography,
} from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { useAuthSession } from '@/features/auth/auth-provider';
import { ChecklistPopoverMenu } from '@/features/todos/checklist-popover-menu';
import { copyTodoListText, shareTodoListText } from '@/features/todos/share';
import { usePreferences } from '@/store/preferences';
import {
  canCompleteTodo,
  useTodos,
  type TodoMember,
  type TodoTask,
} from '@/store/todos';
import { haptics } from '@/utils/haptics';

type TodoFilter = 'open' | 'completed';
type TodoSort = 'manual' | 'smart' | 'newest' | 'oldest' | 'alphabetical';

const QUICK_START_TASKS = [
  'Plan tomorrow',
  'Take a movement break',
  'Call someone I care about',
] as const;

function byPriorityAndRecency(a: TodoTask, b: TodoTask) {
  if (a.important !== b.important) return a.important ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

function sortTodoTasks(
  tasks: TodoTask[],
  sort: TodoSort,
  filter: TodoFilter,
) {
  return [...tasks].sort((a, b) => {
    if (sort === 'manual') {
      return (
        (a.position ?? Number.MAX_SAFE_INTEGER) -
          (b.position ?? Number.MAX_SAFE_INTEGER) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id)
      );
    }
    if (sort === 'newest') {
      return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
    }
    if (sort === 'oldest') {
      return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    }
    if (sort === 'alphabetical') {
      return (
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) ||
        a.id.localeCompare(b.id)
      );
    }
    if (filter === 'completed') {
      return (
        (b.completedAt ?? '').localeCompare(a.completedAt ?? '') ||
        a.id.localeCompare(b.id)
      );
    }
    return byPriorityAndRecency(a, b) || a.id.localeCompare(b.id);
  });
}

function confirmDestructiveAction({
  title,
  message,
  actionLabel,
  onConfirm,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  appPrompt.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: actionLabel,
      style: 'destructive',
      onPress: onConfirm,
    },
  ]);
}

export function TodoListScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuthSession();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const list = useTodos((state) => state.lists.find((item) => item.id === listId));
  const allTasks = useTodos((state) => state.tasks);
  const allMembers = useTodos((state) => state.members);
  const tasks = useMemo(
    () => allTasks.filter((task) => task.listId === listId),
    [allTasks, listId],
  );
  const members = useMemo(
    () => allMembers.filter((member) => member.listId === listId),
    [allMembers, listId],
  );
  const addTask = useTodos((state) => state.addTask);
  const toggleTask = useTodos((state) => state.toggleTask);
  const toggleImportant = useTodos((state) => state.toggleImportant);
  const setAssignee = useTodos((state) => state.setAssignee);
  const updateTask = useTodos((state) => state.updateTask);
  const deleteTask = useTodos((state) => state.deleteTask);
  const reorderTasks = useTodos((state) => state.reorderTasks);
  const clearCompleted = useTodos((state) => state.clearCompleted);
  const syncError = useTodos((state) => state.syncError);
  const clearSyncError = useTodos((state) => state.clearSyncError);
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<TodoFilter>('open');
  const [sort, setSort] = useState<TodoSort>('smart');
  const [editingTaskIds, setEditingTaskIds] =
    useState<ReadonlySet<string> | null>(null);

  const openTasks = useMemo(
    () => sortTodoTasks(tasks.filter((task) => !task.completed), sort, 'open'),
    [sort, tasks],
  );
  const completedTasks = useMemo(
    () => sortTodoTasks(tasks.filter((task) => task.completed), sort, 'completed'),
    [sort, tasks],
  );
  const visibleTasks = filter === 'open' ? openTasks : completedTasks;
  const editMode =
    editingTaskIds !== null &&
    visibleTasks.some((task) => editingTaskIds.has(task.id));
  const completedCount = completedTasks.length;
  const progress = tasks.length === 0 ? 0 : completedCount / tasks.length;

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(dateLocale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [dateLocale],
  );

  const add = (title = draft) => {
    const task = addTask(listId, title);
    if (!task) return;
    setEditingTaskIds(null);
    setDraft('');
    setFilter('open');
    haptics.success();
  };

  const clearDone = () => {
    confirmDestructiveAction({
      title: 'Clear completed tasks?',
      message: 'This removes every completed task from your list.',
      actionLabel: 'Clear',
      onConfirm: () => {
        clearCompleted(listId);
        haptics.warning();
      },
    });
  };

  const heroCopy =
    tasks.length === 0
      ? 'A clear page is a fresh start.'
      : openTasks.length === 0
        ? 'Everything is handled.'
        : completedCount === 0
          ? `${openTasks.length} ${openTasks.length === 1 ? 'task is' : 'tasks are'} ready for your attention.`
          : `${completedCount} down. Keep the rhythm going.`;

  if (!list) {
    return (
      <Screen contentStyle={styles.empty}>
        <Symbol name="tasks" size={40} color={theme.textTertiary} />
        <AppText variant="heading">List unavailable</AppText>
        <AppText variant="body" color="secondary" align="center">
          It may have been deleted, or you may no longer have access.
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)/to-do' as never)}>
          <AppText variant="callout" color="accent">Back to lists</AppText>
        </Pressable>
      </Screen>
    );
  }

  const owner = list.role === 'owner';

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <DraggableFlatList
            activationDistance={8}
            autoscrollSpeed={180}
            autoscrollThreshold={80}
            containerStyle={styles.list}
            contentContainerStyle={[
              styles.listContent,
              visibleTasks.length === 0 && styles.listEmptyContent,
            ]}
            contentInsetAdjustmentBehavior="never"
            data={visibleTasks}
            dragItemOverflow={false}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <View style={styles.heading}>
                  <View style={styles.headingCopy}>
                    <AppText variant="overline" color="accent">
                      {dateLabel}
                    </AppText>
                    <AppText style={styles.title}>{list.name}</AppText>
                  </View>
                  <View
                    style={[
                      styles.openPill,
                      {
                        backgroundColor: openTasks.length
                          ? theme.accentFaint
                          : theme.backgroundSunken,
                      },
                    ]}>
                    <View
                      style={[
                        styles.openDot,
                        {
                          backgroundColor: openTasks.length
                            ? theme.accentPrimary
                            : theme.success,
                        },
                      ]}
                    />
                    <AppText
                      variant="caption"
                      color={openTasks.length ? 'accent' : 'success'}>
                      {openTasks.length
                        ? `${openTasks.length} open`
                        : 'All clear'}
                    </AppText>
                  </View>
                </View>

                <View
                  style={[
                    styles.hero,
                    {
                      backgroundColor: theme.backgroundElevated,
                      borderColor: theme.separator,
                      boxShadow:
                        theme.name === 'light'
                          ? '0 10px 30px rgba(61, 50, 32, 0.09)'
                          : '0 10px 30px rgba(0, 0, 0, 0.26)',
                    },
                  ]}
                >
                  <View style={styles.heroCopy}>
                    <AppText
                      variant="overline"
                      color="tertiary"
                      style={styles.heroOverline}>
                      Momentum
                    </AppText>
                    <AppText variant="heading" style={styles.heroHeadline}>
                      {heroCopy}
                    </AppText>
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.heroSupporting}>
                      {tasks.length === 0
                        ? 'Capture the next thing. The rest can wait.'
                        : `${completedCount} of ${tasks.length} complete`}
                    </AppText>
                  </View>
                  <ProgressRing
                    progress={progress}
                    size={48}
                    strokeWidth={4}
                    label={`${Math.round(progress * 100)}%`}
                    sublabel="done"
                    trackColor={theme.backgroundSunken}
                  />
                </View>

                {owner ? <View
                  style={[
                    styles.composer,
                    {
                      backgroundColor: theme.backgroundSunken,
                      borderColor: draft.trim()
                        ? theme.accentPrimary
                        : theme.separator,
                    },
                  ]}
                >
                  <Symbol name="add" size={21} color={theme.accentPrimary} />
                  <TextInput
                    ref={inputRef}
                    accessibilityLabel="New task"
                    blurOnSubmit={false}
                    maxLength={160}
                    onChangeText={setDraft}
                    onSubmitEditing={() => add()}
                    placeholder="What needs your attention?"
                    placeholderTextColor={theme.textTertiary}
                    returnKeyType="done"
                    style={[styles.composerInput, { color: theme.textPrimary }]}
                    value={draft}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add task"
                    disabled={!draft.trim()}
                    hitSlop={4}
                    onPress={() => add()}
                    style={({ pressed }) => [
                      styles.addButton,
                      {
                        backgroundColor: draft.trim()
                          ? theme.accentPrimary
                          : theme.separator,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}
                  >
                    <Symbol
                      name="arrow-up"
                      size={18}
                      color={theme.textOnAccent}
                    />
                  </Pressable>
                </View> : (
                  <View
                    style={[
                      styles.memberNotice,
                      { backgroundColor: theme.backgroundSunken },
                    ]}>
                    <AppText variant="caption" color="secondary">
                      You can complete items assigned to you or Anyone.
                    </AppText>
                  </View>
                )}

                {syncError ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss list sync message"
                    onPress={clearSyncError}>
                    <ErrorMessage message={syncError} />
                  </Pressable>
                ) : null}

                <View style={styles.controls}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      filter === 'open'
                        ? `Showing ${openTasks.length} open tasks. Show closed tasks`
                        : `Showing ${completedCount} closed tasks. Show open tasks`
                    }
                    accessibilityHint="Toggles between open and closed tasks"
                    hitSlop={4}
                    onPress={() => {
                      setEditingTaskIds(null);
                      setFilter(filter === 'open' ? 'completed' : 'open');
                      haptics.select();
                    }}
                    style={({ pressed }) => [
                      styles.taskStatus,
                      {
                        backgroundColor: theme.backgroundSunken,
                        borderColor: theme.separator,
                        opacity: pressed ? 0.72 : 1,
                      },
                    ]}>
                    <View
                      style={[
                        styles.taskStatusDot,
                        {
                          backgroundColor:
                            filter === 'open'
                              ? theme.accentPrimary
                              : theme.success,
                        },
                      ]}
                    />
                    <AppText variant="overline" color="secondary">
                      {filter === 'open' ? 'Open' : 'Closed'}
                    </AppText>
                    <View
                      style={[
                        styles.taskStatusDivider,
                        { backgroundColor: theme.separator },
                      ]}
                    />
                    <AppText
                      variant="subheading"
                      style={{
                        color:
                          filter === 'open'
                            ? theme.accentPrimary
                            : theme.success,
                      }}>
                      {filter === 'open' ? openTasks.length : completedCount}
                    </AppText>
                  </Pressable>
                  <View style={styles.toolbarMenus}>
                    {owner && visibleTasks.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          editMode ? 'Finish editing checklist' : 'Edit checklist'
                        }
                        onPress={() => {
                          Keyboard.dismiss();
                          if (editMode) {
                            setEditingTaskIds(null);
                          } else {
                            setSort('manual');
                            setEditingTaskIds(
                              new Set(visibleTasks.map((task) => task.id)),
                            );
                          }
                          haptics.select();
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
                    <ChecklistPopoverMenu
                      accessibilityLabel="Sort checklist"
                      title="Sort items"
                      triggerIcon="sort"
                      items={[
                        {
                          id: 'manual',
                          title: 'Manual',
                          description: 'Your drag-and-drop order',
                          icon: 'list',
                          selected: sort === 'manual',
                        },
                        {
                          id: 'smart',
                          title: 'Smart',
                          description: 'Important first, then recent',
                          icon: 'smart',
                          selected: sort === 'smart',
                        },
                        {
                          id: 'newest',
                          title: 'Newest first',
                          description: 'Most recently added at the top',
                          icon: 'arrow-down',
                          selected: sort === 'newest',
                        },
                        {
                          id: 'oldest',
                          title: 'Oldest first',
                          description: 'Longest-standing items at the top',
                          icon: 'arrow-up',
                          selected: sort === 'oldest',
                        },
                        {
                          id: 'alphabetical',
                          title: 'A–Z',
                          description: 'Arrange items alphabetically',
                          icon: 'alphabetical',
                          selected: sort === 'alphabetical',
                        },
                      ]}
                      onSelect={(action) => {
                        if (
                          action === 'manual' ||
                          action === 'smart' ||
                          action === 'newest' ||
                          action === 'oldest' ||
                          action === 'alphabetical'
                        ) {
                          setSort(action);
                          haptics.select();
                        }
                      }}
                    />
                    <ChecklistPopoverMenu
                      accessibilityLabel={`${list.name} actions`}
                      title="List actions"
                      triggerIcon="more"
                      items={[
                        {
                          id: 'copy',
                          title: 'Copy',
                          description: 'Copy a polished text checklist',
                          icon: 'copy',
                        },
                        {
                          id: 'share',
                          title: 'Share',
                          description: 'Send open items to another app',
                          icon: 'share',
                        },
                        {
                          id: 'manage',
                          title: owner ? 'Manage' : 'Members',
                          description: owner
                            ? 'Sharing, members, and list settings'
                            : 'View people with access',
                          icon: 'settings',
                        },
                        ...(owner && completedCount > 0
                          ? [
                              {
                                id: 'clear',
                                title: 'Clear completed',
                                description: 'Remove every completed item',
                                icon: 'delete',
                                destructive: true,
                                dividerBefore: true,
                              } as const,
                            ]
                          : []),
                      ]}
                      onSelect={(action) => {
                        if (action === 'copy') {
                          void copyTodoListText(list, tasks, members).then((copied) => {
                            if (copied) haptics.success();
                          });
                        }
                        if (action === 'share') {
                          void shareTodoListText(list, tasks, members);
                        }
                        if (action === 'manage') {
                          router.push(`/todos/${list.id}/settings` as never);
                        }
                        if (action === 'clear') clearDone();
                      }}
                    />
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <TodoEmptyState
                filter={filter}
                hasTasks={tasks.length > 0}
                onAddSuggestion={add}
                onFocusComposer={() => inputRef.current?.focus()}
                onShowCompleted={() => {
                  setEditingTaskIds(null);
                  setFilter('completed');
                }}
              />
            }
            onDragBegin={() => haptics.heavy()}
            onDragEnd={({ data, from, to }) => {
              if (!editMode || from < 0 || to < 0 || from === to) return;
              reorderTasks(list.id, data.map((task) => task.id));
              haptics.select();
            }}
            renderItem={({ item, drag, getIndex, isActive }) => (
              <Animated.View
                entering={FadeInDown.delay(Math.min(getIndex() ?? 0, 5) * 36).duration(
                  220,
                )}
                exiting={FadeOutLeft.duration(180)}
                layout={LinearTransition.duration(220)}
                style={isActive ? styles.activeTaskRow : undefined}
              >
                <TodoRow
                  task={item}
                  canComplete={canCompleteTodo(list, item, user?.id)}
                  editMode={editMode}
                  isActive={isActive}
                  listOwner={owner}
                  members={members}
                  onDragStart={drag}
                  onDelete={() => {
                    deleteTask(item.id);
                    haptics.warning();
                  }}
                  onToggle={() => {
                    toggleTask(item.id, user?.id);
                    if (item.completed) haptics.select();
                    else haptics.success();
                  }}
                  onToggleImportant={() => {
                    toggleImportant(item.id);
                    haptics.select();
                  }}
                  onCycleAssignee={() => {
                    const choices = [
                      undefined,
                      ...members.map((member) => member.userId),
                    ];
                    const index = choices.findIndex(
                      (choice) => choice === item.assigneeUserId,
                    );
                    setAssignee(item.id, choices[(index + 1) % choices.length]);
                    haptics.select();
                  }}
                  onUpdate={(title) => updateTask(item.id, title)}
                />
              </Animated.View>
            )}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function TodoRow({
  task,
  canComplete,
  editMode,
  isActive,
  listOwner,
  members,
  onDelete,
  onDragStart,
  onCycleAssignee,
  onToggle,
  onToggleImportant,
  onUpdate,
}: {
  task: TodoTask;
  canComplete: boolean;
  editMode: boolean;
  isActive: boolean;
  listOwner: boolean;
  members: TodoMember[];
  onDelete: () => void;
  onDragStart: () => void;
  onCycleAssignee: () => void;
  onToggle: () => void;
  onToggleImportant: () => void;
  onUpdate: (title: string) => void;
}) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commitEdit = () => {
    const title = draft.trim();
    if (title) onUpdate(title);
    else setDraft(task.title);
    setEditing(false);
  };

  const confirmDelete = () => {
    Keyboard.dismiss();
    confirmDestructiveAction({
      title: `Delete “${task.title}”?`,
      message: 'This checklist item will be permanently deleted.',
      actionLabel: 'Delete',
      onConfirm: onDelete,
    });
  };

  return (
    <View
      accessibilityActions={
        listOwner && editMode
          ? [{ name: 'delete', label: `Delete ${task.title}` }]
          : undefined
      }
      onAccessibilityAction={(event) => {
        if (
          listOwner &&
          editMode &&
          event.nativeEvent.actionName === 'delete'
        ) {
          confirmDelete();
        }
      }}
      style={[
        styles.taskRow,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor:
            task.important && !task.completed
              ? theme.accentSoft
              : theme.separator,
        },
      ]}
    >
      {editMode && listOwner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
          accessibilityHint="Deletes after confirmation"
          hitSlop={2}
          onPress={confirmDelete}
          style={({ pressed }) => [
            styles.rowAction,
            { backgroundColor: `${theme.danger}18` },
            pressed && styles.pressed,
          ]}>
          <Symbol name="delete" size={18} color={theme.danger} />
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel={
            task.completed
              ? `Mark ${task.title} as open`
              : `Complete ${task.title}`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
          disabled={!canComplete}
          hitSlop={9}
          onPress={() => {
            Keyboard.dismiss();
            onToggle();
          }}
          style={({ pressed }) => [
            styles.checkButton,
            {
              backgroundColor: task.completed ? theme.success : 'transparent',
              borderColor: task.completed ? theme.success : theme.textTertiary,
              opacity: canComplete ? 1 : 0.35,
              transform: [{ scale: pressed ? 0.88 : 1 }],
            },
          ]}>
          {task.completed ? (
            <Symbol name="check" size={15} color={theme.textOnAccent} />
          ) : null}
        </Pressable>
      )}

      <View style={styles.taskCopy}>
        {editing && listOwner && !editMode ? (
          <TextInput
            accessibilityLabel={`Edit ${task.title}`}
            autoFocus
            blurOnSubmit
            maxLength={160}
            onBlur={commitEdit}
            onChangeText={setDraft}
            onSubmitEditing={Keyboard.dismiss}
            returnKeyType="done"
            selectionColor={theme.accentPrimary}
            style={[
              styles.editInput,
              { color: theme.textPrimary, borderColor: theme.accentPrimary },
            ]}
            value={draft}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${task.title}`}
            disabled={!listOwner || editMode}
            onPress={() => {
              Keyboard.dismiss();
              setEditing(true);
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <AppText
              variant="bodyMedium"
              color={task.completed ? 'tertiary' : 'primary'}
              numberOfLines={2}
              style={task.completed ? styles.completedTitle : undefined}
            >
              {task.title}
            </AppText>
          </Pressable>
        )}
        {task.important && !task.completed ? (
          <AppText variant="overline" color="accent">
            Focus
          </AppText>
        ) : null}
        {members.length > 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Assignment for ${task.title}`}
            disabled={!listOwner || editMode}
            onPress={onCycleAssignee}>
            <AppText variant="caption" color="secondary">
              {task.assigneeUserId
                ? members.find((member) => member.userId === task.assigneeUserId)
                    ?.displayName ?? 'Member'
                : 'Anyone'}
              {listOwner && !editMode ? ' · tap to change' : ''}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {listOwner ? (
        editMode ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Drag to reorder ${task.title}`}
            accessibilityHint="Long press and drag to move this item"
            disabled={isActive}
            delayLongPress={180}
            onLongPress={onDragStart}
            style={({ pressed }) => [
              styles.rowAction,
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
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              task.important
                ? `Remove ${task.title} from focus`
                : `Mark ${task.title} as focus`
            }
            accessibilityState={{ selected: task.important }}
            hitSlop={2}
            onPress={() => {
              Keyboard.dismiss();
              onToggleImportant();
            }}
            style={({ pressed }) => [
              styles.rowAction,
              task.important && { backgroundColor: theme.accentFaint },
              pressed && styles.pressed,
            ]}>
            <Symbol
              name={task.important ? 'important-filled' : 'important'}
              size={19}
              color={task.important ? theme.accentPrimary : theme.textTertiary}
            />
          </Pressable>
        )
      ) : null}
    </View>
  );
}

function TodoEmptyState({
  filter,
  hasTasks,
  onAddSuggestion,
  onFocusComposer,
  onShowCompleted,
}: {
  filter: TodoFilter;
  hasTasks: boolean;
  onAddSuggestion: (title: string) => void;
  onFocusComposer: () => void;
  onShowCompleted: () => void;
}) {
  const theme = useTheme();

  if (filter === 'completed') {
    return (
      <View style={styles.empty}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: theme.backgroundSunken },
          ]}
        >
          <Symbol
            name="status-completed"
            size={24}
            color={theme.textTertiary}
          />
        </View>
        <AppText variant="heading" style={styles.emptyTitle}>
          A clean slate
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyBody}>
          Completed tasks will collect here when you’re ready to look back.
        </AppText>
      </View>
    );
  }

  if (hasTasks) {
    return (
      <View style={styles.empty}>
        <View
          style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}
        >
          <Symbol name="status-completed" size={24} color={theme.success} />
        </View>
        <AppText variant="heading" style={styles.emptyTitle}>
          All caught up
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyBody}>
          Enjoy the space you made—or add the next small thing.
        </AppText>
        <View style={styles.emptyActions}>
          <Pressable
            accessibilityRole="button"
            hitSlop={2}
            onPress={onShowCompleted}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.backgroundSunken },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="callout">View completed</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={2}
            onPress={onFocusComposer}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.accentPrimary },
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="callout" color="onAccent">
              Add another
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}>
        <Symbol name="tasks" size={24} color={theme.accentPrimary} />
      </View>
      <AppText variant="heading" style={styles.emptyTitle}>
        Your list is wide open
      </AppText>
      <AppText
        variant="body"
        color="secondary"
        align="center"
        style={styles.emptyBody}>
        Start with one clear, kind commitment to yourself.
      </AppText>
      <View style={styles.suggestions}>
        {QUICK_START_TASKS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            accessibilityLabel={`Add ${suggestion}`}
            onPress={() => onAddSuggestion(suggestion)}
            style={({ pressed }) => [
              styles.suggestion,
              {
                backgroundColor: theme.backgroundSunken,
                borderColor: theme.separator,
              },
              pressed && styles.pressed,
            ]}
          >
            <Symbol name="add" size={15} color={theme.accentPrimary} />
            <AppText variant="caption">{suggestion}</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: {
    paddingTop: Platform.select({ web: 76, default: spacing.sm }),
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    flex: 1,
    alignSelf: 'center',
  },
  listHeader: { gap: spacing.md, paddingBottom: spacing.md },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: { gap: spacing.xs },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '400',
    letterSpacing: -0.65,
  },
  openPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  openDot: { width: 7, height: 7, borderRadius: radii.pill },
  hero: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCopy: { flex: 1, gap: spacing.xs },
  heroOverline: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.1,
  },
  heroHeadline: {
    fontSize: 16,
    lineHeight: 21,
  },
  heroSupporting: {
    fontSize: 11,
    lineHeight: 14,
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
  composerInput: {
    ...typography.body,
    flex: 1,
    minHeight: 52,
    paddingVertical: spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  controls: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskStatus: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  taskStatusDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  taskStatusDivider: {
    width: StyleSheet.hairlineWidth,
    height: 16,
  },
  toolbarMenus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  editModeButton: {
    minWidth: 58,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  memberNotice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.md },
  listEmptyContent: { flexGrow: 1 },
  taskRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  activeTaskRow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  checkButton: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.pill,
  },
  taskCopy: { flex: 1, gap: spacing.xxs },
  completedTitle: { textDecorationLine: 'line-through' },
  editInput: {
    ...typography.bodyMedium,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  rowAction: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  emptyTitle: {
    fontSize: 21,
    lineHeight: 26,
  },
  emptyBody: {
    maxWidth: 340,
    fontSize: 14,
    lineHeight: 20,
  },
  suggestions: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  suggestion: {
    minHeight: layout.minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyAction: {
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.62 },
});
