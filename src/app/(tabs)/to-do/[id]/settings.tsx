import { useLocalSearchParams } from 'expo-router';

import { TodoListSettingsScreen } from '@/features/todos/todo-list-settings-screen';

export default function TodoListSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoListSettingsScreen listId={id} />;
}
