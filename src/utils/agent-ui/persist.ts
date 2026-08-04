import { File, Paths } from 'expo-file-system';

import { listAgentUiTargets, type AgentUiEntry } from './registry';
import { getAgentUiRoute } from './route';

export const AGENT_UI_DUMP_FILENAME = 'agent-ui-dump.json';
export const AGENT_UI_STATUS_FILENAME = 'agent-ui-status.json';
export const AGENT_UI_COMMAND_FILENAME = 'agent-ui-command.json';

export type AgentUiDumpPayload = {
  generatedAt: string;
  count: number;
  /** Expo Router pathname when the dump was taken (dev bridge). */
  route: string | null;
  elements: AgentUiEntry[];
};

export type AgentUiStatusPayload = {
  generatedAt: string;
  op: string;
  id?: string;
  ok: boolean;
  detail?: string;
  element?: AgentUiEntry;
  route?: string | null;
};

function writeJson(filename: string, payload: unknown): void {
  const file = new File(Paths.document, filename);
  if (!file.exists) {
    file.create({ intermediates: true });
  }
  file.write(JSON.stringify(payload, null, 2));
}

export function writeAgentUiDump(): AgentUiDumpPayload {
  const elements = listAgentUiTargets();
  const payload: AgentUiDumpPayload = {
    generatedAt: new Date().toISOString(),
    count: elements.length,
    route: getAgentUiRoute(),
    elements,
  };
  writeJson(AGENT_UI_DUMP_FILENAME, payload);
  return payload;
}

export function writeAgentUiStatus(payload: Omit<AgentUiStatusPayload, 'generatedAt'>): AgentUiStatusPayload {
  const full: AgentUiStatusPayload = {
    generatedAt: new Date().toISOString(),
    route: getAgentUiRoute(),
    ...payload,
  };
  writeJson(AGENT_UI_STATUS_FILENAME, full);
  return full;
}
