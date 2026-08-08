import { Redirect } from 'expo-router';

/** Legacy `/integrations` → profile stack (keeps bottom nav). */
export default function IntegrationsLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/integrations" />;
}
