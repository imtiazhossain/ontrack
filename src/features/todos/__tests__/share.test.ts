import {
  createInstalledTodoCollaboratorJoinUrl,
  createTodoCollaboratorJoinUrl,
  formatTodoListText,
} from '@/features/todos/share';
import type { TodoList, TodoMember, TodoTask } from '@/store/todos';

const list: TodoList = {
  id: 'list',
  name: 'Groceries',
  mode: 'shared',
  role: 'owner',
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
};

const members: TodoMember[] = [
  {
    listId: list.id,
    userId: 'owner',
    displayName: 'Rocky',
    role: 'owner',
    joinedAt: list.createdAt,
  },
  {
    listId: list.id,
    userId: 'alex',
    displayName: 'Alex',
    role: 'member',
    joinedAt: list.createdAt,
  },
];

function task(patch: Partial<TodoTask>): TodoTask {
  return {
    id: patch.id ?? 'task',
    listId: list.id,
    title: patch.title ?? 'Milk',
    completed: patch.completed ?? false,
    important: patch.important ?? false,
    assigneeUserId: patch.assigneeUserId,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    version: 0,
  };
}

describe('pretty to-do list text', () => {
  it('formats open items, focus, and collaborative assignments', () => {
    expect(
      formatTodoListText(
        list,
        [
          task({ id: 'milk', title: 'Milk' }),
          task({ id: 'battery', title: 'Batteries', important: true, assigneeUserId: 'alex' }),
          task({ id: 'done', title: 'Already bought', completed: true }),
        ],
        members,
      ),
    ).toBe(
      [
        '📝 Groceries',
        '',
        '☐ Milk — Anyone',
        '★ ☐ Batteries — Alex',
        '',
        '2 open items · onTrack',
      ].join('\n'),
    );
  });

  it('omits assignments for private lists and celebrates an empty list', () => {
    expect(formatTodoListText({ name: 'Maintenance' }, [], [])).toBe(
      ['📝 Maintenance', '', '✓ All done!', '', 'All done · onTrack'].join('\n'),
    );
  });

  it('creates web fallback and installed-app collaborator links', () => {
    expect(createTodoCollaboratorJoinUrl('abc123')).toBe(
      'https://ontrack--links.expo.app/c/abc123',
    );
    expect(createInstalledTodoCollaboratorJoinUrl('abc123')).toBe(
      'ontrack:///c/abc123',
    );
  });
});
