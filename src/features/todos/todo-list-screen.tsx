import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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
    ErrorMessage,
    IconButton,
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
import { useAuthSession } from '@/features/auth/auth-provider';
import { ChecklistPopoverMenu } from '@/features/todos/checklist-popover-menu';
import { copyTodoListText, shareTodoListText } from '@/features/todos/share';
import { TodoEmptyState } from '@/features/todos/todo-empty-state';
import { ChecklistItemSeparator, TodoRow } from '@/features/todos/todo-row';
import { sortTodoTasks, type TodoFilter, type TodoSort } from '@/features/todos/todo-sort';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import {
    canCompleteTodo,
    useTodos,
} from '@/store/todos';
import { useUI } from '@/store/ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { haptics } from '@/utils/haptics';
import { listReferenceEquality } from '@/utils/list-equality';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TodoListScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refreshControl } = usePullToRefresh();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight ||
    layout.floatingTabBarBaseHeight + insets.bottom;
  const { user } = useAuthSession();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const list = useTodos((state) => state.lists.find((item) => item.id === listId));
  const tasks = useTodos(
    (state) => state.tasks.filter((task) => task.listId === listId),
    listReferenceEquality,
  );
  const members = useTodos(
    (state) => state.members.filter((member) => member.listId === listId),
    listReferenceEquality,
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
  const [inlineEditingTaskId, setInlineEditingTaskId] = useState<string | null>(
    null,
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const dismissChrome = () => {
    Keyboard.dismiss();
    setExpandedTaskId(null);
  };

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
    setInlineEditingTaskId(null);
    setExpandedTaskId(null);
    setDraft('');
    setFilter('open');
    haptics.success();
  };

  const clearDone = () => {
    confirmDestructiveAction({
      title: 'Clear Completed Tasks?',
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
      <Screen contentStyle={styles.missingList}>
        <Symbol name="tasks" size={40} color={theme.textTertiary} />
        <AppText variant="heading">List Unavailable</AppText>
        <AppText variant="body" color="secondary" align="center">
          It may have been deleted, or you may no longer have access.
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(tabs)/to-do' as never)}>
          <AppText variant="callout" color="accent">Back to Lists</AppText>
        </Pressable>
      </Screen>
    );
  }

  const owner = list.role === 'owner';

  return (
    <Screen
      scroll={false}
      bottomInset={false}
      contentStyle={styles.screenContent}>
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
              { paddingBottom: tabBarHeight + spacing.lg },
              visibleTasks.length === 0 && styles.listEmptyContent,
            ]}
            contentInsetAdjustmentBehavior="never"
            data={visibleTasks}
            refreshControl={refreshControl}
            dragItemOverflow={false}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={dismissChrome}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => (
              <ChecklistItemSeparator onPress={dismissChrome} />
            )}
            ListFooterComponent={
              <Pressable
                accessible={!!inlineEditingTaskId}
                accessibilityRole={inlineEditingTaskId ? 'button' : undefined}
                accessibilityLabel={
                  inlineEditingTaskId ? 'Finish editing' : undefined
                }
                onPress={dismissChrome}
                style={styles.listDismissFooter}
              />
            }
            ListHeaderComponent={
              <Pressable
                accessible={false}
                onPress={dismissChrome}
                style={styles.listHeader}
              >
                <View style={styles.heading}>
                  <IconButton
                    icon="chevron-left"
                    size={40}
                    background="transparent"
                    accessibilityLabel="Back to checklists"
                    onPress={() => {
                      if (router.canGoBack()) router.back();
                      else router.replace('/(tabs)/to-do' as never);
                    }}
                  />
                  <View style={styles.headingCopy}>
                    <AppText variant="overline" color="accent">
                      {dateLabel}
                    </AppText>
                    <AppText style={styles.title}>{list.name}</AppText>
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
                    underlineColorAndroid="transparent"
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
                      dismissChrome();
                      setEditingTaskIds(null);
                      setInlineEditingTaskId(null);
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
                    <AppText
                      variant="overline"
                      color="secondary"
                      style={styles.taskStatusLabel}>
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
                      style={[
                        styles.taskStatusCount,
                        {
                          color:
                            filter === 'open'
                              ? theme.accentPrimary
                              : theme.success,
                        },
                      ]}>
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
                          dismissChrome();
                          setInlineEditingTaskId(null);
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
                      title="Sort Items"
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
                          title: 'Newest First',
                          description: 'Most recently added at the top',
                          icon: 'arrow-down',
                          selected: sort === 'newest',
                        },
                        {
                          id: 'oldest',
                          title: 'Oldest First',
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
                      title="List Actions"
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
                                title: 'Clear Completed',
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
              </Pressable>
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
                  editing={inlineEditingTaskId === item.id}
                  expanded={expandedTaskId === item.id}
                  isActive={isActive}
                  listOwner={owner}
                  members={members}
                  onCollapseTitle={() => setExpandedTaskId(null)}
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
                  onToggleExpanded={() =>
                    setExpandedTaskId((id) =>
                      id === item.id ? null : item.id,
                    )
                  }
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
                  onStartEdit={() => {
                    setExpandedTaskId(null);
                    setInlineEditingTaskId(item.id);
                  }}
                  onEndEdit={() =>
                    setInlineEditingTaskId((id) =>
                      id === item.id ? null : id,
                    )
                  }
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
    gap: spacing.sm,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '400',
    letterSpacing: -0.65,
  },
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
  taskStatusLabel: {
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  taskStatusCount: {
    fontSize: 17,
    lineHeight: 18,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  taskStatusDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
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
  listContent: { flexGrow: 1 },
  listEmptyContent: { flexGrow: 1 },
  listDismissFooter: { minHeight: spacing.xxl * 3, flexGrow: 1 },
  activeTaskRow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  missingList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  pressed: { opacity: 0.62 },
});
