import type { ScrollView, View } from 'react-native';

import { isAgentUiEnabled } from './registry';

type AgentUiScrollContainer = {
  scrollView: ScrollView;
  getOffsetY: () => number;
  measureInWindow: View['measureInWindow'];
};

let active: AgentUiScrollContainer | null = null;

/** Register the focused screen ScrollView for in-app scroll-into-view (no host mouse). */
export function registerAgentUiScrollContainer(
  container: AgentUiScrollContainer | null,
): void {
  if (!isAgentUiEnabled()) return;
  active = container;
}

export function getAgentUiScrollContainer(): AgentUiScrollContainer | null {
  return active;
}

export function resetAgentUiScrollContainer(): void {
  active = null;
}
