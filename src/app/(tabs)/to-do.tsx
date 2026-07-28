import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutLeft,
  interpolate,
  LinearTransition,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppText, ProgressRing, Screen, Symbol } from '@/components/primitives';
import {
  fontFamilies,
  layout,
  radii,
  spacing,
  typography,
} from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTodos, type TodoTask } from '@/store/todos';
import { haptics } from '@/utils/haptics';

type TodoFilter = 'open' | 'completed';

const QUICK_START_TASKS = [
  'Plan tomorrow',
  'Take a movement break',
  'Call someone I care about',
] as const;

function byPriorityAndRecency(a: TodoTask, b: TodoTask) {
  if (a.important !== b.important) return a.important ? -1 : 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export default function TodoScreen() {
  const theme = useTheme();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const tasks = useTodos((state) => state.tasks);
  const addTask = useTodos((state) => state.addTask);
  const toggleTask = useTodos((state) => state.toggleTask);
  const toggleImportant = useTodos((state) => state.toggleImportant);
  const updateTask = useTodos((state) => state.updateTask);
  const deleteTask = useTodos((state) => state.deleteTask);
  const clearCompleted = useTodos((state) => state.clearCompleted);
  const inputRef = useRef<TextInput>(null);
  const openSwipeableRef = useRef<SwipeableMethods | null>(null);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState<TodoFilter>('open');

  const openTasks = useMemo(
    () => tasks.filter((task) => !task.completed).sort(byPriorityAndRecency),
    [tasks],
  );
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.completed)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
    [tasks],
  );
  const visibleTasks = filter === 'open' ? openTasks : completedTasks;
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
    const task = addTask(title);
    if (!task) return;
    setDraft('');
    setFilter('open');
    haptics.success();
  };

  const clearDone = () => {
    Alert.alert(
      'Clear completed tasks?',
      'This removes every completed task from your list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCompleted();
            haptics.warning();
          },
        },
      ],
    );
  };

  const heroCopy =
    tasks.length === 0
      ? 'A clear page is a fresh start.'
      : openTasks.length === 0
        ? 'Everything is handled. Take the win.'
        : completedCount === 0
          ? `${openTasks.length} ${openTasks.length === 1 ? 'task is' : 'tasks are'} ready for your attention.`
          : `${completedCount} down. Keep the rhythm going.`;

  return (
    <Screen scroll={false} contentStyle={styles.screenContent}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <View style={styles.content}>
          <View style={styles.heading}>
            <View style={styles.headingCopy}>
              <AppText variant="overline" color="accent">
                {dateLabel}
              </AppText>
              <AppText style={styles.title}>To Do</AppText>
            </View>
            <View
              style={[
                styles.openPill,
                { backgroundColor: openTasks.length ? theme.accentFaint : theme.backgroundSunken },
              ]}>
              <View
                style={[
                  styles.openDot,
                  { backgroundColor: openTasks.length ? theme.accentPrimary : theme.success },
                ]}
              />
              <AppText variant="caption" color={openTasks.length ? 'accent' : 'success'}>
                {openTasks.length ? `${openTasks.length} open` : 'All clear'}
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
            ]}>
            <View style={styles.heroCopy}>
              <AppText variant="overline" color="tertiary">
                Momentum
              </AppText>
              <AppText variant="heading">{heroCopy}</AppText>
              <AppText variant="caption" color="secondary">
                {tasks.length === 0
                  ? 'Capture the next thing. The rest can wait.'
                  : `${completedCount} of ${tasks.length} complete`}
              </AppText>
            </View>
            <ProgressRing
              progress={progress}
              size={78}
              strokeWidth={7}
              label={`${Math.round(progress * 100)}%`}
              sublabel="done"
              trackColor={theme.backgroundSunken}
            />
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
                  backgroundColor: draft.trim() ? theme.accentPrimary : theme.separator,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}>
              <Symbol name="arrow-up" size={18} color={theme.textOnAccent} />
            </Pressable>
          </View>

          <View style={styles.controls}>
            <View style={[styles.segment, { backgroundColor: theme.backgroundSunken }]}>
              <FilterButton
                active={filter === 'open'}
                label={`Open ${openTasks.length}`}
                onPress={() => setFilter('open')}
              />
              <FilterButton
                active={filter === 'completed'}
                label={`Done ${completedCount}`}
                onPress={() => setFilter('completed')}
              />
            </View>
            {filter === 'completed' && completedCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear completed tasks"
                onPress={clearDone}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <AppText variant="caption" color="danger">
                  Clear
                </AppText>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            contentContainerStyle={[
              styles.listContent,
              visibleTasks.length === 0 && styles.listEmptyContent,
            ]}
            contentInsetAdjustmentBehavior="never"
            data={visibleTasks}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <TodoEmptyState
                filter={filter}
                hasTasks={tasks.length > 0}
                onAddSuggestion={add}
                onFocusComposer={() => inputRef.current?.focus()}
                onShowCompleted={() => setFilter('completed')}
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay(Math.min(index, 5) * 36).duration(220)}
                exiting={FadeOutLeft.duration(180)}
                layout={LinearTransition.duration(220)}>
                <TodoRow
                  task={item}
                  onSwipeOpen={(swipeable) => {
                    if (
                      openSwipeableRef.current &&
                      openSwipeableRef.current !== swipeable
                    ) {
                      openSwipeableRef.current.close();
                    }
                    openSwipeableRef.current = swipeable;
                  }}
                  onDelete={() => {
                    deleteTask(item.id);
                    haptics.warning();
                  }}
                  onToggle={() => {
                    toggleTask(item.id);
                    if (item.completed) haptics.select();
                    else haptics.success();
                  }}
                  onToggleImportant={() => {
                    toggleImportant(item.id);
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
      </TouchableWithoutFeedback>
    </Screen>
  );
}

function FilterButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        styles.filterButton,
        active && {
          backgroundColor: theme.backgroundElevated,
          boxShadow:
            theme.name === 'light'
              ? '0 1px 4px rgba(61, 50, 32, 0.10)'
              : '0 1px 4px rgba(0, 0, 0, 0.28)',
        },
        pressed && styles.pressed,
      ]}>
      <AppText variant="caption" color={active ? 'primary' : 'secondary'}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TodoRow({
  task,
  onDelete,
  onToggle,
  onToggleImportant,
  onUpdate,
  onSwipeOpen,
}: {
  task: TodoTask;
  onDelete: () => void;
  onToggle: () => void;
  onToggleImportant: () => void;
  onUpdate: (title: string) => void;
  onSwipeOpen: (swipeable: SwipeableMethods) => void;
}) {
  const theme = useTheme();
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  const commitEdit = () => {
    const title = draft.trim();
    if (title) onUpdate(title);
    else setDraft(task.title);
    setEditing(false);
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      dragOffsetFromRightEdge={12}
      enableTrackpadTwoFingerGesture
      friction={1.15}
      overshootRight={false}
      rightThreshold={44}
      containerStyle={[
        styles.swipeable,
        { backgroundColor: theme.danger },
      ]}
      onSwipeableOpenStartDrag={() => {
        Keyboard.dismiss();
        haptics.select();
      }}
      onSwipeableWillOpen={() => {
        if (swipeableRef.current) onSwipeOpen(swipeableRef.current);
      }}
      renderRightActions={(progress, _translation, swipeable) => (
        <DeleteAction
          progress={progress}
          swipeable={swipeable}
          taskTitle={task.title}
          onDelete={onDelete}
        />
      )}>
      <View
        accessibilityActions={[{ name: 'delete', label: `Delete ${task.title}` }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') onDelete();
        }}
        style={[
          styles.taskRow,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor:
              task.important && !task.completed ? theme.accentSoft : theme.separator,
          },
        ]}>
        <Pressable
          accessibilityLabel={
            task.completed ? `Mark ${task.title} as open` : `Complete ${task.title}`
          }
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.completed }}
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
              transform: [{ scale: pressed ? 0.88 : 1 }],
            },
          ]}>
          {task.completed ? (
            <Symbol name="check" size={15} color={theme.textOnAccent} />
          ) : null}
        </Pressable>

        <View style={styles.taskCopy}>
          {editing ? (
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
              onPress={() => {
                Keyboard.dismiss();
                setEditing(true);
              }}
              style={({ pressed }) => pressed && styles.pressed}>
              <AppText
                variant="bodyMedium"
                color={task.completed ? 'tertiary' : 'primary'}
                numberOfLines={2}
                style={task.completed ? styles.completedTitle : undefined}>
                {task.title}
              </AppText>
            </Pressable>
          )}
          {task.important && !task.completed ? (
            <AppText variant="overline" color="accent">
              Focus
            </AppText>
          ) : null}
        </View>

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
      </View>
    </ReanimatedSwipeable>
  );
}

