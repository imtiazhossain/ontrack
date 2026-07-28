import { todoListIcon } from '@/features/todos/list-icon';

describe('to-do list icons', () => {
  it('uses category icons for grocery and maintenance lists', () => {
    expect(todoListIcon('Groceries', 'private')).toBe('groceries');
    expect(todoListIcon('Weekly grocery run', 'shared')).toBe('groceries');
    expect(todoListIcon('Home Maintenance', 'private')).toBe('maintenance');
    expect(todoListIcon('Car repairs', 'shared')).toBe('maintenance');
  });

  it('falls back to checklist and collaborators icons', () => {
    expect(todoListIcon('Weekend', 'private')).toBe('tasks');
    expect(todoListIcon('Weekend', 'shared')).toBe('people');
  });
});
