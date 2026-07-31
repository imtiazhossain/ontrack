import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {
    AppText,
    Button,
    Card,
    ErrorMessage,
    IconButton,
    ProgressRing,
    Screen,
    Symbol,
} from '@/components/primitives';
import { fontFamilies, layout, radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
    buildCombinedIngredients,
    type CombinedCompletion,
    type CombinedIngredient,
} from '@/features/todos/grocery-utils';
import {
    CombinedRow,
    MealCard,
    OtherItems,
} from '@/features/todos/grocery-rows';
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
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { haptics } from '@/utils/haptics';
import { listReferenceEquality } from '@/utils/list-equality';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GroceryView = 'meal' | 'combined';

type GroceryListRow =
  | { type: 'meal'; key: string; recipe: TodoRecipe; tasks: TodoTask[] }
  | { type: 'empty-recipes'; key: 'empty-recipes' }
  | { type: 'combined-heading'; key: 'combined-heading' }
  | { type: 'combined-card'; key: 'combined-card'; groups: CombinedIngredient[] }
  | { type: 'empty-combined'; key: 'empty-combined' }
  | { type: 'other-items'; key: 'other-items' }
  | { type: 'clear'; key: 'clear' };

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
  const tasks = useTodos(
    (state) => state.tasks.filter((task) => task.listId === listId),
    listReferenceEquality,
  );
  const recipes = useTodos(
    (state) =>
      state.recipes
        .filter((recipe) => recipe.listId === listId)
        .sort(
          (a, b) =>
            (a.position ?? Number.MAX_SAFE_INTEGER) -
              (b.position ?? Number.MAX_SAFE_INTEGER) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
    listReferenceEquality,
  );
  const members = useTodos(
    (state) => state.members.filter((member) => member.listId === listId),
    listReferenceEquality,
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

  const owner = list?.role === 'owner';
  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length ? completedCount / tasks.length : 0;

  const addOther = useCallback(() => {
    if (!addTask(listId, draft)) return;
    setDraft('');
    haptics.success();
  }, [addTask, draft, listId]);

  const toggleIds = useCallback(
    (ids: string[], completion: CombinedCompletion) => {
      setTasksCompletion(ids, completion === 'checked' ? false : true, user?.id);
      haptics.select();
    },
    [setTasksCompletion, user?.id],
  );

  const mealRows = useMemo(() => {
    const rows: GroceryListRow[] = recipes.map((recipe) => ({
      type: 'meal',
      key: recipe.id,
      recipe,
      tasks: ingredients
        .filter((task) => task.recipeId === recipe.id)
        .sort(
          (a, b) =>
            (a.ingredientPosition ?? Number.MAX_SAFE_INTEGER) -
            (b.ingredientPosition ?? Number.MAX_SAFE_INTEGER),
        ),
    }));
    if (recipes.length === 0) {
      rows.push({ type: 'empty-recipes', key: 'empty-recipes' });
    }
    rows.push({ type: 'other-items', key: 'other-items' });
    if (owner && completedCount > 0) {
      rows.push({ type: 'clear', key: 'clear' });
    }
    return rows;
  }, [completedCount, ingredients, owner, recipes]);

  const combinedRows = useMemo(() => {
    const rows: GroceryListRow[] = [{ type: 'combined-heading', key: 'combined-heading' }];
    if (combined.length) {
      rows.push({ type: 'combined-card', key: 'combined-card', groups: combined });
    } else {
      rows.push({ type: 'empty-combined', key: 'empty-combined' });
    }
    rows.push({ type: 'other-items', key: 'other-items' });
    if (owner && completedCount > 0) {
      rows.push({ type: 'clear', key: 'clear' });
    }
    return rows;
  }, [combined, completedCount, owner]);

  const listData = view === 'meal' ? mealRows : combinedRows;

  const renderItem = useCallback(
    ({ item }: { item: GroceryListRow }) => {
      if (!list) return null;

      switch (item.type) {
        case 'meal':
          return (
            <View style={styles.row}>
              <MealCard
                collapsed={collapsedIds.has(item.recipe.id)}
                listOwner={owner}
                recipe={item.recipe}
                tasks={item.tasks}
                onDelete={() =>
                  confirmDestructiveAction({
                    title: `Delete “${item.recipe.name}”?`,
                    message:
                      'The meal and all of its ingredient items will be removed.',
                    onConfirm: () => {
                      deletePersistedRecipeImage(item.recipe.sourceImageUri);
                      deleteRecipe(item.recipe.id);
                    },
                  })
                }
                onToggleCollapsed={() =>
                  setCollapsedIds((current) => {
                    const next = new Set(current);
                    if (next.has(item.recipe.id)) next.delete(item.recipe.id);
                    else next.add(item.recipe.id);
                    return next;
                  })
                }
                onToggleTask={(task) =>
                  setTasksCompletion([task.id], !task.completed, user?.id)
                }
                canComplete={(task) => canCompleteTodo(list, task, user?.id)}
              />
            </View>
          );
        case 'empty-recipes':
          return (
            <View style={styles.row}>
              <Card variant="sunken" style={styles.emptyRecipe}>
                <Symbol name="groceries" size={30} color={theme.accentPrimary} />
                <AppText variant="heading">Bring a Meal into Your List</AppText>
                <AppText variant="body" color="secondary" align="center">
                  Import a recipe link, camera photo, or screenshot. You’ll review
                  every ingredient before it is saved.
                </AppText>
              </Card>
            </View>
          );
        case 'combined-heading':
          return (
            <View style={[styles.row, styles.sectionHeading]}>
              <View>
                <AppText variant="overline" color="accent">
                  Shopping view
                </AppText>
                <AppText variant="heading">Combined Ingredients</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void copyTodoListText(list, tasks, members, recipes)}>
                <AppText variant="caption" color="accent">
                  Copy
                </AppText>
              </Pressable>
            </View>
          );
        case 'combined-card':
          return (
            <View style={styles.row}>
              <Card padded={false}>
                {item.groups.map((group, index) => (
                  <CombinedRow
                    key={group.id}
                    completion={group.completion}
                    disabled={!group.taskIds.some((id) => {
                      const task = tasks.find((entry) => entry.id === id);
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
                ))}
              </Card>
            </View>
          );
        case 'empty-combined':
          return (
            <View style={styles.row}>
              <Card padded={false}>
                <View style={styles.emptyCombined}>
                  <AppText variant="body" color="secondary" align="center">
                    Recipe ingredients will be grouped here.
                  </AppText>
                </View>
              </Card>
            </View>
          );
        case 'other-items':
          return (
            <View style={styles.row}>
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
          );
        case 'clear':
          return (
            <View style={styles.row}>
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
                  confirmDestructiveAction({
                    title: 'Clear Checked Items?',
                    message: `This removes ${completedCount} underlying ${completedCount === 1 ? 'item' : 'items'}.`,
                    actionLabel: 'Clear',
                    onConfirm: clear,
                  });
                }}>
                Clear {completedCount} checked
              </Button>
            </View>
          );
        default:
          return null;
      }
    },
    [
      addOther,
      collapsedIds,
      completedCount,
      deleteRecipe,
      deleteTask,
      draft,
      ingredients,
      list,
      listId,
      members,
      owner,
      recipes,
      setTasksCompletion,
      standalone,
      tasks,
      theme.accentPrimary,
      toggleIds,
      user?.id,
    ],
  );

  if (!list) {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="groceries" size={42} color={theme.textTertiary} />
        <AppText variant="heading">Grocery List Unavailable</AppText>
        <Button onPress={() => router.replace('/(tabs)/to-do' as never)}>
          Back to Lists
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      bottomInset={false}
      contentStyle={styles.screenContent}>
      <FlashList
        data={listData}
        keyExtractor={(item) => item.key}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        extraData={[collapsedIds, draft, view]}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + spacing.lg },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
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
                  onPress={() =>
                    router.push(`/todos/${listId}/recipe-import` as never)
                  }>
                  Add Recipe
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
              style={[
                styles.segmented,
                { backgroundColor: theme.backgroundSunken },
              ]}>
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
          </View>
        }
        renderItem={renderItem}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  listContent: {
    paddingTop: Platform.select({ web: 64, default: spacing.sm }),
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  header: { gap: spacing.xl },
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
  row: { marginBottom: spacing.lg },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  emptyCombined: { padding: spacing.xxl },
  emptyRecipe: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
