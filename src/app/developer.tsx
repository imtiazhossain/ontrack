import { Redirect } from 'expo-router';

/** Legacy `/developer` → profile stack (keeps bottom nav). */
export default function DeveloperLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/developer" />;
}
