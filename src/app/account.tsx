import { Redirect } from 'expo-router';

/** Legacy `/account` → profile stack (keeps bottom nav). */
export default function AccountLegacyRedirect() {
  return <Redirect href="/(tabs)/profile/account" />;
}
