// Keep the HMR beacon in the DEV dependency graph so watcher probes touch a
// module Metro already has loaded (see scripts/lib/metro-watcher.sh).
import '@/utils/dev/metro-hmr-beacon';

export { AgentTestId } from './AgentTestId';
export { AgentUiRouteSync } from './AgentUiRouteSync';
export {
    AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
    AGENT_UI_DEMO_CHASE_RETURN_ID,
    AGENT_UI_DEMO_FLIGHT_ID,
    AGENT_UI_DEMO_TRIP_ID,
    AGENT_UI_FIXTURE_NAMES,
    buildAgentUiDemoTrip,
    createIdFromAgentUiItemIds,
    normalizeFixtureName,
    seedAgentUiFixture,
    type AgentUiFixtureName,
    type AgentUiSeedResult
} from './fixtures';
export {
    AGENT_UI_FLOWS,
    AGENT_UI_WAIT_TIMEOUT_MS,
    listAgentUiFlowNames,
    resolveAgentUiFlow,
    type AgentUiFlowName,
    type AgentUiFlowStep
} from './flows';
export {
    handleAgentUiRequest,
    handleAgentUiUrl,
    isAgentUiUrl,
    parseAgentUiUrl
} from './handle-agent-ui-url';
export type { AgentUiOp, AgentUiRequest, ParsedAgentUiUrl } from './handle-agent-ui-url';
export {
    fetchAgentUiCommand,
    postAgentUiStatus,
    probeAgentUiHttp,
    resolveAgentUiHttpBase
} from './http-bridge';
export {
    AgentUiIds,
    tabTestIdForRoute
} from './ids';
export {
    AGENT_UI_COMMAND_FILENAME, AGENT_UI_DUMP_FILENAME, AGENT_UI_STATUS_FILENAME,
    writeAgentUiDump,
    writeAgentUiStatus
} from './persist';
export type { AgentUiStatusPayload, AgentUiStatusResult } from './persist';
export {
    getAgentUiTarget,
    isAgentUiEnabled,
    listAgentUiTargets,
    registerAgentUiTarget,
    resetAgentUiRegistry,
    tapAgentUiTarget,
    unregisterAgentUiTarget,
    type AgentUiEntry,
    type AgentUiFrame
} from './registry';
export {
    AGENT_UI_ROUTE_ALIASES,
    agentUiDeepLinkForDestination,
    agentUiNavigate,
    expandAgentUiShortcuts,
    getAgentUiRoute, getLastAgentUiContentRoute, resolveAgentUiDestination,
    setAgentUiNavigator,
    setAgentUiRoute,
    type AgentUiRouteAlias
} from './route';
export { useAgentUiTarget, type AgentUiTarget } from './use-agent-ui-target';

