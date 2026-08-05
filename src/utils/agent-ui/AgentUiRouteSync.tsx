import { File, Paths } from 'expo-file-system';
import { usePathname, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { handleAgentUiRequest, type AgentUiRequest } from './handle-agent-ui-url';
import {
  fetchAgentUiCommand,
  probeAgentUiHttp,
  setAgentUiActiveNonce,
} from './http-bridge';
import { AGENT_UI_COMMAND_FILENAME } from './persist';
import { isAgentUiEnabled } from './registry';
import { setAgentUiNavigator, setAgentUiRoute } from './route';

function asNonce(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

async function runCommand(request: AgentUiRequest): Promise<void> {
  const nonce = asNonce((request as { nonce?: unknown }).nonce);
  setAgentUiActiveNonce(nonce);
  try {
    await handleAgentUiRequest(request);
  } finally {
    setAgentUiActiveNonce(undefined);
  }
}

/**
 * Keeps agent-ui dump `route` in sync and registers an in-app navigator for
 * `op=goto` / `op=reset` without screenshot coordinates.
 *
 * Prefers HTTP long-poll against the agent-ui daemon (via Metro `/__agent_ui`
 * proxy when available). Falls back to Documents/`agent-ui-command.json` poll.
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

    let cancelled = false;
    let processing = false;
    let httpEnabled = false;
    const command = new File(Paths.document, AGENT_UI_COMMAND_FILENAME);

    const takeFileCommand = (): AgentUiRequest | null => {
      if (processing || !command.exists) return null;
      try {
        const request = JSON.parse(command.textSync()) as AgentUiRequest;
        command.delete();
        return request;
      } catch {
        try {
          command.delete();
        } catch {
          /* Ignore a concurrent host rewrite. */
        }
        return null;
      }
    };

    const process = async (request: AgentUiRequest) => {
      if (processing) return;
      processing = true;
      try {
        await runCommand(request);
      } finally {
        processing = false;
      }
    };

    // File fallback for hosts that skip the daemon (slower when HTTP is up).
    const fileTimer = setInterval(() => {
      if (cancelled || processing) return;
      const request = takeFileCommand();
      if (request) void process(request);
    }, 50);

    const httpLoop = async () => {
      httpEnabled = await probeAgentUiHttp();
      while (!cancelled) {
        if (!httpEnabled) {
          await new Promise((r) => setTimeout(r, 250));
          httpEnabled = await probeAgentUiHttp();
          continue;
        }
        try {
          const request = await fetchAgentUiCommand(5000);
          if (cancelled) break;
          if (request) await process(request);
        } catch {
          httpEnabled = false;
        }
      }
    };

    void httpLoop();

    return () => {
      cancelled = true;
      clearInterval(fileTimer);
    };
  }, []);

  return null;
}
