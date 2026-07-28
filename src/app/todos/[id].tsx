import { useLocalSearchParams } from 'expo-router';

import { TodoListScreen } from '@/features/todos/todo-list-screen';

export default function TodoListRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TodoListScreen listId={id} />;
}
