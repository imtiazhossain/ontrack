import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useTodos } from '@/store/todos';

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
});
