import { Redirect } from 'expo-router';

/** Legacy `/api-usage` → profile integrations (keeps bottom nav). */
export default function ApiUsageLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/integrations" />;
}
