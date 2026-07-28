import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import type { TodoList, TodoMember, TodoTask } from '@/store/todos';

export const ONTRACK_LIST_SHARE_URL =
  process.env.EXPO_PUBLIC_TODO_SHARE_BASE_URL ?? 'https://ontrack--links.expo.app';

function assigneeName(task: TodoTask, members: TodoMember[]): string | undefined {
  if (!task.assigneeUserId) return 'Anyone';
  return members.find((member) => member.userId === task.assigneeUserId)?.displayName;
}

export function formatTodoListText(
  list: Pick<TodoList, 'name'>,
  tasks: TodoTask[],
  members: TodoMember[] = [],
): string {
  const openTasks = tasks.filter((task) => !task.completed);
  const collaborative = members.length > 1;
  const lines = openTasks.map((task) => {
    const focus = task.important ? '★ ' : '';
    const assignment = collaborative ? assigneeName(task, members) : undefined;
    return `${focus}☐ ${task.title}${assignment ? ` — ${assignment}` : ''}`;
  });
  const body = lines.length > 0 ? lines.join('\n') : '✓ All done!';
  const summary =
    openTasks.length === 0
      ? 'All done · onTrack'
      : `${openTasks.length} open ${openTasks.length === 1 ? 'item' : 'items'} · onTrack`;
  return [`📝 ${list.name}`, '', body, '', summary].join('\n');
}

export async function copyTodoListText(
  list: Pick<TodoList, 'name'>,
  tasks: TodoTask[],
  members: TodoMember[] = [],
): Promise<boolean> {
  return Clipboard.setStringAsync(formatTodoListText(list, tasks, members));
}

export async function shareTodoListText(
  list: Pick<TodoList, 'name'>,
  tasks: TodoTask[],
  members: TodoMember[] = [],
): Promise<boolean> {
  const result = await Share.share(
    {
      title: `${list.name} · onTrack`,
      message: formatTodoListText(list, tasks, members),
    },
    { subject: list.name },
  );
  return result.action !== Share.dismissedAction;
}

export function createTodoJoinUrl(code: string): string {
  return `${ONTRACK_LIST_SHARE_URL.replace(/\/$/, '')}/l/${code}`;
}

export function createInstalledTodoJoinUrl(code: string): string {
  return `ontrack:///l/${code}`;
}

export async function shareTodoInvite(listName: string, code: string): Promise<boolean> {
  const url = createTodoJoinUrl(code);
  const message = [`Join my “${listName}” list on onTrack 📝`, url].join('\n\n');
  const result = await Share.share(
    {
      title: `${listName} · onTrack`,
      message: process.env.EXPO_OS === 'ios' ? `Join my “${listName}” list on onTrack 📝` : message,
      ...(process.env.EXPO_OS === 'ios' ? { url } : {}),
    },
    { subject: `Join ${listName} on onTrack` },
  );
  return result.action !== Share.dismissedAction;
}
