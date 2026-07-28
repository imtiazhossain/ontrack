import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  canCompleteTodo,
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
});
