import { useLocalSearchParams } from 'expo-router';

import { TodoCollaboratorJoinScreen } from '@/features/todos/todo-collaborator-join-screen';

export default function TodoCollaboratorJoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <TodoCollaboratorJoinScreen code={code} />;
}
