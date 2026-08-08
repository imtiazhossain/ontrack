import { Redirect } from 'expo-router';

/** Legacy `/agents` → profile stack (keeps bottom nav). */
export default function AgentsLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/agents" />;
}
