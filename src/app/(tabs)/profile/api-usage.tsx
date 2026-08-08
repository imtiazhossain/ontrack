import { Redirect } from 'expo-router';

import { DevAccessGate } from '@/features/account/dev-access-gate';

/** @deprecated Prefer `/(tabs)/profile/integrations` — kept for agent-ui aliases. */
export default function ApiUsageRedirect() {
  return (
    <DevAccessGate>
      <Redirect href="/(tabs)/profile/integrations" />
    </DevAccessGate>
  );
}
