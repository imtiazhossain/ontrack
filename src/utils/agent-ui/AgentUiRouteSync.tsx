import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';

import { handleAgentUiRequest, type AgentUiRequest } from './handle-agent-ui-url';
import { AGENT_UI_COMMAND_FILENAME } from './persist';
import { isAgentUiEnabled } from './registry';
import { setAgentUiNavigator, setAgentUiRoute } from './route';

/**
 * Keeps agent-ui dump `route` in sync and registers an in-app navigator for
 * `op=goto` / `op=reset` without screenshot coordinates.
 * Polls Documents/`agent-ui-command.json` so host scripts avoid openurl round-trips.
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

  useEffect(() => {
    if (!isAgentUiEnabled()) return;
    let processing = false;
    const command = new File(Paths.document, AGENT_UI_COMMAND_FILENAME);
    const timer = setInterval(() => {
      if (processing || !command.exists) return;
      processing = true;
      try {
        const request = JSON.parse(command.textSync()) as AgentUiRequest;
        command.delete();
        void handleAgentUiRequest(request).finally(() => {
          processing = false;
        });
      } catch {
        try {
          command.delete();
        } catch {
          /* Ignore a concurrent host rewrite. */
        }
        processing = false;
      }
    }, 40);
    return () => clearInterval(timer);
  }, []);

  return null;
}
