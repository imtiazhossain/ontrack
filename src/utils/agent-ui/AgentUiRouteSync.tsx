import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';

import { isAgentUiEnabled } from './registry';
import { setAgentUiNavigator, setAgentUiRoute } from './route';

/**
 * Keeps agent-ui dump `route` in sync and registers an in-app navigator for
 * `op=goto` / `op=reset` without screenshot coordinates.
 */
export function AgentUiRouteSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAgentUiEnabled()) return;
    setAgentUiRoute(pathname || '/');
    setAgentUiNavigator((href) => {
      router.replace(href as never);
    });
    return () => {
      setAgentUiNavigator(null);
    };
  }, [pathname, router]);

  return null;
}
