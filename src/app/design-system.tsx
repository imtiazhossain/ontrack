import { Redirect } from 'expo-router';

/** Legacy `/design-system` → profile stack (keeps bottom nav). */
export default function DesignSystemLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/design-system" />;
}
