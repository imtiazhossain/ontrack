import type { AppIconName } from '@/design-system';
import type { TodoListMode } from '@/store/todos';

export function todoListIcon(name: string, mode: TodoListMode): AppIconName {
  const normalized = name.trim().toLocaleLowerCase();
  if (/\b(grocer(?:y|ies)|supermarket)\b/.test(normalized)) return 'groceries';
  if (/\b(maintenance|repair|repairs)\b/.test(normalized)) return 'maintenance';
  return mode === 'shared' ? 'people' : 'tasks';
}
