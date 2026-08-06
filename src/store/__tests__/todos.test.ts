import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
    canCompleteTodo,
    canEditTodoContent,
    normalizeTodoState,
    privateTodoPayload,
    useTodos,
} from '@/store/todos';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('to-do store', () => {
  beforeEach(() => {
    useTodos.getState().reset();
  });

  it('captures, edits, prioritizes, and completes a task', () => {
    const task = useTodos.getState().addTask('  Make a thoughtful plan  ');
    expect(task?.title).toBe('Make a thoughtful plan');

    useTodos.getState().toggleImportant(task!.id);
    useTodos.getState().updateTask(task!.id, 'Make a simple plan');
    useTodos.getState().toggleTask(task!.id);

    expect(useTodos.getState().tasks[0]).toMatchObject({
      title: 'Make a simple plan',
      important: true,
      completed: true,
    });
    expect(useTodos.getState().tasks[0].completedAt).toBeDefined();
  });

  it('ignores empty tasks and clears only completed work', () => {
    expect(useTodos.getState().addTask('   ')).toBeUndefined();
    const done = useTodos.getState().addTask('Done');
    useTodos.getState().addTask('Still open');
    useTodos.getState().toggleTask(done!.id);
    useTodos.getState().clearCompleted();

    expect(useTodos.getState().tasks.map((task) => task.title)).toEqual(['Still open']);
  });

  it('keeps tasks isolated inside multiple named lists', () => {
    const groceries = useTodos.getState().createList('  Groceries  ');
    const maintenance = useTodos.getState().createList('Maintenance');
    useTodos.getState().addTask(groceries!.id, 'Milk');
    useTodos.getState().addTask(maintenance!.id, 'Replace air filter');

    expect(
      useTodos.getState().tasks
        .filter((task) => task.listId === groceries!.id)
        .map((task) => task.title),
    ).toEqual(['Milk']);
    expect(
      useTodos.getState().tasks
        .filter((task) => task.listId === maintenance!.id)
        .map((task) => task.title),
    ).toEqual(['Replace air filter']);
  });

  it('renames a checklist and normalizes its name', () => {
    const list = useTodos.getState().lists[0];

    useTodos.getState().renameList(list.id, '  Weekend   errands  ');

    expect(useTodos.getState().lists[0].name).toBe('Weekend errands');
  });

  it('persists a manual task order inside its checklist', () => {
    const list = useTodos.getState().lists[0];
    const first = useTodos.getState().addTask(list.id, 'First')!;
    const second = useTodos.getState().addTask(list.id, 'Second')!;
    const third = useTodos.getState().addTask(list.id, 'Third')!;

    useTodos.getState().reorderTasks(list.id, [
      first.id,
      third.id,
      second.id,
    ]);

    expect(
      [...useTodos.getState().tasks]
        .filter((task) => task.listId === list.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((task) => task.title),
    ).toEqual(['First', 'Third', 'Second']);
  });

  it('persists an explicit list order without changing list contents', () => {
    const groceries = useTodos.getState().createList('Groceries')!;
    const maintenance = useTodos.getState().createList('Maintenance')!;
    const originalIds = useTodos.getState().lists.map((list) => list.id);

    useTodos.getState().reorderLists([
      groceries.id,
      originalIds.find((id) => id !== groceries.id && id !== maintenance.id)!,
      maintenance.id,
    ]);

    expect(useTodos.getState().lists.map((list) => list.name)).toEqual([
      'Groceries',
      'To Do',
      'Maintenance',
    ]);

    const shared = {
      ...useTodos.getState().lists[0],
      id: '9a21f566-3bc6-43df-a125-03e4c4541963',
      name: 'Shared errands',
      mode: 'shared' as const,
    };
    useTodos.getState().replaceSharedSnapshot({ list: shared, tasks: [], members: [] });
    useTodos.getState().reorderLists([
      maintenance.id,
      shared.id,
      groceries.id,
      originalIds.find((id) => id !== groceries.id && id !== maintenance.id)!,
    ]);
    useTodos.getState().replaceSharedSnapshot({
      list: { ...shared, updatedAt: '2026-07-28T12:00:00.000Z' },
      tasks: [],
      members: [],
    });

    expect(useTodos.getState().lists.map((list) => list.name)).toEqual([
      'Maintenance',
      'Shared errands',
      'Groceries',
      'To Do',
    ]);
  });

  it('migrates the legacy flat checklist into a default list with new task ids', () => {
    const migrated = normalizeTodoState({
      tasks: [{
        id: 'legacy-task',
        title: 'Keep me',
        completed: true,
        important: true,
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
        completedAt: '2026-07-02T10:00:00.000Z',
      }],
    });

    expect(migrated.lists).toHaveLength(1);
    expect(migrated.lists[0].name).toBe('To Do');
    expect(migrated.tasks[0]).toMatchObject({
      listId: migrated.lists[0].id,
      title: 'Keep me',
      completed: true,
      important: true,
    });
    expect(migrated.tasks[0].id).not.toBe('legacy-task');
  });

  it('applies server task positions from shared snapshots', () => {
    const shared = {
      ...useTodos.getState().lists[0],
      id: '9a21f566-3bc6-43df-a125-03e4c4541963',
      name: 'Shared order',
      mode: 'shared' as const,
    };
    const base = {
      listId: shared.id,
      completed: false,
      important: false,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      version: 0,
    };
    useTodos.getState().replaceSharedSnapshot({
      list: shared,
      tasks: [
        { ...base, id: 'task-a', title: 'A', position: 0 },
        { ...base, id: 'task-b', title: 'B', position: 1 },
      ],
      members: [],
    });
    // Local optimistic order differs from a later server reorder.
    useTodos.setState((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === 'task-a'
          ? { ...task, position: 1 }
          : task.id === 'task-b'
            ? { ...task, position: 0 }
            : task,
      ),
    }));
    useTodos.getState().replaceSharedSnapshot({
      list: { ...shared, updatedAt: '2026-07-28T12:00:00.000Z' },
      tasks: [
        { ...base, id: 'task-a', title: 'A', position: 0 },
        { ...base, id: 'task-b', title: 'B', position: 1 },
      ],
      members: [],
    });
    const ordered = useTodos
      .getState()
      .tasks.filter((task) => task.listId === shared.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    expect(ordered.map((task) => task.id)).toEqual(['task-a', 'task-b']);
  });

  it('excludes shared caches and mutations from the private account payload', () => {
    const state = useTodos.getState();
    const privateList = state.lists[0];
    const sharedList = {
      ...privateList,
      id: '6af777b8-a5d6-4bb3-a117-484918e333b9',
      name: 'Shared',
      mode: 'shared' as const,
    };
    const sharedTask = {
      ...state.addTask(privateList.id, 'Private')!,
      id: 'abed5890-e04b-47ea-89cc-08d3f3d9837f',
      listId: sharedList.id,
      title: 'Shared task',
    };
    useTodos.getState().replaceSharedSnapshot({
      list: sharedList,
      tasks: [sharedTask],
      members: [],
    });

    const payload = privateTodoPayload(useTodos.getState());
    expect(payload.lists.map((list) => list.name)).not.toContain('Shared');
    expect(payload.tasks.map((task) => task.title)).not.toContain('Shared task');
  });

  it('allows members to complete only assigned or anyone items', () => {
    const state = normalizeTodoState(undefined);
    const list = { ...state.lists[0], mode: 'shared' as const, role: 'member' as const };
    const baseTask = {
      id: 'task',
      listId: list.id,
      title: 'Task',
      completed: false,
      important: false,
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      version: 0,
    };

    expect(canCompleteTodo(list, baseTask, 'member-a')).toBe(true);
    expect(
      canCompleteTodo(list, { ...baseTask, assigneeUserId: 'member-a' }, 'member-a'),
    ).toBe(true);
    expect(
      canCompleteTodo(list, { ...baseTask, assigneeUserId: 'member-b' }, 'member-a'),
    ).toBe(false);
  });

  it('lets editors complete any item and edit content', () => {
    const state = normalizeTodoState(undefined);
    const editorList = {
      ...state.lists[0],
      mode: 'shared' as const,
      role: 'editor' as const,
    };
    const memberList = { ...editorList, role: 'member' as const };
    const baseTask = {
      id: 'task',
      listId: editorList.id,
      title: 'Task',
      completed: false,
      important: false,
      assigneeUserId: 'someone-else',
      createdAt: '2026-07-01T10:00:00.000Z',
      updatedAt: '2026-07-01T10:00:00.000Z',
      version: 0,
    };

    expect(canEditTodoContent(editorList)).toBe(true);
    expect(canEditTodoContent(memberList)).toBe(false);
    expect(canCompleteTodo(editorList, baseTask, 'editor-a')).toBe(true);
    expect(canCompleteTodo(memberList, baseTask, 'member-a')).toBe(false);
  });

  it('migrates recognized grocery names but preserves explicit checklist kinds', () => {
    const migrated = normalizeTodoState({
      groceryMigrationVersion: 1,
      lists: [
        {
          id: 'list-grocery',
          name: 'Weekly Groceries',
          mode: 'private',
          role: 'owner',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
        {
          id: 'list-explicit',
          name: 'Supermarket planning',
          kind: 'checklist',
          mode: 'private',
          role: 'owner',
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    expect(migrated.lists.find((list) => list.id === 'list-grocery')?.kind)
      .toBe('grocery');
    expect(migrated.lists.find((list) => list.id === 'list-explicit')?.kind)
      .toBe('checklist');
  });

  it('repairs grocery lists from the pre-feature in-memory schema once', () => {
    const legacy = {
      lists: [{
        id: 'legacy-groceries',
        name: 'Groceries',
        kind: 'checklist',
        mode: 'private',
        role: 'owner',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }],
    };
    expect(normalizeTodoState(legacy).lists[0].kind).toBe('grocery');
    expect(
      normalizeTodoState({
        ...legacy,
        groceryMigrationVersion: 1,
      }).lists[0].kind,
    ).toBe('checklist');
  });

  it('adds a recipe and prevents converting back while its group exists', () => {
    const list = useTodos.getState().createList('Meal shop', 'grocery')!;
    const recipe = useTodos.getState().addRecipe(list.id, {
      name: 'Pasta',
      sourceKind: 'url',
      sourceUrl: 'https://example.com/pasta',
      originalServings: 2,
      targetServings: 4,
      ingredients: [
        {
          name: 'Tomato',
          canonicalKey: 'tomato',
          quantityValue: 4,
          quantityText: '4',
          unit: 'count',
        },
        { name: 'Salt', quantityText: 'to taste' },
      ],
    });

    expect(recipe).toBeDefined();
    expect(
      useTodos.getState().tasks.filter((task) => task.recipeId === recipe?.id),
    ).toHaveLength(2);
    expect(useTodos.getState().setListKind(list.id, 'checklist')).toBe(false);

    useTodos.getState().deleteRecipe(recipe!.id);
    expect(useTodos.getState().setListKind(list.id, 'checklist')).toBe(true);
  });

  it('batch completion updates every permitted occurrence only', () => {
    const list = useTodos.getState().createList('Shop', 'grocery')!;
    const recipe = useTodos.getState().addRecipe(list.id, {
      name: 'Dinner',
      sourceKind: 'url',
      ingredients: [{ name: 'Onion' }, { name: 'Garlic' }],
    })!;
    const tasks = useTodos
      .getState()
      .tasks.filter((task) => task.recipeId === recipe.id);
    useTodos.setState((state) => ({
      lists: state.lists.map((item) =>
        item.id === list.id
          ? { ...item, mode: 'shared', role: 'member' }
          : item,
      ),
      tasks: state.tasks.map((task) =>
        task.id === tasks[1].id
          ? { ...task, assigneeUserId: 'someone-else' }
          : task,
      ),
    }));

    useTodos
      .getState()
      .setTasksCompletion(tasks.map((task) => task.id), true, 'member-a');

    expect(
      useTodos.getState().tasks.find((task) => task.id === tasks[0].id)?.completed,
    ).toBe(true);
    expect(
      useTodos.getState().tasks.find((task) => task.id === tasks[1].id)?.completed,
    ).toBe(false);
  });
});
