import { Redirect } from 'expo-router';
import type { PropsWithChildren } from 'react';

import { useCanUseDeveloperTools } from '@/features/account/dev-access';

/** Renders children only when server flag `developer_tools` is set. */
export function DevAccessGate({ children }: PropsWithChildren) {
  const allowed = useCanUseDeveloperTools();
  if (!allowed) {
    return <Redirect href="/(tabs)/profile" />;
  }
  return children;
}
