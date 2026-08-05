import Constants from 'expo-constants';

import type { AgentUiRequest } from './handle-agent-ui-url';
import type { AgentUiStatusPayload } from './persist';

const DAEMON_PORT = 8191;
const DIRECT_DAEMON = `http://127.0.0.1:${DAEMON_PORT}`;
const DEFAULT_WAIT_MS = 5000;

let cachedBase: string | null = null;
let activeNonce: number | undefined;

export function setAgentUiActiveNonce(nonce: number | undefined): void {
  activeNonce = nonce;
}

export function getAgentUiActiveNonce(): number | undefined {
  return activeNonce;
}

function hostFromHostUri(hostUri: string): string | null {
  const hostPort = hostUri.split('/')[0]?.trim();
  if (!hostPort) return null;
  const host = hostPort.split(':')[0]?.trim();
  return host || null;
}

/**
 * Resolve the agent-ui daemon base URL (dev only).
 * Prefer the packager host on port 8191 (LAN devices) with localhost fallback
 * for the iOS Simulator. Metro `/__agent_ui` proxy is optional when present.
 */
export function resolveAgentUiHttpBase(): string {
  const override = process.env.EXPO_PUBLIC_AGENT_UI_URL?.trim();
  if (override) return override.replace(/\/+$/, '');

  if (cachedBase) return cachedBase;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost ??
    null;

  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostFromHostUri(hostUri);
    if (host) {
      // Simulator / advertise-127: stay on loopback. Devices use LAN IP:8191.
      cachedBase =
        host === '127.0.0.1' || host === 'localhost'
          ? DIRECT_DAEMON
          : `http://${host}:${DAEMON_PORT}`;
      return cachedBase;
    }
  }

  cachedBase = DIRECT_DAEMON;
  return cachedBase;
}

export function resetAgentUiHttpBaseCache(): void {
  cachedBase = null;
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function candidateBases(): string[] {
  const primary = resolveAgentUiHttpBase();
  const bases = [primary];
  if (primary !== DIRECT_DAEMON) bases.push(DIRECT_DAEMON);
  // Optional Metro proxy (when enhanceMiddleware is honored).
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri === 'string' && hostUri.includes(':')) {
    const hostPort = hostUri.split('/')[0];
    if (hostPort) bases.push(`http://${hostPort}/__agent_ui`);
  }
  return [...new Set(bases)];
}

/** Long-poll the next host command. Returns null on timeout / daemon down. */
export async function fetchAgentUiCommand(
  waitMs = DEFAULT_WAIT_MS,
): Promise<AgentUiRequest | null> {
  for (const base of candidateBases()) {
    const url = `${base}/next?waitMs=${Math.max(0, waitMs)}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (res.status === 204) {
        cachedBase = base;
        return null;
      }
      if (!res.ok) continue;
      const body = await parseJson(res);
      if (!body || typeof body !== 'object') continue;
      cachedBase = base;
      return body as AgentUiRequest;
    } catch {
      /* try next base */
    }
  }
  return null;
}

/** Push status to the daemon so the host can wait without Documents polling. */
export async function postAgentUiStatus(
  status: AgentUiStatusPayload,
): Promise<void> {
  const payload = {
    ...status,
    nonce: status.nonce ?? activeNonce,
  };
  const body = JSON.stringify(payload);
  for (const base of candidateBases()) {
    try {
      const res = await fetch(`${base}/status`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });
      if (res.ok) {
        cachedBase = base;
        return;
      }
    } catch {
      /* try next */
    }
  }
}

export async function probeAgentUiHttp(): Promise<boolean> {
  for (const base of candidateBases()) {
    try {
      const res = await fetch(`${base}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const body = (await parseJson(res)) as { ok?: boolean; service?: string } | null;
      if (body?.ok) {
        cachedBase = base;
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}
