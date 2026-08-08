import { Redirect, useLocalSearchParams } from 'expo-router';

/** Legacy `/todos/:id/settings` → tab stack (keeps bottom nav). */
export default function TodoSettingsLegacyRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(tabs)/to-do/${id}/settings` as never} />;
}
