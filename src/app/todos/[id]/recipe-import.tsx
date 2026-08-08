import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy `/todos/:id/recipe-import` → tab stack (keeps bottom nav). */
export default function TodoRecipeImportLegacyRedirect() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  return (
    <Redirect
      href={
        {
          pathname: '/(tabs)/to-do/[id]/recipe-import',
          params: {
            id,
            ...(typeof source === 'string' ? { source } : null),
          },
        } as never
      }
    />
  );
}
