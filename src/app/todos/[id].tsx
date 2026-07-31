import { useLocalSearchParams } from 'expo-router';

import { GroceryListScreen } from '@/features/todos/grocery-list-screen';
import { TodoListScreen } from '@/features/todos/todo-list-screen';
import { useTodos } from '@/store/todos';

export default function TodoListRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const kind = useTodos(
    (state) => state.lists.find((list) => list.id === id)?.kind,
  );
  return kind === 'grocery' ? (
    <GroceryListScreen listId={id} />
  ) : (
    <TodoListScreen listId={id} />
  );
}
