import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import {
    appPrompt,
    AppText,
    Button,
    Card,
    ErrorMessage,
    IconButton,
    ProgressRing,
    Screen,
    Symbol,
} from '@/components/primitives';
import { fontFamilies, layout, radii, spacing, typography } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
    buildCombinedIngredients,
    type CombinedCompletion,
} from '@/features/todos/grocery-utils';
import { copyTodoListText, shareTodoListText } from '@/features/todos/share';
import { useTheme } from '@/hooks/use-theme';
import { deletePersistedRecipeImage } from '@/services/recipes';
import {
    canCompleteTodo,
    useTodos,
    type TodoRecipe,
    type TodoTask,
} from '@/store/todos';
import { useUI } from '@/store/ui';
import { haptics } from '@/utils/haptics';
import { openHttpsUrl, safeHttpsUrl } from '@/utils/safe-url';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GroceryView = 'meal' | 'combined';

function confirmDeleteRecipe(recipe: TodoRecipe, onDelete: () => void) {
  const title = `Delete “${recipe.name}”?`;
  const message = 'The meal and all of its ingredient items will be removed.';
  appPrompt.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

export function GroceryListScreen({ listId }: { listId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight ||
    layout.floatingTabBarBaseHeight + insets.bottom;
  const { user } = useAuthSession();
  const list = useTodos((state) =>
    state.lists.find((item) => item.id === listId),
  );
  const allTasks = useTodos((state) => state.tasks);
  const allRecipes = useTodos((state) => state.recipes);
  const allMembers = useTodos((state) => state.members);
  const members = useMemo(
    () => allMembers.filter((member) => member.listId === listId),
    [allMembers, listId],
  );
  const addTask = useTodos((state) => state.addTask);
  const setTasksCompletion = useTodos((state) => state.setTasksCompletion);
  const deleteTask = useTodos((state) => state.deleteTask);
  const deleteRecipe = useTodos((state) => state.deleteRecipe);
  const clearCompleted = useTodos((state) => state.clearCompleted);
  const syncError = useTodos((state) => state.syncError);
  const clearSyncError = useTodos((state) => state.clearSyncError);
  const [view, setView] = useState<GroceryView>('meal');
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [draft, setDraft] = useState('');

  const tasks = useMemo(
    () => allTasks.filter((task) => task.listId === listId),
    [allTasks, listId],
  );
  const recipes = useMemo(
    () =>
      allRecipes
        .filter((recipe) => recipe.listId === listId)
        .sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) -
              (b.position ?? Number.MAX_SAFE_INTEGER) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    [allRecipes, listId],
  );
  const standalone = useMemo(
    () =>
      tasks
        .filter((task) => !task.recipeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [tasks],
  );
  const ingredients = useMemo(
    () => tasks.filter((task) => task.recipeId),
    [tasks],
  );
  const combined = useMemo(
    () => buildCombinedIngredients(ingredients),
    [ingredients],
  );

  if (!list) {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="groceries" size={42} color={theme.textTertiary} />
        <AppText variant="heading">Grocery list unavailable</AppText>
        <Button onPress={() => router.replace('/(tabs)/to-do' as never)}>
          Back to lists
        </Button>
      </Screen>
    );
  }

  const owner = list.role === 'owner';
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? completedCount / tasks.length : 0;
  const addOther = () => {
    if (!addTask(listId, draft)) return;
    setDraft('');
    haptics.success();
  };
  const toggleIds = (ids: string[], completion: CombinedCompletion) => {
    setTasksCompletion(ids, completion === 'checked' ? false : true, user?.id);
    haptics.select();
  };

  return (
    <Screen
      bottomInset={false}
      contentStyle={{
        ...styles.screen,
        paddingBottom: tabBarHeight + spacing.lg,
      }}>
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
            Grocery list
          </AppText>
          <AppText style={styles.title}>{list.name}</AppText>
          <AppText variant="body" color="secondary">
            {tasks.length
              ? `${completedCount} of ${tasks.length} ingredients and items checked`
              : 'Add a recipe or capture a one-off item.'}
          </AppText>
        </View>
        <ProgressRing
          progress={progress}
          size={52}
          strokeWidth={4}
          label={`${Math.round(progress * 100)}%`}
          sublabel="done"
          trackColor={theme.backgroundSunken}
        />
      </View>

      <View style={styles.headerActions}>
        {owner ? (
          <Button
            icon="add"
            onPress={() => router.push(`/todos/${listId}/recipe-import` as never)}>
            Add recipe
          </Button>
        ) : (
          <Card variant="sunken" style={styles.memberNotice}>
            <AppText variant="caption" color="secondary">
              You can check ingredients assigned to you or Anyone.
            </AppText>
          </Card>
        )}
        <Pressable
          accessibilityLabel="Grocery list settings"
          accessibilityRole="button"
          onPress={() => router.push(`/todos/${listId}/settings` as never)}
          style={[
            styles.iconButton,
            { backgroundColor: theme.backgroundSunken },
          ]}>
          <Symbol name="settings" size={20} color={theme.textSecondary} />
        </Pressable>
        <Pressable
          accessibilityLabel="Share grocery list"
          accessibilityRole="button"
          onPress={() =>
            void shareTodoListText(list, tasks, members, recipes)
          }
          style={[
            styles.iconButton,
            { backgroundColor: theme.backgroundSunken },
          ]}>
          <Symbol name="share" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      {syncError ? (
        <Pressable onPress={clearSyncError}>
          <ErrorMessage message={syncError} />
        </Pressable>
      ) : null}

      <View
        accessibilityRole="tablist"
        style={[styles.segmented, { backgroundColor: theme.backgroundSunken }]}>
        {([
          ['meal', 'By meal'],
          ['combined', 'Combined'],
        ] as const).map(([id, label]) => {
          const selected = view === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setView(id);
                haptics.select();
              }}
              style={[
                styles.segment,
                selected && { backgroundColor: theme.backgroundElevated },
              ]}>
              <AppText
                variant="callout"
                color={selected ? 'accent' : 'secondary'}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {view === 'meal' ? (
        <View style={styles.sections}>
          {recipes.map((recipe) => {
            const recipeTasks = ingredients
              .filter((task) => task.recipeId === recipe.id)
              .sort(
                (a, b) =>
                  (a.ingredientPosition ?? Number.MAX_SAFE_INTEGER) -
                  (b.ingredientPosition ?? Number.MAX_SAFE_INTEGER),
              );
            return (
              <MealCard
                key={recipe.id}
                collapsed={collapsedIds.has(recipe.id)}
                listOwner={owner}
                recipe={recipe}
                tasks={recipeTasks}
                onDelete={() =>
                  confirmDeleteRecipe(recipe, () => {
                    deletePersistedRecipeImage(recipe.sourceImageUri);
                    deleteRecipe(recipe.id);
                  })
                }
                onToggleCollapsed={() =>
                  setCollapsedIds((current) => {
                    const next = new Set(current);
                    if (next.has(recipe.id)) next.delete(recipe.id);
                    else next.add(recipe.id);
                    return next;
                  })
                }
                onToggleTask={(task) =>
                  setTasksCompletion([task.id], !task.completed, user?.id)
                }
                canComplete={(task) =>
                  canCompleteTodo(list, task, user?.id)
                }
              />
            );
          })}
          {recipes.length === 0 ? (
            <Card variant="sunken" style={styles.emptyRecipe}>
              <Symbol name="groceries" size={30} color={theme.accentPrimary} />
              <AppText variant="heading">Bring a meal into your list</AppText>
              <AppText variant="body" color="secondary" align="center">
                Import a recipe link, camera photo, or screenshot. You’ll review
                every ingredient before it is saved.
              </AppText>
            </Card>
          ) : null}
          <OtherItems
            tasks={standalone}
            owner={owner}
            draft={draft}
            onDraftChange={setDraft}
            onAdd={addOther}
            onDelete={deleteTask}
            onToggle={(task) =>
              setTasksCompletion([task.id], !task.completed, user?.id)
            }
            canComplete={(task) => canCompleteTodo(list, task, user?.id)}
          />
        </View>
      ) : (
        <View style={styles.sections}>
          <View style={styles.sectionHeading}>
            <View>
              <AppText variant="overline" color="accent">
                Shopping view
              </AppText>
              <AppText variant="heading">Combined ingredients</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => void copyTodoListText(list, tasks, members, recipes)}>
              <AppText variant="caption" color="accent">
                Copy
              </AppText>
            </Pressable>
          </View>
          <Card padded={false}>
            {combined.length ? (
              combined.map((group, index) => (
                <CombinedRow
                  key={group.id}
                  completion={group.completion}
                  disabled={!group.taskIds.some((id) => {
                    const task = tasks.find((item) => item.id === id);
                    return task
                      ? canCompleteTodo(list, task, user?.id)
                      : false;
                  })}
                  first={index === 0}
                  name={group.name}
                  amounts={group.amountFragments}
                  occurrences={group.totalCount}
                  onToggle={() => toggleIds(group.taskIds, group.completion)}
                />
              ))
            ) : (
              <View style={styles.emptyCombined}>
                <AppText variant="body" color="secondary" align="center">
                  Recipe ingredients will be grouped here.
                </AppText>
              </View>
            )}
          </Card>
          <OtherItems
            tasks={standalone}
            owner={owner}
            draft={draft}
            onDraftChange={setDraft}
            onAdd={addOther}
            onDelete={deleteTask}
            onToggle={(task) =>
              setTasksCompletion([task.id], !task.completed, user?.id)
            }
            canComplete={(task) => canCompleteTodo(list, task, user?.id)}
          />
        </View>
      )}

      {owner && completedCount > 0 ? (
        <Button
          variant="ghost"
          onPress={() => {
            const clear = () => {
              for (const recipe of recipes) {
                const recipeTasks = ingredients.filter(
                  (task) => task.recipeId === recipe.id,
                );
                if (
                  recipeTasks.length > 0 &&
                  recipeTasks.every((task) => task.completed)
                ) {
                  deletePersistedRecipeImage(recipe.sourceImageUri);
                }
              }
              clearCompleted(listId);
            };
            appPrompt.alert(
              'Clear checked items?',
              `This removes ${completedCount} underlying ${completedCount === 1 ? 'item' : 'items'}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clear },
              ],
            );
          }}>
          Clear {completedCount} checked
        </Button>
      ) : null}
    </Screen>
  );
}

function Checkbox({
  completion,
  disabled,
}: {
  completion: CombinedCompletion;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.checkbox,
        {
          backgroundColor:
            completion === 'unchecked' ? 'transparent' : theme.accentPrimary,
          borderColor:
            completion === 'unchecked' ? theme.separator : theme.accentPrimary,
          opacity: disabled ? 0.45 : 1,
        },
      ]}>
      {completion === 'checked' ? (
        <Symbol name="check" size={13} color={theme.textOnAccent} />
      ) : completion === 'mixed' ? (
        <View
          style={[styles.mixedMark, { backgroundColor: theme.textOnAccent }]}
        />
      ) : null}
    </View>
  );
}

function GroceryTaskRow({
  task,
  canComplete,
  onToggle,
  onDelete,
}: {
  task: TodoTask;
  canComplete: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.taskRow, { borderTopColor: theme.separator }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed, disabled: !canComplete }}
        disabled={!canComplete}
        onPress={onToggle}
        hitSlop={4}>
        <Checkbox
          completion={task.completed ? 'checked' : 'unchecked'}
          disabled={!canComplete}
        />
      </Pressable>
      <View style={styles.taskCopy}>
        <AppText
          variant="body"
          style={task.completed ? styles.completedText : undefined}>
          {task.ingredientName || task.title}
        </AppText>
        {task.recipeId ? (
          <AppText variant="caption" color="secondary">
            {[task.quantityText, task.unit, task.preparation]
              .filter(Boolean)
              .join(' · ') || 'Amount not specified'}
          </AppText>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Delete ${task.title}`}
          onPress={onDelete}
          hitSlop={8}>
          <Symbol name="delete" size={17} color={theme.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function MealCard({
  recipe,
  tasks,
  collapsed,
  listOwner,
  canComplete,
  onToggleTask,
  onToggleCollapsed,
  onDelete,
}: {
  recipe: TodoRecipe;
  tasks: TodoTask[];
  collapsed: boolean;
  listOwner: boolean;
  canComplete: (task: TodoTask) => boolean;
  onToggleTask: (task: TodoTask) => void;
  onToggleCollapsed: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const done = tasks.filter((task) => task.completed).length;
  return (
    <Card padded={false}>
      {recipe.sourceImageUri ? (
        <Image
          source={{ uri: recipe.sourceImageUri }}
          contentFit="cover"
          style={styles.recipeImage}
          transition={160}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={onToggleCollapsed}
        style={styles.mealHeader}>
        <View style={styles.mealHeaderCopy}>
          <AppText variant="heading">{recipe.name}</AppText>
          <AppText variant="caption" color="secondary">
            {recipe.targetServings
              ? `${recipe.targetServings} servings · `
              : ''}
            {done} of {tasks.length} checked
          </AppText>
        </View>
        <Symbol
          name={collapsed ? 'chevron-down' : 'chevron-up'}
          size={19}
          color={theme.textSecondary}
        />
      </Pressable>
      {!collapsed ? (
        <>
          {(safeHttpsUrl(recipe.sourceUrl) || listOwner) ? (
            <View style={styles.mealActions}>
              {safeHttpsUrl(recipe.sourceUrl) ? (
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void openHttpsUrl(recipe.sourceUrl)}
                  style={styles.sourceLink}>
                  <Symbol
                    name="open-external"
                    size={14}
                    color={theme.accentPrimary}
                  />
                  <AppText variant="caption" color="accent">
                    Open source
                  </AppText>
                </Pressable>
              ) : <View />}
              {listOwner ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onDelete}
                  hitSlop={8}>
                  <AppText variant="caption" color="danger">
                    Delete meal
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {tasks.map((task) => (
            <GroceryTaskRow
              key={task.id}
              task={task}
              canComplete={canComplete(task)}
              onToggle={() => onToggleTask(task)}
            />
          ))}
        </>
      ) : null}
    </Card>
  );
}

function CombinedRow({
  completion,
  disabled,
  first,
  name,
  amounts,
  occurrences,
  onToggle,
}: {
  completion: CombinedCompletion;
  disabled: boolean;
  first: boolean;
  name: string;
  amounts: string[];
  occurrences: number;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: completion === 'mixed' ? 'mixed' : completion === 'checked',
        disabled,
      }}
      disabled={disabled}
      onPress={onToggle}
      style={[
        styles.combinedRow,
        !first && { borderTopColor: theme.separator, borderTopWidth: 1 },
      ]}>
      <Checkbox completion={completion} disabled={disabled} />
      <View style={styles.taskCopy}>
        <AppText variant="body">{name}</AppText>
        <AppText variant="caption" color="secondary">
          {amounts.join(' + ')}
          {occurrences > 1 ? ` · ${occurrences} meals` : ''}
        </AppText>
      </View>
    </Pressable>
  );
}

function OtherItems({
  tasks,
  owner,
  draft,
  onDraftChange,
  onAdd,
  onDelete,
  onToggle,
  canComplete,
}: {
  tasks: TodoTask[];
  owner: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggle: (task: TodoTask) => void;
  canComplete: (task: TodoTask) => boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.otherSection}>
      <AppText variant="heading">Other items</AppText>
      {owner ? (
        <View
          style={[
            styles.composer,
            {
              backgroundColor: theme.backgroundSunken,
              borderColor: draft.trim() ? theme.accentPrimary : theme.separator,
            },
          ]}>
          <TextInput
            accessibilityLabel="New grocery item"
            maxLength={160}
            onChangeText={onDraftChange}
            onSubmitEditing={onAdd}
            placeholder="Milk, paper towels…"
            placeholderTextColor={theme.textTertiary}
            returnKeyType="done"
            style={[styles.composerInput, { color: theme.textPrimary }]}
            value={draft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add grocery item"
            disabled={!draft.trim()}
            onPress={onAdd}
            style={[
              styles.addButton,
              {
                backgroundColor: draft.trim()
                  ? theme.accentPrimary
                  : theme.separator,
              },
            ]}>
            <Symbol name="add" size={18} color={theme.textOnAccent} />
          </Pressable>
        </View>
      ) : null}
      {tasks.length ? (
        <Card padded={false}>
          {tasks.map((task) => (
            <GroceryTaskRow
              key={task.id}
              task={task}
              canComplete={canComplete(task)}
              onToggle={() => onToggle(task)}
              onDelete={owner ? () => onDelete(task.id) : undefined}
            />
          ))}
        </Card>
      ) : (
        <AppText variant="caption" color="tertiary">
          No standalone items.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: spacing.xl,
    paddingTop: Platform.select({ web: 64, default: spacing.sm }),
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headingCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: {
    fontFamily: fontFamilies.serif,
    fontSize: 35,
    lineHeight: 42,
    fontWeight: '400',
    letterSpacing: -0.7,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  memberNotice: { flex: 1 },
  iconButton: {
    width: layout.minTapTarget,
    height: layout.minTapTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radii.pill,
  },
  segment: {
    flex: 1,
    minHeight: layout.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  sections: { gap: spacing.lg },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  mealHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  mealHeaderCopy: { flex: 1, gap: spacing.xs },
  recipeImage: { width: '100%', height: 160 },
  mealActions: {
    minHeight: layout.minTapTarget,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  taskRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  taskCopy: { flex: 1, gap: spacing.xxs },
  completedText: { textDecorationLine: 'line-through', opacity: 0.55 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedMark: {
    width: 11,
    height: 2,
    borderRadius: radii.pill,
  },
  combinedRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyCombined: { padding: spacing.xxl },
  emptyRecipe: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  otherSection: { gap: spacing.md },
  composer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
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
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
