import { useLocalSearchParams } from 'expo-router';

import { TodoJoinScreen } from '@/features/todos/todo-join-screen';

export default function TodoJoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <TodoJoinScreen code={code} />;
}
