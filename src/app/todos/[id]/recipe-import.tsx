import { useLocalSearchParams } from 'expo-router';

import { RecipeImportScreen } from '@/features/todos/recipe-import-screen';

export default function RecipeImportRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecipeImportScreen listId={id} />;
}

