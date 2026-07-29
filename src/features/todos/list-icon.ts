import type { AppIconName } from '@/design-system';

export function todoListIcon(name: string): AppIconName {
  const normalized = name.trim().toLocaleLowerCase();
  if (/\b(grocer(?:y|ies)|supermarket)\b/.test(normalized)) return 'groceries';
  if (/\b(maintenance|repair|repairs)\b/.test(normalized)) return 'maintenance';
  return 'tasks';
}

export function collaboratorInitial(name: string): string {
  return name.trim().slice(0, 1).toLocaleUpperCase();
}
