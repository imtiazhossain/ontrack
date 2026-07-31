import type { AppIconName } from '@/design-system';
import type { TodoListKind } from '@/store/todos';

export function todoListIcon(
  name: string,
  kind?: TodoListKind,
): AppIconName {
  if (kind === 'grocery') return 'groceries';
  const normalized = name.trim().toLocaleLowerCase();
  if (/\b(grocer(?:y|ies)|supermarket)\b/.test(normalized)) return 'groceries';
  if (/\b(maintenance|repair|repairs)\b/.test(normalized)) return 'maintenance';
  return 'tasks';
}

export function collaboratorInitial(name: string): string {
  return name.trim().slice(0, 1).toLocaleUpperCase();
}
