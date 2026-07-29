import {
  collaboratorInitial,
  todoListIcon,
} from '@/features/todos/list-icon';

describe('to-do list icons', () => {
  it('uses category icons for grocery and maintenance lists', () => {
    expect(todoListIcon('Groceries')).toBe('groceries');
    expect(todoListIcon('Weekly grocery run')).toBe('groceries');
    expect(todoListIcon('Home Maintenance')).toBe('maintenance');
    expect(todoListIcon('Car repairs')).toBe('maintenance');
  });

  it('keeps the checklist icon independent from collaboration state', () => {
    expect(todoListIcon('Weekend')).toBe('tasks');
    expect(todoListIcon('App Stuff')).toBe('tasks');
  });

  it('creates initials for accepted collaborator avatars', () => {
    expect(collaboratorInitial('Alex')).toBe('A');
    expect(collaboratorInitial(' rocky')).toBe('R');
  });
});
