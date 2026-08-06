import { File, Paths } from 'expo-file-system';
import { Dimensions, PixelRatio } from 'react-native';

import { getAgentUiActiveNonce, postAgentUiStatus } from './http-bridge';
import { listAgentUiTargets, type AgentUiEntry } from './registry';
import { getAgentUiRoute } from './route';

export const AGENT_UI_DUMP_FILENAME = 'agent-ui-dump.json';
export const AGENT_UI_STATUS_FILENAME = 'agent-ui-status.json';
export const AGENT_UI_COMMAND_FILENAME = 'agent-ui-command.json';

export type AgentUiScreenMetrics = {
  width: number;
  height: number;
  scale: number;
};

export type AgentUiDumpPayload = {
  generatedAt: string;
  count: number;
  /** Expo Router pathname when the dump was taken (dev bridge). */
  route: string | null;
  /** Logical window size + native scale for host screenshot sampling. */
  screen: AgentUiScreenMetrics;
  elements: AgentUiEntry[];
};

function agentUiScreenMetrics(): AgentUiScreenMetrics {
  const { width, height } = Dimensions.get('window');
  return { width, height, scale: PixelRatio.get() };
}

export type AgentUiStatusResult = {
  op: string;
  id?: string;
  ok: boolean;
  detail?: string;
  element?: AgentUiEntry;
  count?: number;
  route?: string | null;
  /** Host/daemon correlation id for the active command. */
  nonce?: number;
  screen?: AgentUiScreenMetrics;
};

export type AgentUiStatusPayload = {
  generatedAt: string;
  op: string;
  id?: string;
  ok: boolean;
  detail?: string;
  element?: AgentUiEntry;
  /** Match count for prefix / ready checks (no dump file). */
  count?: number;
  route?: string | null;
  /** Logical window size + native scale for host screenshot sampling. */
  screen?: AgentUiScreenMetrics;
  /** Full dump elements (op=dump) so Android hosts need no Documents pull. */
  elements?: AgentUiEntry[];
  /** Per-step outcomes for `op=batch`. */
  results?: AgentUiStatusResult[];
  /** Host/daemon correlation id for the active command. */
  nonce?: number;
};

function writeJson(filename: string, payload: unknown): void {
  const file = new File(Paths.document, filename);
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  // Compact JSON — hosts poll this path; pretty-print wasted I/O on every op.
  file.write(JSON.stringify(payload));
}

export function writeAgentUiDump(): AgentUiDumpPayload {
  const elements = listAgentUiTargets();
  const payload: AgentUiDumpPayload = {
    generatedAt: new Date().toISOString(),
    count: elements.length,
    route: getAgentUiRoute(),
    screen: agentUiScreenMetrics(),
    elements,
  };
  writeJson(AGENT_UI_DUMP_FILENAME, payload);
  return payload;
}

export function writeAgentUiStatus(
  payload: Omit<AgentUiStatusPayload, 'generatedAt'>,
): AgentUiStatusPayload {
  const nonce = payload.nonce ?? getAgentUiActiveNonce();
  const full: AgentUiStatusPayload = {
    generatedAt: new Date().toISOString(),
    route: getAgentUiRoute(),
    ...payload,
    screen: payload.screen ?? agentUiScreenMetrics(),
    ...(nonce !== undefined ? { nonce } : {}),
  };
  // HTTP first — daemon hosts wait on it. After goto/reset, Documents I/O can
  // stall on Android while the navigator remounts; posting before writeJson
  // keeps solo ops from timing out.
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    void postAgentUiStatus(full);
  }
  try {
    writeJson(AGENT_UI_STATUS_FILENAME, full);
  } catch {
    /* File mirror is best-effort; HTTP status already left. */
  }
  return full;
}