function DeleteAction({
  progress,
  swipeable,
  taskTitle,
  onDelete,
}: {
  progress: SharedValue<number>;
  swipeable: SwipeableMethods;
  taskTitle: string;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0.7, 1], 'clamp'),
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [32, 0], 'clamp'),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.deleteAction, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${taskTitle}`}
        onPress={() => {
          swipeable.close();
          onDelete();
        }}
        style={({ pressed }) => [styles.deleteButton, pressed && styles.deletePressed]}>
        <Symbol name="delete" size={19} color={theme.textOnAccent} />
        <AppText variant="caption" color="onAccent">
          Delete
        </AppText>
      </Pressable>
    </Animated.View>
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
        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSunken }]}>
          <Symbol name="status-completed" size={29} color={theme.textTertiary} />
        </View>
        <AppText variant="heading">A clean slate</AppText>
        <AppText variant="body" color="secondary" align="center">
          Completed tasks will collect here when you’re ready to look back.
        </AppText>
      </View>
    );
  }

  if (hasTasks) {
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.accentFaint }]}>
          <Symbol name="status-completed" size={29} color={theme.success} />
        </View>
        <AppText variant="heading">Everything is handled</AppText>
        <AppText variant="body" color="secondary" align="center">
          Enjoy the space you made—or add the next small thing.
        </AppText>
        <View style={styles.emptyActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onShowCompleted}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.backgroundSunken },
              pressed && styles.pressed,
            ]}>
            <AppText variant="callout">View completed</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onFocusComposer}
            style={({ pressed }) => [
              styles.emptyAction,
              { backgroundColor: theme.accentPrimary },
              pressed && styles.pressed,
            ]}>
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
        <Symbol name="tasks" size={29} color={theme.accentPrimary} />
      </View>
      <AppText variant="heading">Your list is wide open</AppText>
      <AppText variant="body" color="secondary" align="center">
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
              { backgroundColor: theme.backgroundSunken, borderColor: theme.separator },
              pressed && styles.pressed,
            ]}>
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
    paddingTop: Platform.select({ web: 76, default: spacing.lg }),
  },
  content: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    flex: 1,
    alignSelf: 'center',
    gap: spacing.md,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headingCopy: { gap: spacing.xxs },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: '600',
  },
  openPill: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  openDot: { width: 7, height: 7, borderRadius: radii.pill },
  hero: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCopy: { flex: 1, gap: spacing.xs },
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  controls: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.pill,
  },
  filterButton: {
    minHeight: 32,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  clearButton: {
    minWidth: layout.minTapTarget,
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
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
  swipeable: {
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
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
  deleteAction: {
    width: 88,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  deletePressed: { opacity: 0.72 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  emptyIcon: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    borderCurve: 'continuous',
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
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  emptyAction: {
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  pressed: { opacity: 0.62 },
});
